import { PDFDocument, PDFPage, PDFOperator, PDFRef, PDFStream, PDFArray } from 'pdf-lib';
import { ContentStreamParser } from './content-stream-parser';
import { TextElement } from './types';

interface Point {
  x: number;
  y: number;
}

interface Line {
  start: Point;
  end: Point;
  width: number;
}

interface GraphicsState {
  currentFont: string;
  fontSize: number;
  lineWidth: number;
  transform: number[];
}

export class PDFParser {
  private currentState: GraphicsState;
  private fontMap: Map<string, any>;
  private contentStreamParser: ContentStreamParser | null;

  constructor() {
    this.currentState = {
      currentFont: '',
      fontSize: 0,
      lineWidth: 1,
      transform: [1, 0, 0, 1, 0, 0], // Identity matrix
    };
    this.fontMap = new Map();
    this.contentStreamParser = null;
  }

  private async getStreamContents(page: PDFPage): Promise<Uint8Array | null> {
    const contents = page.node.Contents();
    if (!contents) return null;

    try {
      if (contents instanceof PDFArray) {
        const streams = contents.asArray();
        const streamContents = await Promise.all(
          streams.map(async (stream) => {
            if (stream instanceof PDFRef) {
              const resolved = page.doc.context.lookup(stream);
              return resolved instanceof PDFStream ? resolved.getContents() : new Uint8Array();
            }
            return stream instanceof PDFStream ? stream.getContents() : new Uint8Array();
          })
        );
        
        const totalLength = streamContents.reduce((sum, arr) => sum + arr.length, 0);
        const combinedContents = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const contents of streamContents) {
          combinedContents.set(contents, offset);
          offset += contents.length;
        }
        
        return combinedContents;
      } else if (contents instanceof PDFRef) {
        const stream = page.doc.context.lookup(contents);
        if (stream instanceof PDFStream) {
          return stream.getContents();
        }
      } else if (contents instanceof PDFStream) {
        return contents.getContents();
      }
    } catch (error) {
      console.error('Error processing stream contents:', error);
    }

    return null;
  }

  async extractTextElements(page: PDFPage): Promise<TextElement[]> {
    const textElements: TextElement[] = [];
    const contents = await this.getStreamContents(page);
    if (!contents) return textElements;

    this.contentStreamParser = new ContentStreamParser(contents);
    const operators = await this.contentStreamParser.parse();
    
    let currentMatrix = [1, 0, 0, 1, 0, 0]; // Identity matrix

    for (const op of operators) {
      const operatorName = op.getName().toString();
      switch (operatorName) {
        case 'Tf': // Set font and size
          this.currentState.currentFont = op.args[0].toString();
          this.currentState.fontSize = parseFloat(op.args[1].toString());
          break;

        case 'Tm': // Set text matrix
          const matrix = op.args.map(arg => parseFloat(arg.toString()));
          this.currentState.transform = matrix;
          currentMatrix = matrix;
          break;

        case 'Td': // Move text position
          currentMatrix[4] += parseFloat(op.args[0].toString());
          currentMatrix[5] += parseFloat(op.args[1].toString());
          break;

        case 'TJ': // Show text with individual character positioning
        case 'Tj': // Show text
          const text = this.extractTextFromOperator(op);
          if (text) {
            const transformed = this.transformPoint(
              currentMatrix[4],
              currentMatrix[5]
            );
            
            textElements.push({
              text,
              x: transformed.x,
              y: transformed.y,
              width: this.calculateTextWidth(text),
              height: this.currentState.fontSize,
              fontSize: this.currentState.fontSize,
              fontName: this.currentState.currentFont,
            });

            currentMatrix[4] += this.calculateTextWidth(text);
          }
          break;
      }
    }

    return this.mergeAdjacentText(textElements);
  }

  async extractLines(page: PDFPage): Promise<Line[]> {
    const lines: Line[] = [];
    const contentStream = await this.getContentStream(page);
    if (!contentStream) return lines;

    this.contentStreamParser = new ContentStreamParser(contentStream);
    const operators = await this.contentStreamParser.parse();
    
    let currentPath: Point[] = [];

    for (const op of operators) {
      const operatorName = op.name.toString();
      switch (operatorName) {
        case 'w': // Set line width
          this.currentState.lineWidth = parseFloat(op.args[0].toString());
          break;

        case 'm': // Move to
          currentPath = [{
            x: parseFloat(op.args[0].toString()),
            y: parseFloat(op.args[1].toString()),
          }];
          break;

        case 'l': // Line to
          if (currentPath.length > 0) {
            const point = {
              x: parseFloat(op.args[0].toString()),
              y: parseFloat(op.args[1].toString()),
            };
            currentPath.push(point);
          }
          break;

        case 'S': // Stroke path
        case 's': // Close and stroke path
          if (currentPath.length >= 2) {
            for (let i = 1; i < currentPath.length; i++) {
              const start = this.transformPoint(
                currentPath[i - 1].x,
                currentPath[i - 1].y
              );
              const end = this.transformPoint(
                currentPath[i].x,
                currentPath[i].y
              );

              if (this.isTableLine(start, end)) {
                lines.push({
                  start,
                  end,
                  width: this.currentState.lineWidth,
                });
              }
            }
          }
          currentPath = [];
          break;
      }
    }

    return this.mergeConnectedLines(lines);
  }

  private extractTextFromOperator(operator: PDFOperator): string {
    const operatorName = operator.getName().toString();
    if (operatorName === 'TJ') {
      return operator.getArgs()[0]
        .map((arg: any) => arg.toString())
        .filter((str: string) => str.trim().length > 0)
        .join('');
    } else if (operatorName === 'Tj') {
      return operator.getArgs()[0].toString();
    }
    return '';
  }

  private transformPoint(x: number, y: number): Point {
    const matrix = this.currentState.transform;
    return {
      x: matrix[0] * x + matrix[2] * y + matrix[4],
      y: matrix[1] * x + matrix[3] * y + matrix[5],
    };
  }

  private calculateTextWidth(text: string): number {
    // Calculate text width based on font metrics
    // This is a simplified version - you'll need to implement proper font metric calculations
    return text.length * this.currentState.fontSize * 0.6;
  }

  private mergeAdjacentText(elements: TextElement[]): TextElement[] {
    const merged: TextElement[] = [];
    let current: TextElement | null = null;

    // Sort elements by position
    const sorted = [...elements].sort((a, b) => {
      const yDiff = Math.abs(a.y - b.y);
      if (yDiff < 2) { // Consider elements on same line if y difference is small
        return a.x - b.x;
      }
      return b.y - a.y;
    });

    for (const element of sorted) {
      if (!current) {
        current = { ...element };
        continue;
      }

      // Check if elements are adjacent and have same properties
      const gap = element.x - (current.x + current.width);
      if (
        Math.abs(element.y - current.y) < 2 &&
        gap < current.fontSize * 0.3 &&
        element.fontSize === current.fontSize &&
        element.fontName === current.fontName
      ) {
        // Merge elements
        current.text += element.text;
        current.width += element.width;
      } else {
        merged.push(current);
        current = { ...element };
      }
    }

    if (current) {
      merged.push(current);
    }

    return merged;
  }

  private mergeConnectedLines(lines: Line[]): Line[] {
    const merged: Line[] = [];
    const threshold = 2; // Pixels threshold for connecting lines

    // Sort lines by orientation and position
    const sorted = [...lines].sort((a, b) => {
      const aIsHorizontal = Math.abs(a.start.y - a.end.y) < threshold;
      const bIsHorizontal = Math.abs(b.start.y - b.end.y) < threshold;
      
      if (aIsHorizontal !== bIsHorizontal) {
        return aIsHorizontal ? -1 : 1;
      }
      
      return aIsHorizontal
        ? a.start.y - b.start.y || a.start.x - b.start.x
        : a.start.x - b.start.x || a.start.y - b.start.y;
    });

    let current: Line | null = null;

    for (const line of sorted) {
      if (!current) {
        current = { ...line };
        continue;
      }

      const currentIsHorizontal = Math.abs(current.start.y - current.end.y) < threshold;
      const lineIsHorizontal = Math.abs(line.start.y - line.end.y) < threshold;

      if (currentIsHorizontal === lineIsHorizontal) {
        if (currentIsHorizontal) {
          // Merge horizontal lines
          if (
            Math.abs(current.start.y - line.start.y) < threshold &&
            Math.abs(current.end.y - line.end.y) < threshold &&
            Math.abs(current.end.x - line.start.x) < threshold
          ) {
            current.end = line.end;
            continue;
          }
        } else {
          // Merge vertical lines
          if (
            Math.abs(current.start.x - line.start.x) < threshold &&
            Math.abs(current.end.x - line.end.x) < threshold &&
            Math.abs(current.end.y - line.start.y) < threshold
          ) {
            current.end = line.end;
            continue;
          }
        }
      }

      merged.push(current);
      current = { ...line };
    }

    if (current) {
      merged.push(current);
    }

    return merged;
  }

  private isTableLine(start: Point, end: Point): boolean {
    const threshold = 2; // Pixels threshold for considering line horizontal/vertical
    const minLength = 10; // Minimum line length to be considered a table line
    
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const length = Math.sqrt(dx * dx + dy * dy);

    // Check if line is horizontal or vertical and long enough
    return (
      length >= minLength &&
      (dy < threshold || dx < threshold) // Horizontal or vertical
    );
  }
} 
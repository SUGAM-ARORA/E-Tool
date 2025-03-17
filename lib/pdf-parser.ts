import { PDFDocument, PDFPage, PDFOperator, PDFContentStream } from 'pdf-lib';

interface Point {
  x: number;
  y: number;
}

interface Line {
  start: Point;
  end: Point;
  width: number;
}

interface TextElement {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
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

  constructor() {
    this.currentState = {
      currentFont: '',
      fontSize: 0,
      lineWidth: 1,
      transform: [1, 0, 0, 1, 0, 0], // Identity matrix
    };
    this.fontMap = new Map();
  }

  async extractTextElements(page: PDFPage): Promise<TextElement[]> {
    const textElements: TextElement[] = [];
    const contentStream = await page.getContentStream();
    const operators = await this.parseContentStream(contentStream);
    
    let currentText = '';
    let currentPosition = { x: 0, y: 0 };

    for (const op of operators) {
      switch (op.operator) {
        case 'Tf': // Set font and size
          this.currentState.currentFont = op.args[0].toString();
          this.currentState.fontSize = parseFloat(op.args[1]);
          break;

        case 'Tm': // Set text matrix
          const matrix = op.args.map(parseFloat);
          this.currentState.transform = matrix;
          currentPosition.x = matrix[4];
          currentPosition.y = matrix[5];
          break;

        case 'Td': // Move text position
          currentPosition.x += parseFloat(op.args[0]);
          currentPosition.y += parseFloat(op.args[1]);
          break;

        case 'TJ': // Show text with individual character positioning
        case 'Tj': // Show text
          const text = this.extractTextFromOperator(op);
          if (text) {
            const transformed = this.transformPoint(
              currentPosition.x,
              currentPosition.y
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

            currentPosition.x += this.calculateTextWidth(text);
          }
          break;
      }
    }

    return this.mergeAdjacentText(textElements);
  }

  async extractLines(page: PDFPage): Promise<Line[]> {
    const lines: Line[] = [];
    const contentStream = await page.getContentStream();
    const operators = await this.parseContentStream(contentStream);
    
    let currentPath: Point[] = [];

    for (const op of operators) {
      switch (op.operator) {
        case 'w': // Set line width
          this.currentState.lineWidth = parseFloat(op.args[0]);
          break;

        case 'm': // Move to
          currentPath = [{
            x: parseFloat(op.args[0]),
            y: parseFloat(op.args[1]),
          }];
          break;

        case 'l': // Line to
          if (currentPath.length > 0) {
            const point = {
              x: parseFloat(op.args[0]),
              y: parseFloat(op.args[1]),
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

              // Only add if it's likely a table line (horizontal or vertical)
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

  private async parseContentStream(contentStream: PDFContentStream): Promise<PDFOperator[]> {
    // Parse the content stream to get operators
    // This is a simplified version - you'll need to implement proper PDF content stream parsing
    return [];
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

  private extractTextFromOperator(operator: PDFOperator): string {
    // Extract text from TJ or Tj operator
    // This is a simplified version - you'll need to implement proper text extraction
    if (operator.operator === 'TJ') {
      return operator.args[0]
        .filter((arg: any) => typeof arg === 'string')
        .join('');
    } else if (operator.operator === 'Tj') {
      return operator.args[0].toString();
    }
    return '';
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
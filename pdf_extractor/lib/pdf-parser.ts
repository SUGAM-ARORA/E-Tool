import { PDFPage } from 'pdf-lib';
import { ContentStreamParser } from './content-stream-parser';

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
  page: {
    width: number;
    height: number;
  };
}

interface PDFState {
  currentFont: string;
  fontSize: number;
  lineWidth: number;
  transform: number[];
}

export class PDFParser {
  private currentState: PDFState;

  constructor() {
    this.currentState = {
      currentFont: '',
      fontSize: 12,
      lineWidth: 1,
      transform: [1, 0, 0, 1, 0, 0],
    };
  }

  async extractTextElements(page: PDFPage): Promise<TextElement[]> {
    const textElements: TextElement[] = [];
    const contentStream = await page.getContentStream();
    const parser = new ContentStreamParser(contentStream);
    const operators = await parser.parse();
    
    let currentText = '';
    let currentPosition = { x: 0, y: 0 };

    for (const op of operators) {
      switch (op.name) {
        case 'Tf': // Set font and size
          this.currentState.currentFont = op.parameters[0].toString();
          this.currentState.fontSize = parseFloat(op.parameters[1]);
          break;

        case 'Tm': // Set text matrix
          const matrix = op.parameters.map(parseFloat);
          this.currentState.transform = matrix;
          currentPosition.x = matrix[4];
          currentPosition.y = matrix[5];
          break;

        case 'Td': // Move text position
          currentPosition.x += parseFloat(op.parameters[0]);
          currentPosition.y += parseFloat(op.parameters[1]);
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
              page: {
                width: page.getWidth(),
                height: page.getHeight(),
              },
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
    const parser = new ContentStreamParser(contentStream);
    const operators = await parser.parse();
    
    let currentPath: Point[] = [];

    for (const op of operators) {
      switch (op.name) {
        case 'w': // Set line width
          this.currentState.lineWidth = parseFloat(op.parameters[0]);
          break;

        case 'm': // Move to
          currentPath = [{
            x: parseFloat(op.parameters[0]),
            y: parseFloat(op.parameters[1]),
          }];
          break;

        case 'l': // Line to
          if (currentPath.length > 0) {
            const point = {
              x: parseFloat(op.parameters[0]),
              y: parseFloat(op.parameters[1]),
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

  private extractTextFromOperator(operator: any): string {
    if (operator.name === 'TJ') {
      return operator.parameters[0]
        .filter((arg: any) => typeof arg === 'string')
        .join('');
    } else if (operator.name === 'Tj') {
      return operator.parameters[0].toString();
    }
    return '';
  }

  private transformPoint(x: number, y: number): Point {
    const [a, b, c, d, e, f] = this.currentState.transform;
    return {
      x: a * x + c * y + e,
      y: b * x + d * y + f,
    };
  }

  private calculateTextWidth(text: string): number {
    // This is a simplified calculation - you might want to implement a more accurate one
    return text.length * this.currentState.fontSize * 0.6;
  }

  private mergeAdjacentText(elements: TextElement[]): TextElement[] {
    const merged: TextElement[] = [];
    let current: TextElement | null = null;

    for (const element of elements) {
      if (!current) {
        current = { ...element };
      } else if (
        Math.abs(current.y - element.y) < this.currentState.fontSize * 0.5 &&
        Math.abs(current.x + current.width - element.x) < this.currentState.fontSize * 0.5
      ) {
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
    const tolerance = 1;

    for (const line of lines) {
      let foundMatch = false;

      for (const mergedLine of merged) {
        if (
          this.isLineConnected(line, mergedLine, tolerance)
        ) {
          mergedLine.end = line.end;
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        merged.push({ ...line });
      }
    }

    return merged;
  }

  private isLineConnected(line1: Line, line2: Line, tolerance: number): boolean {
    return (
      Math.abs(line1.end.x - line2.start.x) < tolerance &&
      Math.abs(line1.end.y - line2.start.y) < tolerance &&
      this.isSameDirection(line1, line2)
    );
  }

  private isSameDirection(line1: Line, line2: Line): boolean {
    const isHorizontal1 = Math.abs(line1.end.y - line1.start.y) < 1;
    const isHorizontal2 = Math.abs(line2.end.y - line2.start.y) < 1;
    return isHorizontal1 === isHorizontal2;
  }

  private isTableLine(start: Point, end: Point): boolean {
    const tolerance = 1;
    const isHorizontal = Math.abs(end.y - start.y) < tolerance;
    const isVertical = Math.abs(end.x - start.x) < tolerance;
    return isHorizontal || isVertical;
  }
} 
import { PDFDocument, PDFPage, PDFOperator, PDFContentStream } from 'pdf-lib';

class CustomPDFOperator {
  private _args: any[];

  constructor(public operator: string, args: any[]) {
    this._args = args;
  }

  get args(): any[] {
    return this._args;
  }
}

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
    const contentStream = await (page as any).getContentStream(); // Accessing the content stream through the getContentStream method
    const operators = await this.parseContentStream(contentStream);

    let currentPosition = { x: 0, y: 0 };

    for (const op of operators) {
      switch (op.operator) {
        case 'Tf': // Set font and size
          if (op.args.length >= 2) {
            this.currentState.currentFont = op.args[0]?.toString() || '';
            this.currentState.fontSize = parseFloat(op.args[1] as string);
          }
          break;

        case 'Tm': // Set text matrix
          if (op.args.length === 6) {
            const matrix = op.args.map((arg: any) => parseFloat(arg));
            this.currentState.transform = matrix;
            currentPosition.x = matrix[4];
            currentPosition.y = matrix[5];
          }
          break;

        case 'Td': // Move text position
          if (op.args.length >= 2) {
            currentPosition.x += parseFloat(op.args[0] as string);
            currentPosition.y += parseFloat(op.args[1] as string);
          }
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
    const contentStream = await (page as any).getContentStream();
    const operators = await this.parseContentStream(contentStream);

    let currentPath: Point[] = [];

    for (const op of operators) {
      switch (op.operator) {
        case 'w': // Set line width
          if (op.args.length > 0) {
            this.currentState.lineWidth = parseFloat(op.args[0] as string);
          }
          break;

        case 'm': // Move to
          if (op.args.length >= 2) {
            currentPath = [
              {
                x: parseFloat(op.args[0] as string),
                y: parseFloat(op.args[1] as string),
              },
            ];
          }
          break;

        case 'l': // Line to
          if (currentPath.length > 0 && op.args.length >= 2) {
            const point = {
              x: parseFloat(op.args[0] as string),
              y: parseFloat(op.args[1] as string),
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

  private async parseContentStream(contentStream: PDFContentStream): Promise<CustomPDFOperator[]> {
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
    return text.length * this.currentState.fontSize * 0.6;
  }

  private extractTextFromOperator(operator: CustomPDFOperator): string {
    if (operator.operator === 'TJ' && Array.isArray(operator.args[0])) {
      return operator.args[0]
        .filter((arg: any) => typeof arg === 'string')
        .join('');
    } else if (operator.operator === 'Tj' && typeof operator.args[0] === 'string') {
      return operator.args[0];
    }
    return '';
  }

  private mergeAdjacentText(elements: TextElement[]): TextElement[] {
    const merged: TextElement[] = [];
    let current: TextElement | null = null;

    const sorted = [...elements].sort((a, b) => {
      const yDiff = Math.abs(a.y - b.y);
      return yDiff < 2 ? a.x - b.x : b.y - a.y;
    });

    for (const element of sorted) {
      if (!current) {
        current = { ...element };
        continue;
      }

      const gap = element.x - (current.x + current.width);
      if (
        Math.abs(element.y - current.y) < 2 &&
        gap < current.fontSize * 0.3 &&
        element.fontSize === current.fontSize &&
        element.fontName === current.fontName
      ) {
        current.text += element.text;
        current.width += element.width;
      } else {
        merged.push(current);
        current = { ...element };
      }
    }

    if (current) merged.push(current);
    return merged;
  }

  private mergeConnectedLines(lines: Line[]): Line[] {
    return lines; // No significant changes needed here
  }

  private isTableLine(start: Point, end: Point): boolean {
    const threshold = 2;
    const minLength = 10;
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const length = Math.sqrt(dx * dx + dy * dy);

    return length >= minLength && (dy < threshold || dx < threshold);
  }
}

import { PDFContentStream, PDFOperator, PDFName, PDFNumber, PDFString, PDFArray, PDFHexString, PDFOperatorNames } from 'pdf-lib';

interface Token {
  type: 'number' | 'string' | 'name' | 'array' | 'operator';
  value: any;
}

// Define valid PDF operators
const validOperators = new Set([
  'q', 'Q', 'cm', 'w', 'J', 'j', 'M', 'd', 'ri', 'i',
  'm', 'l', 'c', 'v', 'y', 'h', 'B', 'B*', 'b', 'b*',
  'n', 'W', 'W*', 'f', 'f*', 'S', 's', 'Do', 'gs',
  'CS', 'cs', 'SC', 'SCN', 'sc', 'scn', 'G', 'g',
  'RG', 'rg', 'K', 'k', 'sh', 'BI', 'ID', 'EI', 'BT',
  'ET', 'Tc', 'Tw', 'Tz', 'TL', 'Tf', 'Tr', 'Ts',
  'Td', 'TD', 'Tm', 'T*', 'Tj', 'TJ', "'", '"',
  'd0', 'd1', 'MP', 'DP', 'BMC', 'BDC', 'EMC'
]);

export class ContentStreamParser {
  private data: Uint8Array;
  private pos: number;
  private tokens: Token[];

  constructor(contentStream: PDFContentStream) {
    if (!contentStream || !contentStream.getContents()) {
      throw new Error('Invalid content stream');
    }
    this.data = contentStream.getContents();
    this.pos = 0;
    this.tokens = [];
  }

  async parse(): Promise<PDFOperator[]> {
    const operators: PDFOperator[] = [];
    this.tokens = await this.tokenize();

    let args: any[] = [];
    for (const token of this.tokens) {
      if (token.type === 'operator') {
        const operatorName = token.value;
        try {
          // Use the static factory method instead of constructor
          const operator = PDFOperator.of(operatorName, args);
          operators.push(operator);
        } catch (error) {
          console.warn(`Failed to create operator ${operatorName}:`, error);
        }
        args = [];
      } else {
        args.push(token.value);
      }
    }

    return operators;
  }

  private async tokenize(): Promise<Token[]> {
    const tokens: Token[] = [];

    while (this.pos < this.data.length) {
      this.skipWhitespace();

      if (this.pos >= this.data.length) break;

      const byte = this.data[this.pos];
      
      if (this.isDigit(byte) || byte === 0x2B || byte === 0x2D || byte === 0x2E) { // +, -, .
        tokens.push(this.readNumber());
      } else if (byte === 0x2F) { // /
        tokens.push(this.readName());
      } else if (byte === 0x28) { // (
        tokens.push(this.readString());
      } else if (byte === 0x3C) { // <
        if (this.pos + 1 < this.data.length && this.data[this.pos + 1] === 0x3C) {
          // << Dictionary start, skip for now
          this.pos += 2;
        } else {
          tokens.push(this.readHexString());
        }
      } else if (byte === 0x5B) { // [
        tokens.push(this.readArray());
      } else if (this.isRegularCharacter(byte)) {
        tokens.push(this.readOperator());
      } else {
        this.pos++;
      }
    }

    return tokens;
  }

  private skipWhitespace(): void {
    while (this.pos < this.data.length) {
      const byte = this.data[this.pos];
      if (byte === 0x00 || byte === 0x09 || byte === 0x0A || byte === 0x0C || byte === 0x0D || byte === 0x20) {
        this.pos++;
      } else {
        break;
      }
    }
  }

  private isDigit(byte: number): boolean {
    return byte >= 0x30 && byte <= 0x39;
  }

  private isRegularCharacter(byte: number): boolean {
    return (byte >= 0x41 && byte <= 0x5A) || // A-Z
           (byte >= 0x61 && byte <= 0x7A);   // a-z
  }

  private readNumber(): Token {
    let numStr = '';
    let isFloat = false;

    while (this.pos < this.data.length) {
      const byte = this.data[this.pos];
      
      if (this.isDigit(byte) || byte === 0x2D || byte === 0x2B) { // -, +
        numStr += String.fromCharCode(byte);
        this.pos++;
      } else if (byte === 0x2E && !isFloat) { // .
        numStr += '.';
        isFloat = true;
        this.pos++;
      } else {
        break;
      }
    }

    return {
      type: 'number',
      value: PDFNumber.of(parseFloat(numStr)),
    };
  }

  private readName(): Token {
    this.pos++; // Skip /
    let name = '';

    while (this.pos < this.data.length) {
      const byte = this.data[this.pos];
      
      if (byte === 0x23) { // #
        // Handle hex characters
        if (this.pos + 2 < this.data.length) {
          const hex = String.fromCharCode(this.data[this.pos + 1], this.data[this.pos + 2]);
          name += String.fromCharCode(parseInt(hex, 16));
          this.pos += 3;
        } else {
          break;
        }
      } else if (this.isRegularCharacter(byte) || this.isDigit(byte) || byte === 0x2D || byte === 0x5F) { // Allow - and _
        name += String.fromCharCode(byte);
        this.pos++;
      } else {
        break;
      }
    }

    return {
      type: 'name',
      value: PDFName.of(name),
    };
  }

  private readString(): Token {
    this.pos++; // Skip (
    let str = '';
    let escaped = false;
    let parenthesesCount = 1;

    while (this.pos < this.data.length) {
      const byte = this.data[this.pos];
      
      if (escaped) {
        switch (byte) {
          case 0x6E: // n
            str += '\n';
            break;
          case 0x72: // r
            str += '\r';
            break;
          case 0x74: // t
            str += '\t';
            break;
          case 0x62: // b
            str += '\b';
            break;
          case 0x66: // f
            str += '\f';
            break;
          case 0x5C: // \
          case 0x28: // (
          case 0x29: // )
            str += String.fromCharCode(byte);
            break;
          default:
            if (this.isDigit(byte)) {
              // Octal code
              let octal = String.fromCharCode(byte);
              for (let i = 0; i < 2 && this.pos + 1 < this.data.length; i++) {
                const nextByte = this.data[this.pos + 1];
                if (this.isDigit(nextByte)) {
                  octal += String.fromCharCode(nextByte);
                  this.pos++;
                }
              }
              str += String.fromCharCode(parseInt(octal, 8));
            } else {
              str += String.fromCharCode(byte);
            }
        }
        escaped = false;
      } else if (byte === 0x5C) { // \
        escaped = true;
      } else if (byte === 0x28) { // (
        parenthesesCount++;
        str += '(';
      } else if (byte === 0x29) { // )
        parenthesesCount--;
        if (parenthesesCount === 0) {
          this.pos++;
          break;
        }
        str += ')';
      } else {
        str += String.fromCharCode(byte);
      }
      
      this.pos++;
    }

    return {
      type: 'string',
      value: PDFString.of(str),
    };
  }

  private readHexString(): Token {
    this.pos++; // Skip <
    let hex = '';

    while (this.pos < this.data.length) {
      const byte = this.data[this.pos];
      
      if (byte === 0x3E) { // >
        this.pos++;
        break;
      }
      
      if ((byte >= 0x30 && byte <= 0x39) || // 0-9
          (byte >= 0x41 && byte <= 0x46) || // A-F
          (byte >= 0x61 && byte <= 0x66)) { // a-f
        hex += String.fromCharCode(byte);
      }
      
      this.pos++;
    }

    // Ensure even number of hex digits
    if (hex.length % 2 !== 0) hex += '0';

    return {
      type: 'string',
      value: PDFHexString.of(hex),
    };
  }

  private readArray(): Token {
    this.pos++; // Skip [
    const array: any[] = [];

    while (this.pos < this.data.length) {
      this.skipWhitespace();
      
      if (this.pos >= this.data.length) break;
      
      const byte = this.data[this.pos];
      
      if (byte === 0x5D) { // ]
        this.pos++;
        break;
      }
      
      if (this.isDigit(byte) || byte === 0x2B || byte === 0x2D || byte === 0x2E) {
        array.push(this.readNumber().value);
      } else if (byte === 0x2F) {
        array.push(this.readName().value);
      } else if (byte === 0x28) {
        array.push(this.readString().value);
      } else if (byte === 0x3C) {
        array.push(this.readHexString().value);
      } else if (byte === 0x5B) {
        array.push(this.readArray().value);
      } else {
        this.pos++;
      }
    }

    return {
      type: 'array',
      value: array,
    };
  }

  private readOperator(): Token {
    let operator = '';

    while (this.pos < this.data.length) {
      const byte = this.data[this.pos];
      
      if (this.isRegularCharacter(byte)) {
        operator += String.fromCharCode(byte);
        this.pos++;
      } else {
        break;
      }
    }

    return {
      type: 'operator',
      value: operator,
    };
  }
} 
import { PDFContentStream, PDFName, PDFNumber, PDFString, PDFArray } from 'pdf-lib';

interface PDFOperator {
  op: string;
  args: any[];
}

interface Token {
  type: 'number' | 'string' | 'name' | 'array' | 'operator';
  value: any;
}

export class ContentStreamParser {
  private data: Uint8Array;
  private pos: number;
  private tokens: Token[];

  constructor(contentStream: PDFContentStream) {
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
        operators.push({
          op: token.value,
          args: [...args],
        });
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
      } else if (this.isRegularCharacter(byte) || this.isDigit(byte)) {
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
          default:
            str += String.fromCharCode(byte);
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
      } else if (byte === 0x5B) {
        array.push(this.readArray().value);
      } else {
        this.pos++;
      }
    }

    return {
      type: 'array',
      value: PDFArray,
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
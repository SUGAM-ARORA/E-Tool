import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { TableExtractor } from '../pdf_extractor/lib/table-extractor';

describe('TableExtractor', () => {
  let pdfDoc: PDFDocument;
  let extractor: TableExtractor;

  beforeAll(async () => {
    const pdfBytes = fs.readFileSync(path.join(__dirname, '../samples/pdfs/sample1.pdf'));
    pdfDoc = await PDFDocument.load(pdfBytes);
    extractor = new TableExtractor(pdfDoc);
  });

  test('should extract tables from sample PDF', async () => {
    const tables = await extractor.extractTables();

    // Should find two tables
    expect(tables).toHaveLength(2);

    // Verify first table structure
    const table1 = tables[0];
    expect(table1.pageNumber).toBe(1);
    expect(table1.cells).toHaveLength(4); // Header + 3 rows
    expect(table1.cells[0]).toHaveLength(3); // 3 columns

    // Check header row
    expect(table1.cells[0][0].text).toBe('Name');
    expect(table1.cells[0][1].text).toBe('Age');
    expect(table1.cells[0][2].text).toBe('City');

    // Check data rows
    expect(table1.cells[1][0].text).toBe('John Smith');
    expect(table1.cells[1][1].text).toBe('35');
    expect(table1.cells[1][2].text).toBe('New York');

    expect(table1.cells[2][0].text).toBe('Jane Doe');
    expect(table1.cells[2][1].text).toBe('28');
    expect(table1.cells[2][2].text).toBe('Los Angeles');

    expect(table1.cells[3][0].text).toBe('Bob Johnson');
    expect(table1.cells[3][1].text).toBe('42');
    expect(table1.cells[3][2].text).toBe('Chicago');

    // Verify second table structure
    const table2 = tables[1];
    expect(table2.pageNumber).toBe(1);
    expect(table2.cells).toHaveLength(4); // Header + 3 rows
    expect(table2.cells[0]).toHaveLength(5); // 5 columns

    // Check header row
    expect(table2.cells[0][0].text).toBe('Product');
    expect(table2.cells[0][1].text).toBe('Price');
    expect(table2.cells[0][2].text).toBe('Quantity');
    expect(table2.cells[0][3].text).toBe('Total');
    expect(table2.cells[0][4].text).toBe('Status');

    // Check data rows
    expect(table2.cells[1][0].text).toBe('Widget A');
    expect(table2.cells[1][1].text).toBe('$10.00');
    expect(table2.cells[1][2].text).toBe('5');
    expect(table2.cells[1][3].text).toBe('$50.00');
    expect(table2.cells[1][4].text).toBe('In Stock');

    expect(table2.cells[2][0].text).toBe('Widget B');
    expect(table2.cells[2][1].text).toBe('$15.00');
    expect(table2.cells[2][2].text).toBe('3');
    expect(table2.cells[2][3].text).toBe('$45.00');
    expect(table2.cells[2][4].text).toBe('Low Stock');

    expect(table2.cells[3][0].text).toBe('Widget C');
    expect(table2.cells[3][1].text).toBe('$20.00');
    expect(table2.cells[3][2].text).toBe('0');
    expect(table2.cells[3][3].text).toBe('$0.00');
    expect(table2.cells[3][4].text).toBe('Out of Stock');
  });

  test('should handle tables with merged cells', async () => {
    const extractor = new TableExtractor(pdfDoc, {
      cellMerging: true,
    });
    const tables = await extractor.extractTables();

    // Verify that cell merging is working
    for (const table of tables) {
      for (const row of table.cells) {
        for (const cell of row) {
          if (cell.colSpan && cell.colSpan > 1) {
            expect(cell.width).toBeGreaterThan(0);
          }
          if (cell.rowSpan && cell.rowSpan > 1) {
            expect(cell.height).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test('should calculate confidence scores correctly', async () => {
    const tables = await extractor.extractTables();

    // Both tables should have high confidence scores due to clear structure
    for (const table of tables) {
      expect(table.confidence).toBeGreaterThan(0.8);
    }
  });

  test('should handle different processing modes', async () => {
    const modes: ('fast' | 'balanced' | 'accurate')[] = ['fast', 'balanced', 'accurate'];
    
    for (const mode of modes) {
      const extractor = new TableExtractor(pdfDoc, {
        processingMode: mode,
      });
      const tables = await extractor.extractTables();

      // Should still find both tables regardless of mode
      expect(tables).toHaveLength(2);

      // Verify basic structure is preserved
      for (const table of tables) {
        expect(table.cells.length).toBeGreaterThan(0);
        expect(table.cells[0].length).toBeGreaterThan(0);
      }
    }
  });

  test('should respect confidence threshold', async () => {
    const highThresholdExtractor = new TableExtractor(pdfDoc, {
      confidenceThreshold: 0.95,
    });
    const lowThresholdExtractor = new TableExtractor(pdfDoc, {
      confidenceThreshold: 0.5,
    });

    const highThresholdTables = await highThresholdExtractor.extractTables();
    const lowThresholdTables = await lowThresholdExtractor.extractTables();

    // High threshold should be more selective
    expect(highThresholdTables.length).toBeLessThanOrEqual(lowThresholdTables.length);
  });

  test('should validate table structure', async () => {
    const tables = await extractor.extractTables();

    for (const table of tables) {
      // Check row consistency
      const rowLength = table.cells[0].length;
      for (const row of table.cells) {
        expect(row.length).toBe(rowLength);
      }

      // Check cell properties
      for (const row of table.cells) {
        for (const cell of row) {
          expect(cell).toHaveProperty('text');
          expect(cell).toHaveProperty('x');
          expect(cell).toHaveProperty('y');
          expect(cell).toHaveProperty('width');
          expect(cell).toHaveProperty('height');
          expect(cell.width).toBeGreaterThan(0);
          expect(cell.height).toBeGreaterThan(0);
        }
      }
    }
  });
}); 
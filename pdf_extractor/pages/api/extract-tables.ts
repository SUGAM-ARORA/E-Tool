import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

export const config = {
  api: {
    bodyParser: false,
  },
};

interface TableCell {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rowSpan?: number;
  colSpan?: number;
}

interface Table {
  cells: TableCell[][];
  confidence: number;
  pageNumber: number;
}

class TableExtractor {
  private pdfDoc: PDFDocument;
  private options: any;

  constructor(pdfDoc: PDFDocument, options: any) {
    this.pdfDoc = pdfDoc;
    this.options = options;
  }

  async extractTables(): Promise<Table[]> {
    const tables: Table[] = [];
    const pages = this.pdfDoc.getPages();

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      // Get text content and positions
      const textContent = await this.extractTextContent(page);

      // Detect table regions
      const tableRegions = await this.detectTableRegions(textContent, width, height);

      // Extract tables from regions
      for (const region of tableRegions) {
        const table = await this.extractTableFromRegion(region, textContent);
        if (table) {
          tables.push({
            ...table,
            pageNumber: pageIndex + 1,
          });
        }
      }
    }

    return tables;
  }

  private async extractTextContent(page: any) {
    // Extract text content with positions
    // This is a placeholder - implement actual text extraction logic
    return [];
  }

  private async detectTableRegions(textContent: any[], width: number, height: number) {
    // Detect potential table regions using spatial analysis
    // This is a placeholder - implement actual table detection logic
    return [];
  }

  private async extractTableFromRegion(region: any, textContent: any[]) {
    // Extract table structure from the detected region
    // This is a placeholder - implement actual table extraction logic
    return null;
  }

  private async analyzeTableStructure(cells: TableCell[][]) {
    // Analyze and clean up table structure
    // Handle merged cells, validate rows/columns
    // This is a placeholder - implement actual structure analysis
  }
}

async function saveToExcel(tables: Table[], outputPath: string) {
  const workbook = new ExcelJS.Workbook();

  tables.forEach((table, index) => {
    const worksheet = workbook.addWorksheet(`Table ${index + 1}`);

    // Set column widths based on content
    const columnWidths = table.cells[0].map((_, colIndex) => {
      const maxWidth = Math.max(
        ...table.cells.map(row => 
          row[colIndex]?.text.length || 0
        )
      );
      return Math.min(Math.max(maxWidth * 1.2, 10), 50);
    });

    worksheet.columns = columnWidths.map(width => ({ width }));

    // Add data and apply styles
    table.cells.forEach((row, rowIndex) => {
      const excelRow = worksheet.addRow(row.map(cell => cell.text));

      // Style header row
      if (rowIndex === 0) {
        excelRow.font = { bold: true };
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      }

      // Apply borders
      excelRow.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Handle merged cells
    table.cells.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell.rowSpan > 1 || cell.colSpan > 1) {
          worksheet.mergeCells(
            rowIndex + 1,
            colIndex + 1,
            rowIndex + (cell.rowSpan || 1),
            colIndex + (cell.colSpan || 1)
          );
        }
      });
    });
  });

  await workbook.xlsx.writeFile(outputPath);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'tmp'),
      keepExtensions: true,
    });

    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const pdfFile = files.pdf;
    const options = JSON.parse(fields.options || '{}');

    // Read PDF file
    const pdfBytes = await readFile(pdfFile.filepath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Extract tables
    const extractor = new TableExtractor(pdfDoc, options);
    const tables = await extractor.extractTables();

    // Generate unique output filename
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const outputPath = path.join(outputDir, `${Date.now()}.xlsx`);

    // Save to Excel
    await saveToExcel(tables, outputPath);

    // Clean up temporary file
    fs.unlinkSync(pdfFile.filepath);

    res.status(200).json({
      success: true,
      tablesCount: tables.length,
      outputPath: `/output/${path.basename(outputPath)}`,
      tableData: tables,
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({
      error: 'Failed to process PDF',
      message: error.message,
    });
  }
} 
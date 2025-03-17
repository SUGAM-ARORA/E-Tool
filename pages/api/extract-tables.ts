import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { promisify } from 'util';
import { TableExtractor } from '../../lib/table-extractor';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

export const config = {
  api: {
    bodyParser: false,
  },
};

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
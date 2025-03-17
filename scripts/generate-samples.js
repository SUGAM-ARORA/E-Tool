const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function generateSamples() {
  // Create output directories if they don't exist
  const samplesDir = path.join(__dirname, '..', 'samples');
  const excelDir = path.join(samplesDir, 'excel');
  
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir);
  }
  if (!fs.existsSync(excelDir)) {
    fs.mkdirSync(excelDir);
  }

  // Generate sample1.xlsx
  await generateSample1();
}

async function generateSample1() {
  const workbook = new ExcelJS.Workbook();

  // Table 1
  const sheet1 = workbook.addWorksheet('Table 1');
  
  // Set column widths
  sheet1.columns = [
    { width: 20 }, // Name
    { width: 10 }, // Age
    { width: 20 }, // City
  ];

  // Add header row
  const headerRow = sheet1.addRow(['Name', 'Age', 'City']);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  const data1 = [
    ['John Smith', '35', 'New York'],
    ['Jane Doe', '28', 'Los Angeles'],
    ['Bob Johnson', '42', 'Chicago'],
  ];

  data1.forEach(row => {
    sheet1.addRow(row);
  });

  // Add borders
  sheet1.eachRow(row => {
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Table 2
  const sheet2 = workbook.addWorksheet('Table 2');
  
  // Set column widths
  sheet2.columns = [
    { width: 15 }, // Product
    { width: 12 }, // Price
    { width: 12 }, // Quantity
    { width: 12 }, // Total
    { width: 15 }, // Status
  ];

  // Add header row
  const header2Row = sheet2.addRow(['Product', 'Price', 'Quantity', 'Total', 'Status']);
  header2Row.font = { bold: true };
  header2Row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  const data2 = [
    ['Widget A', '$10.00', '5', '$50.00', 'In Stock'],
    ['Widget B', '$15.00', '3', '$45.00', 'Low Stock'],
    ['Widget C', '$20.00', '0', '$0.00', 'Out of Stock'],
  ];

  data2.forEach(row => {
    sheet2.addRow(row);
  });

  // Add borders
  sheet2.eachRow(row => {
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // Add conditional formatting for status
  sheet2.addConditionalFormatting({
    ref: 'E2:E4',
    rules: [
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"In Stock"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF90EE90' } } },
      },
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"Low Stock"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFD700' } } },
      },
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"Out of Stock"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFF6B6B' } } },
      },
    ],
  });

  // Save the workbook
  const outputPath = path.join(__dirname, '..', 'samples', 'excel', 'sample1.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('Generated sample1.xlsx');
}

generateSamples().catch(console.error); 
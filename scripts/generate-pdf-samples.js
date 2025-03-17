const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

async function generateSamplePDF() {
  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  
  // Get the font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Draw Table 1
  const table1Y = height - 100;
  page.drawText('Table 1: Employee Information', {
    x: 50,
    y: table1Y + 30,
    font: boldFont,
    size: 14,
  });
  
  // Draw headers
  const headers1 = ['Name', 'Age', 'City'];
  const colWidths1 = [150, 80, 150];
  let currentX = 50;
  headers1.forEach((header, i) => {
    page.drawText(header, {
      x: currentX,
      y: table1Y,
      font: boldFont,
      size: 12,
    });
    currentX += colWidths1[i];
  });
  
  // Draw data rows
  const data1 = [
    ['John Smith', '30', 'New York'],
    ['Emma Johnson', '25', 'London'],
    ['Michael Brown', '35', 'Sydney'],
  ];
  
  let currentY = table1Y - 20;
  data1.forEach(row => {
    currentX = 50;
    row.forEach((cell, i) => {
      page.drawText(cell, {
        x: currentX,
        y: currentY,
        font: font,
        size: 12,
      });
      currentX += colWidths1[i];
    });
    currentY -= 20;
  });
  
  // Draw Table 2
  const table2Y = height - 300;
  page.drawText('Table 2: Product Inventory', {
    x: 50,
    y: table2Y + 30,
    font: boldFont,
    size: 14,
  });
  
  // Draw headers
  const headers2 = ['Product', 'Price', 'Quantity', 'Total', 'Status'];
  const colWidths2 = [120, 80, 80, 80, 100];
  currentX = 50;
  headers2.forEach((header, i) => {
    page.drawText(header, {
      x: currentX,
      y: table2Y,
      font: boldFont,
      size: 12,
    });
    currentX += colWidths2[i];
  });
  
  // Draw data rows
  const data2 = [
    ['Laptop', '$999.99', '5', '$4,999.95', 'In Stock'],
    ['Mouse', '$29.99', '2', '$59.98', 'Low Stock'],
    ['Keyboard', '$89.99', '0', '$0.00', 'Out of Stock'],
  ];
  
  currentY = table2Y - 20;
  data2.forEach(row => {
    currentX = 50;
    row.forEach((cell, i) => {
      page.drawText(cell, {
        x: currentX,
        y: currentY,
        font: font,
        size: 12,
      });
      currentX += colWidths2[i];
    });
    currentY -= 20;
  });
  
  // Draw borders for both tables
  // Table 1 borders
  const table1Height = (data1.length + 1) * 20;
  page.drawRectangle({
    x: 45,
    y: table1Y - table1Height + 15,
    width: colWidths1.reduce((a, b) => a + b, 0) + 10,
    height: table1Height + 5,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  
  // Table 2 borders
  const table2Height = (data2.length + 1) * 20;
  page.drawRectangle({
    x: 45,
    y: table2Y - table2Height + 15,
    width: colWidths2.reduce((a, b) => a + b, 0) + 10,
    height: table2Height + 5,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  
  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(path.join(__dirname, '../samples/pdfs/sample1.pdf'), pdfBytes);
  console.log('Generated sample1.pdf');
}

async function generateSamples() {
  // Create directories if they don't exist
  const dirs = ['../samples/pdfs', '../samples/excel'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(path.join(__dirname, dir), { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
  
  await generateSamplePDF();
}

generateSamples().catch(console.error); 
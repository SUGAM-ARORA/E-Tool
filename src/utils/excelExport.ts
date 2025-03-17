import * as XLSX from 'xlsx';

interface TableData {
  rows: Array<Array<{ text: string }>>;
  pageNumber: number;
}

export function exportTablesToExcel(tables: TableData[]): void {
  const workbook = XLSX.utils.book_new();

  tables.forEach((table, index) => {
    // Convert table data to format expected by xlsx
    const data = table.rows.map(row => row.map(cell => cell.text));
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Table ${index + 1} (Page ${table.pageNumber})`
    );
  });

  // Save workbook
  XLSX.writeFile(workbook, 'extracted_tables.xlsx');
}
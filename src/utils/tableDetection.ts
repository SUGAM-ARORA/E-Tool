import { TextContent, TextItem } from 'pdfjs-dist';

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
  rows: TableCell[][];
  pageNumber: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

interface Column {
  x: number;
  width: number;
  frequency: number;
}

export function detectTables(textContent: TextContent, pageNumber: number): Table[] {
  const items = textContent.items as TextItem[];
  const tables: Table[] = [];
  const minRowsForTable = 3;
  const minColumnsForTable = 2;

  // Step 1: Group text items by their vertical position with tolerance
  const tolerance = 2; // pixels
  const rows = new Map<number, TextItem[]>();
  
  items.forEach(item => {
    const y = Math.round(item.transform[5] / tolerance) * tolerance;
    if (!rows.has(y)) {
      rows.set(y, []);
    }
    rows.get(y)?.push(item);
  });

  // Sort rows by y position (top to bottom)
  const sortedRows = Array.from(rows.entries()).sort(([a], [b]) => b - a);

  // Step 2: Detect potential column positions
  const columnPositions = detectColumnPositions(items);

  // Step 3: Analyze row sequences for table structures
  let currentTable: Table | null = null;
  let consecutiveAlignedRows = 0;
  let lastRowY = 0;

  sortedRows.forEach(([y, rowItems], rowIndex) => {
    const rowAnalysis = analyzeRow(rowItems, columnPositions);
    const isTableRow = rowAnalysis.confidence > 0.7;
    const rowGap = Math.abs(y - lastRowY);
    const isConsecutive = rowGap < 20; // Maximum gap between table rows

    if (isTableRow && (!lastRowY || isConsecutive)) {
      consecutiveAlignedRows++;
      
      if (consecutiveAlignedRows >= minRowsForTable) {
        if (!currentTable) {
          currentTable = createNewTable(y, rowItems, pageNumber);
        }
        
        const processedRow = processTableRow(rowItems, columnPositions);
        if (processedRow.length >= minColumnsForTable) {
          currentTable.rows.push(processedRow);
          currentTable.confidence = Math.max(currentTable.confidence, rowAnalysis.confidence);
        }
      }
    } else {
      if (currentTable && currentTable.rows.length >= minRowsForTable) {
        finalizeTable(currentTable, y);
        tables.push(currentTable);
      }
      currentTable = null;
      consecutiveAlignedRows = 0;
    }

    lastRowY = y;
  });

  // Add final table if exists
  if (currentTable && currentTable.rows.length >= minRowsForTable) {
    finalizeTable(currentTable, lastRowY);
    tables.push(currentTable);
  }

  // Step 4: Post-process tables to detect merged cells and improve structure
  return tables.map(table => detectMergedCells(table));
}

function detectColumnPositions(items: TextItem[]): Column[] {
  const positions = new Map<number, Column>();
  const tolerance = 3; // pixels

  items.forEach(item => {
    const x = Math.round(item.transform[4] / tolerance) * tolerance;
    if (!positions.has(x)) {
      positions.set(x, {
        x,
        width: item.width,
        frequency: 1
      });
    } else {
      const col = positions.get(x)!;
      col.frequency++;
      col.width = Math.max(col.width, item.width);
    }
  });

  return Array.from(positions.values())
    .filter(col => col.frequency > 2) // Minimum occurrences to be considered a column
    .sort((a, b) => a.x - b.x);
}

function analyzeRow(items: TextItem[], columns: Column[]): { confidence: number } {
  if (items.length < 2) return { confidence: 0 };

  // Sort items by x position
  const sortedItems = [...items].sort((a, b) => a.transform[4] - b.transform[4]);
  
  // Calculate alignment score
  const alignmentScore = calculateAlignmentScore(sortedItems, columns);
  
  // Calculate spacing consistency
  const spacingScore = calculateSpacingScore(sortedItems);
  
  // Calculate content density
  const densityScore = items.length / columns.length;
  
  // Combined confidence score
  const confidence = (alignmentScore * 0.5 + spacingScore * 0.3 + Math.min(densityScore, 1) * 0.2);
  
  return { confidence };
}

function calculateAlignmentScore(items: TextItem[], columns: Column[]): number {
  let alignedItems = 0;
  
  items.forEach(item => {
    const itemX = item.transform[4];
    const isAligned = columns.some(col => 
      Math.abs(itemX - col.x) < 5 || // Left alignment
      Math.abs((itemX + item.width) - (col.x + col.width)) < 5 // Right alignment
    );
    if (isAligned) alignedItems++;
  });

  return alignedItems / items.length;
}

function calculateSpacingScore(items: TextItem[]): number {
  if (items.length < 2) return 0;

  const spaces = [];
  for (let i = 1; i < items.length; i++) {
    spaces.push(
      items[i].transform[4] - (items[i - 1].transform[4] + items[i - 1].width)
    );
  }

  const avgSpace = spaces.reduce((a, b) => a + b, 0) / spaces.length;
  const variance = spaces.reduce((a, b) => a + Math.pow(b - avgSpace, 2), 0) / spaces.length;
  
  return Math.max(0, 1 - (variance / (avgSpace * avgSpace)));
}

function createNewTable(y: number, items: TextItem[], pageNumber: number): Table {
  return {
    rows: [],
    pageNumber,
    boundingBox: {
      x: Math.min(...items.map(item => item.transform[4])),
      y,
      width: Math.max(...items.map(item => item.transform[4] + item.width)) -
        Math.min(...items.map(item => item.transform[4])),
      height: 0
    },
    confidence: 0
  };
}

function processTableRow(items: TextItem[], columns: Column[]): TableCell[] {
  const cells: TableCell[] = [];
  const sortedItems = [...items].sort((a, b) => a.transform[4] - b.transform[4]);

  sortedItems.forEach(item => {
    cells.push({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
      height: item.height
    });
  });

  return cells;
}

function finalizeTable(table: Table, lastY: number): void {
  table.boundingBox.height = table.boundingBox.y - lastY;
  
  // Normalize row heights and positions
  normalizeTableStructure(table);
}

function normalizeTableStructure(table: Table): void {
  // Sort rows by y position
  table.rows.sort((a, b) => b[0].y - a[0].y);

  // Normalize cell positions within each row
  table.rows.forEach(row => {
    row.sort((a, b) => a.x - b.x);
  });
}

function detectMergedCells(table: Table): Table {
  const rows = table.rows;
  
  // Detect vertical merges
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < rows[i].length; j++) {
      const currentCell = rows[i][j];
      let rowSpan = 1;
      
      // Look for empty cells below with same x position
      while (i + rowSpan < rows.length) {
        const cellBelow = rows[i + rowSpan].find(
          cell => Math.abs(cell.x - currentCell.x) < 2
        );
        
        if (!cellBelow || cellBelow.text.trim()) break;
        rowSpan++;
      }
      
      if (rowSpan > 1) {
        currentCell.rowSpan = rowSpan;
      }
    }
  }

  // Detect horizontal merges
  rows.forEach(row => {
    for (let j = 0; j < row.length - 1; j++) {
      const currentCell = row[j];
      let colSpan = 1;
      
      while (j + colSpan < row.length) {
        const nextCell = row[j + colSpan];
        if (nextCell.text.trim()) break;
        colSpan++;
      }
      
      if (colSpan > 1) {
        currentCell.colSpan = colSpan;
      }
    }
  });

  return table;
}
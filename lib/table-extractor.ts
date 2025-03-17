import { PDFDocument, PDFPage } from 'pdf-lib';
import { PDFParser } from './pdf-parser';
import { ContentStreamParser } from './content-stream-parser';

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

interface TableRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  lines: Line[];
  textElements: TextElement[];
}

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

interface ExtractionOptions {
  confidenceThreshold: number;
  headerDetection: boolean;
  cellMerging: boolean;
  formatPreservation: boolean;
  processingMode: 'fast' | 'balanced' | 'accurate';
}

export class TableExtractor {
  private pdfDoc: PDFDocument;
  private options: ExtractionOptions;
  private parser: PDFParser;

  constructor(pdfDoc: PDFDocument, options: Partial<ExtractionOptions> = {}) {
    this.pdfDoc = pdfDoc;
    this.options = {
      confidenceThreshold: 0.7,
      headerDetection: true,
      cellMerging: true,
      formatPreservation: true,
      processingMode: 'balanced',
      ...options,
    };
    this.parser = new PDFParser();
  }

  async extractTables(): Promise<Table[]> {
    const tables: Table[] = [];
    const pages = this.pdfDoc.getPages();

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      // Extract text elements and lines
      const textElements = await this.parser.extractTextElements(page);
      const lines = await this.parser.extractLines(page);

      // Identify table regions
      const tableRegions = this.detectTableRegions(textElements, lines, width, height);

      // Process each detected table region
      for (const region of tableRegions) {
        const table = this.extractTableFromRegion(region);
        if (table && this.validateTable(table)) {
          tables.push({
            ...table,
            pageNumber: pageIndex + 1,
          });
        }
      }
    }

    return tables;
  }

  private detectTableRegions(
    textElements: TextElement[],
    lines: Line[],
    pageWidth: number,
    pageHeight: number
  ): TableRegion[] {
    // Group text elements into potential table regions based on spatial analysis
    const textClusters = this.clusterTextElements(textElements);
    
    // Find table boundaries using lines and text alignment
    const regions: TableRegion[] = [];
    
    for (const cluster of textClusters) {
      const bounds = this.calculateClusterBounds(cluster);
      const relevantLines = this.findRelevantLines(lines, bounds);
      
      if (this.isLikelyTable(cluster, relevantLines)) {
        regions.push({
          ...bounds,
          lines: relevantLines,
          textElements: cluster,
        });
      }
    }

    // Merge overlapping regions
    return this.mergeOverlappingRegions(regions);
  }

  private clusterTextElements(textElements: TextElement[]): TextElement[][] {
    const clusters: TextElement[][] = [];
    const processed = new Set<TextElement>();
    
    // Sort elements by vertical position
    const sorted = [...textElements].sort((a, b) => b.y - a.y);
    
    for (const element of sorted) {
      if (processed.has(element)) continue;
      
      const cluster = [element];
      processed.add(element);
      
      // Find horizontally and vertically aligned elements
      for (const other of sorted) {
        if (processed.has(other)) continue;
        
        const verticalGap = Math.abs(other.y - element.y);
        const horizontalGap = Math.abs(other.x - (element.x + element.width));
        
        if (
          verticalGap < element.height * 1.5 ||
          horizontalGap < element.width * 0.5
        ) {
          cluster.push(other);
          processed.add(other);
        }
      }
      
      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }

  private calculateClusterBounds(cluster: TextElement[]): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const minX = Math.min(...cluster.map(el => el.x));
    const maxX = Math.max(...cluster.map(el => el.x + el.width));
    const minY = Math.min(...cluster.map(el => el.y));
    const maxY = Math.max(...cluster.map(el => el.y + el.height));
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private findRelevantLines(lines: Line[], bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Line[] {
    // Add padding to bounds
    const padding = 10;
    const expandedBounds = {
      x: bounds.x - padding,
      y: bounds.y - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2,
    };
    
    return lines.filter(line => {
      return (
        line.start.x >= expandedBounds.x &&
        line.start.x <= expandedBounds.x + expandedBounds.width &&
        line.start.y >= expandedBounds.y &&
        line.start.y <= expandedBounds.y + expandedBounds.height
      );
    });
  }

  private isLikelyTable(textElements: TextElement[], lines: Line[]): boolean {
    if (textElements.length < 4) return false; // Minimum size for a table
    
    // Check for grid-like structure
    const rows = this.groupIntoRows(textElements);
    if (rows.length < 2) return false;
    
    // Check for consistent column alignment
    const columnCount = this.analyzeColumnAlignment(rows);
    if (columnCount < 2) return false;
    
    // Check for regular spacing
    const hasRegularSpacing = this.checkRegularSpacing(rows);
    if (!hasRegularSpacing) return false;
    
    // If we have lines, they should form a grid-like pattern
    if (lines.length > 0) {
      const hasGridPattern = this.checkGridPattern(lines);
      if (!hasGridPattern) return false;
    }
    
    return true;
  }

  private groupIntoRows(elements: TextElement[]): TextElement[][] {
    const rows: TextElement[][] = [];
    const sorted = [...elements].sort((a, b) => b.y - a.y);
    
    let currentRow: TextElement[] = [];
    let currentY = sorted[0].y;
    
    for (const element of sorted) {
      if (Math.abs(element.y - currentY) > element.height * 0.5) {
        if (currentRow.length > 0) {
          rows.push([...currentRow].sort((a, b) => a.x - b.x));
          currentRow = [];
        }
        currentY = element.y;
      }
      currentRow.push(element);
    }
    
    if (currentRow.length > 0) {
      rows.push([...currentRow].sort((a, b) => a.x - b.x));
    }
    
    return rows;
  }

  private analyzeColumnAlignment(rows: TextElement[][]): number {
    if (rows.length < 2) return 0;
    
    const columnPositions = new Map<number, number>();
    
    // Analyze x-positions across rows
    for (const row of rows) {
      for (const element of row) {
        const roundedX = Math.round(element.x / 5) * 5; // Round to nearest 5 units
        columnPositions.set(roundedX, (columnPositions.get(roundedX) || 0) + 1);
      }
    }
    
    // Count positions that appear in multiple rows
    let consistentColumns = 0;
    for (const count of columnPositions.values()) {
      if (count >= rows.length * 0.7) { // 70% consistency threshold
        consistentColumns++;
      }
    }
    
    return consistentColumns;
  }

  private checkRegularSpacing(rows: TextElement[][]): boolean {
    if (rows.length < 2) return false;
    
    // Check vertical spacing
    const rowGaps: number[] = [];
    for (let i = 1; i < rows.length; i++) {
      const gap = rows[i-1][0].y - rows[i][0].y;
      rowGaps.push(gap);
    }
    
    const avgRowGap = rowGaps.reduce((a, b) => a + b, 0) / rowGaps.length;
    const rowGapVariance = rowGaps.every(gap => 
      Math.abs(gap - avgRowGap) < avgRowGap * 0.3
    );
    
    if (!rowGapVariance) return false;
    
    // Check horizontal spacing in each row
    for (const row of rows) {
      if (row.length < 2) continue;
      
      const gaps: number[] = [];
      for (let i = 1; i < row.length; i++) {
        const gap = row[i].x - (row[i-1].x + row[i-1].width);
        gaps.push(gap);
      }
      
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const gapVariance = gaps.every(gap =>
        Math.abs(gap - avgGap) < avgGap * 0.5
      );
      
      if (!gapVariance) return false;
    }
    
    return true;
  }

  private checkGridPattern(lines: Line[]): boolean {
    const horizontalLines = lines.filter(line =>
      Math.abs(line.start.y - line.end.y) < 2
    );
    
    const verticalLines = lines.filter(line =>
      Math.abs(line.start.x - line.end.x) < 2
    );
    
    if (horizontalLines.length < 2 || verticalLines.length < 2) return false;
    
    // Check for regular spacing between parallel lines
    const horizontalGaps = this.analyzeLineSpacing(horizontalLines, 'y');
    const verticalGaps = this.analyzeLineSpacing(verticalLines, 'x');
    
    return horizontalGaps && verticalGaps;
  }

  private analyzeLineSpacing(lines: Line[], axis: 'x' | 'y'): boolean {
    const positions = lines.map(line => line.start[axis]).sort((a, b) => a - b);
    const gaps: number[] = [];
    
    for (let i = 1; i < positions.length; i++) {
      gaps.push(positions[i] - positions[i-1]);
    }
    
    if (gaps.length === 0) return false;
    
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return gaps.every(gap => Math.abs(gap - avgGap) < avgGap * 0.3);
  }

  private mergeOverlappingRegions(regions: TableRegion[]): TableRegion[] {
    if (regions.length < 2) return regions;
    
    const merged: TableRegion[] = [];
    const processed = new Set<TableRegion>();
    
    for (const region of regions) {
      if (processed.has(region)) continue;
      
      let current = { ...region };
      processed.add(region);
      
      let merged = false;
      do {
        merged = false;
        for (const other of regions) {
          if (processed.has(other)) continue;
          
          if (this.regionsOverlap(current, other)) {
            current = this.mergeRegions(current, other);
            processed.add(other);
            merged = true;
          }
        }
      } while (merged);
      
      merged.push(current);
    }
    
    return merged;
  }

  private regionsOverlap(a: TableRegion, b: TableRegion): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  private mergeRegions(a: TableRegion, b: TableRegion): TableRegion {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x + a.width, b.x + b.width);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y + a.height, b.y + b.height);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      lines: [...a.lines, ...b.lines],
      textElements: [...a.textElements, ...b.textElements],
    };
  }

  private extractTableFromRegion(region: TableRegion): Table | null {
    // Identify rows and columns
    const rows = this.groupIntoRows(region.textElements);
    if (rows.length < 2) return null;
    
    // Create grid structure
    const grid = this.createGrid(rows, region);
    if (!grid || grid.length === 0) return null;
    
    // Handle merged cells if enabled
    if (this.options.cellMerging) {
      this.detectAndMergeCells(grid);
    }
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(grid, region);
    if (confidence < this.options.confidenceThreshold) return null;
    
    return {
      cells: grid,
      confidence,
      pageNumber: 0, // Will be set by caller
    };
  }

  private createGrid(rows: TextElement[][], region: TableRegion): TableCell[][] {
    const grid: TableCell[][] = [];
    
    // Analyze column positions
    const columnPositions = this.identifyColumnPositions(rows);
    if (columnPositions.length < 2) return [];
    
    // Create cells for each row
    for (const row of rows) {
      const cells: TableCell[] = [];
      let currentCol = 0;
      
      for (const element of row) {
        // Find the column this element belongs to
        while (
          currentCol < columnPositions.length - 1 &&
          element.x >= (columnPositions[currentCol + 1] + columnPositions[currentCol]) / 2
        ) {
          // Add empty cell if column is skipped
          cells.push({
            text: '',
            x: columnPositions[currentCol],
            y: element.y,
            width: columnPositions[currentCol + 1] - columnPositions[currentCol],
            height: element.height,
          });
          currentCol++;
        }
        
        cells.push({
          text: element.text,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        });
        currentCol++;
      }
      
      // Fill remaining columns with empty cells
      while (currentCol < columnPositions.length) {
        cells.push({
          text: '',
          x: columnPositions[currentCol],
          y: row[0].y,
          width: columnPositions[currentCol + 1] - columnPositions[currentCol],
          height: row[0].height,
        });
        currentCol++;
      }
      
      grid.push(cells);
    }
    
    return grid;
  }

  private identifyColumnPositions(rows: TextElement[][]): number[] {
    const positions = new Set<number>();
    
    // Collect all x-positions
    for (const row of rows) {
      for (const element of row) {
        positions.add(Math.round(element.x / 5) * 5);
        positions.add(Math.round((element.x + element.width) / 5) * 5);
      }
    }
    
    return Array.from(positions).sort((a, b) => a - b);
  }

  private detectAndMergeCells(grid: TableCell[][]): void {
    // Detect horizontal merges
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length - 1; j++) {
        const current = grid[i][j];
        const next = grid[i][j + 1];
        
        if (
          current.text &&
          !next.text &&
          Math.abs(current.y - next.y) < 2
        ) {
          current.width += next.width;
          current.colSpan = (current.colSpan || 1) + 1;
          grid[i].splice(j + 1, 1);
          j--;
        }
      }
    }
    
    // Detect vertical merges
    for (let j = 0; j < grid[0].length; j++) {
      for (let i = 0; i < grid.length - 1; i++) {
        const current = grid[i][j];
        const below = grid[i + 1][j];
        
        if (
          current.text &&
          !below.text &&
          Math.abs(current.x - below.x) < 2
        ) {
          current.height += below.height;
          current.rowSpan = (current.rowSpan || 1) + 1;
          grid[i + 1].splice(j, 1);
          if (grid[i + 1].length === 0) {
            grid.splice(i + 1, 1);
            i--;
          }
        }
      }
    }
  }

  private calculateConfidence(grid: TableCell[][], region: TableRegion): number {
    let confidence = 1.0;
    
    // Check row consistency
    const rowLengths = new Set(grid.map(row => row.length));
    if (rowLengths.size > 1) {
      confidence *= 0.8; // Penalize inconsistent row lengths
    }
    
    // Check for empty cells
    const totalCells = grid.reduce((sum, row) => sum + row.length, 0);
    const emptyCells = grid.reduce((sum, row) =>
      sum + row.filter(cell => !cell.text).length, 0
    );
    const emptyRatio = emptyCells / totalCells;
    confidence *= (1 - emptyRatio * 0.5);
    
    // Check alignment consistency
    let alignmentScore = 0;
    for (let j = 0; j < grid[0].length; j++) {
      const colCells = grid.map(row => row[j]).filter(cell => cell && cell.text);
      if (colCells.length < 2) continue;
      
      const xPositions = new Set(colCells.map(cell => Math.round(cell.x / 5) * 5));
      alignmentScore += 1 / xPositions.size;
    }
    alignmentScore /= grid[0].length;
    confidence *= (0.8 + alignmentScore * 0.2);
    
    // Consider line presence
    if (region.lines.length > 0) {
      const gridLines = this.checkGridPattern(region.lines);
      confidence *= gridLines ? 1.1 : 0.9;
    }
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  private validateTable(table: Table): boolean {
    if (!table.cells.length || !table.cells[0].length) return false;
    
    // Check minimum size
    if (table.cells.length < 2 || table.cells[0].length < 2) return false;
    
    // Check row consistency
    const rowLength = table.cells[0].length;
    if (!table.cells.every(row => row.length === rowLength)) return false;
    
    // Check data presence
    const totalCells = table.cells.reduce((sum, row) => sum + row.length, 0);
    const nonEmptyCells = table.cells.reduce((sum, row) =>
      sum + row.filter(cell => cell.text.trim()).length, 0
    );
    
    return nonEmptyCells / totalCells >= 0.3; // At least 30% cells should have content
  }
} 
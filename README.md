# PDF Table Extractor

A powerful tool for extracting tables from PDF documents without relying on external libraries like Tabula or Camelot. This tool uses direct PDF content stream parsing to detect and extract tables, making it suitable for both system-generated and scanned PDFs.

## Features

- **Advanced Table Detection**: Automatically identifies tables in PDF documents using spatial analysis and pattern recognition
- **Direct PDF Processing**: Works directly with PDF content streams without converting to images
- **Smart Extraction**: Handles various table formats including:
  - Tables with borders
  - Tables without borders
  - Tables with merged cells
  - Tables with irregular shapes
- **Excel Output**: Generates clean, formatted Excel files with preserved structure
- **Batch Processing**: Process multiple PDFs simultaneously
- **Interactive UI**: Modern web interface with real-time feedback
- **Customizable Settings**:
  - Processing mode (Fast/Balanced/Accurate)
  - Confidence threshold
  - Header detection
  - Cell merging
  - Format preservation

## Technology Stack

- **Frontend**:
  - React with Next.js
  - Material-UI components
  - TypeScript
  - React Dropzone for file handling
- **Backend**:
  - Node.js/Next.js API routes
  - pdf-lib for PDF parsing
  - ExcelJS for Excel file generation
- **Testing**:
  - Jest for unit and integration tests
  - TypeScript for type safety

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pdf-table-extractor.git
   cd pdf-table-extractor
   ```

2. Install dependencies:
```bash
   npm install
```

3. Start the development server:
```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload PDF**:
   - Drag and drop PDF files onto the upload area
   - Or click to select files from your computer
   - Multiple files are supported

2. **Configure Settings**:
   - Processing Mode:
     - Fast: Quick results with basic accuracy
     - Balanced: Good balance of speed and accuracy
     - Accurate: Highest accuracy, slower processing
   - Confidence Threshold: Adjust minimum confidence for table detection
   - Header Detection: Enable/disable automatic header row detection
   - Cell Merging: Enable/disable detection of merged cells
   - Format Preservation: Maintain original formatting in Excel output

3. **Process Files**:
   - Click "Process" to start extraction
   - Progress indicators show status for each file
   - Results appear in real-time

4. **View Results**:
   - Preview extracted tables in the browser
   - Download Excel files with extracted tables
   - View extraction statistics and confidence scores

## Sample Files

The `samples` directory contains example PDFs and their corresponding Excel outputs:

- `samples/pdfs/`: Sample PDF files with various table types
- `samples/excel/`: Expected Excel output files
- Each sample demonstrates different table scenarios:
  - Basic tables with borders
  - Complex tables with merged cells
  - Tables without explicit borders
  - Mixed content with multiple tables

## Demo Video

[Watch Demo Video](link-to-demo-video) - A short demonstration of the tool's capabilities and usage.

## Technical Details

### Table Detection Algorithm

1. **Content Stream Parsing**:
   - Direct parsing of PDF content streams
   - Extraction of text elements with positions
   - Detection of lines and graphical elements

2. **Spatial Analysis**:
   - Clustering of text elements
   - Detection of grid patterns
   - Analysis of text alignment and spacing

3. **Structure Recognition**:
   - Identification of table boundaries
   - Detection of rows and columns
   - Recognition of merged cells
   - Header row detection

4. **Confidence Scoring**:
   - Evaluation of structural consistency
   - Assessment of content distribution
   - Validation of extracted data

### Processing Pipeline

1. **PDF Loading**:
   - Load and parse PDF document
   - Extract content streams
   - Initialize processing context

2. **Table Detection**:
   - Analyze page layout
   - Identify potential table regions
   - Apply detection algorithms

3. **Data Extraction**:
   - Extract text and positions
   - Determine cell boundaries
   - Handle merged cells
   - Preserve formatting

4. **Output Generation**:
   - Create Excel workbook
   - Format cells and data
   - Apply styles and borders
   - Generate final file

## Configuration Options

### Performance Settings

- `processingMode`: 'fast' | 'balanced' | 'accurate'
- `maxThreads`: Number of concurrent processing threads
- `confidenceThreshold`: Minimum confidence score (0.0 - 1.0)

### Extraction Settings

- `headerDetection`: Enable/disable automatic header detection
- `cellMerging`: Enable/disable merged cell detection
- `imageExtraction`: Include images in output
- `ocrEnabled`: Enable OCR for scanned documents

### Format Settings

- `tableFormat`: 'auto' | 'grid' | 'list'
- `preserveFormatting`: Maintain original styles
- `multipleSheets`: Split tables across sheets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- GitHub Issues: Report bugs and feature requests
- Documentation: Check the [Wiki](wiki-link) for detailed guides
- Community: Join our [Discord](discord-link) for discussions

## Acknowledgments

- [pdf-lib](https://github.com/Hopding/pdf-lib) for PDF parsing
- [ExcelJS](https://github.com/exceljs/exceljs) for Excel file generation
- Material-UI team for the component library
- All contributors and testers 
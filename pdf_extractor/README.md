# PDF Table Extractor

A Python tool for extracting tables from system-generated PDFs without using Tabula, Camelot, or image conversion. This tool uses advanced spatial analysis and text positioning to detect and extract tables, even those with no borders or irregular shapes.

## Features

- Extracts tables from system-generated PDFs
- Handles tables with or without borders
- Supports irregular table shapes
- Detects and handles merged cells (both row and column spans)
- Processes multi-line cell content
- Exports tables to Excel format with proper formatting
- Supports batch processing of multiple PDFs
- Includes confidence scoring for table detection
- No dependency on Tabula or Camelot
- No image conversion required
- Containerized deployment with Docker
- CI/CD pipeline with GitHub Actions
- Monitoring with Prometheus and Grafana

## Installation

### Local Installation

1. Clone this repository or download the source code
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

### Docker Installation

```bash
# Build and run using Docker
docker build -t pdf-extractor .
docker run -v $(pwd)/input:/data/input -v $(pwd)/output:/data/output pdf-extractor

# Or using docker-compose
docker-compose up -d
```

## Usage

### Command Line Interface

The tool provides a command-line interface for easy use:

```bash
# Process a single PDF file
python table_extractor.py input.pdf output_directory/

# Process a directory of PDFs in parallel
python table_extractor.py --batch input_directory/ output_directory/

# Adjust table detection sensitivity
python table_extractor.py --tolerance 2.5 input.pdf output_directory/

# Specify number of parallel workers for batch processing
python table_extractor.py --batch --workers 8 input_directory/ output_directory/
```

### Docker Usage

```bash
# Process a single PDF
docker run -v $(pwd)/input:/data/input -v $(pwd)/output:/data/output pdf-extractor input.pdf /data/output

# Process multiple PDFs
docker run -v $(pwd)/input:/data/input -v $(pwd)/output:/data/output pdf-extractor --batch /data/input /data/output
```

### Python API

```python
from table_extractor import PDFTableExtractor

# Create an extractor with custom parameters
extractor = PDFTableExtractor(
    tolerance=3.0,          # Tolerance for text alignment
    min_rows=2,            # Minimum rows to consider as table
    min_cols=2,            # Minimum columns to consider as table
    max_cell_height=50.0   # Maximum height for single-line cells
)

# Extract tables from a PDF
tables = extractor.extract_tables("path/to/your/input.pdf")

# Save tables to Excel
extractor.save_to_excel(tables, "output.xlsx")

# Batch processing
from table_extractor import batch_process_pdfs
batch_process_pdfs("input_directory/", "output_directory/", max_workers=4)
```

## DevOps Integration

### CI/CD Pipeline

The project includes a GitHub Actions workflow that:
1. Runs tests and generates coverage reports
2. Builds and pushes Docker images
3. Deploys to DockerHub on successful builds

### Monitoring

The application includes Prometheus metrics and Grafana dashboards:

1. Start monitoring stack:
```bash
docker-compose up -d
```

2. Access monitoring:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (default credentials: admin/admin)

### Testing

Run the test suite:

```bash
# Run tests
python -m pytest

# Run tests with coverage
python -m pytest --cov=./ --cov-report=html
```

## How It Works

1. **Text Block Extraction**:
   - Extracts text blocks and their positions from the PDF using PyMuPDF
   - Handles multi-line text within blocks
   - Preserves spatial information for accurate table detection

2. **Table Detection**:
   - Groups text blocks into potential table regions
   - Uses spatial analysis to identify row and column structures
   - Implements confidence scoring to validate table detection

3. **Merged Cell Detection**:
   - Analyzes cell positions and spacing to detect merged cells
   - Supports both row and column spanning
   - Handles irregular table structures

4. **Excel Export**:
   - Creates properly formatted Excel workbooks
   - Applies merged cells in the output
   - Adds borders and adjusts column widths
   - Preserves table structure and formatting

## Configuration

The extractor can be configured with several parameters:

- `tolerance`: Controls the sensitivity of text alignment detection (default: 3.0)
- `min_rows`: Minimum number of rows to consider a structure as table (default: 2)
- `min_cols`: Minimum number of columns to consider a structure as table (default: 2)
- `max_cell_height`: Maximum height for single-line cells (default: 50.0)

## Performance Optimization

- Implements parallel processing for batch PDF processing
- Uses efficient text block grouping algorithms
- Optimizes memory usage for large PDFs
- Provides progress logging and error handling
- Container-based deployment for scalability

## Troubleshooting

Common issues and solutions:

1. **No tables detected**:
   - Try adjusting the tolerance parameter
   - Verify PDF text is properly encoded
   - Check PDF permissions and encryption

2. **Incorrect table structure**:
   - Adjust min_rows and min_cols parameters
   - Verify table spacing in PDF
   - Check for merged cells

3. **Docker issues**:
   - Ensure proper volume mounting
   - Check container logs
   - Verify Docker daemon is running

## Error Handling

The tool includes comprehensive error handling and logging:

- Validates input files and directories
- Provides detailed error messages
- Logs processing progress and timing
- Handles edge cases gracefully

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Add your changes
4. Run tests and ensure CI passes
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- PyMuPDF for PDF processing
- openpyxl for Excel file handling
- numpy for numerical operations
- Docker for containerization
- GitHub Actions for CI/CD
- Prometheus and Grafana for monitoring 
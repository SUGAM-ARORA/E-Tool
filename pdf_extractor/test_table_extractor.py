import unittest
import os
import fitz
from table_extractor import PDFTableExtractor, Table, Cell
import tempfile
import shutil

class TestPDFTableExtractor(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a temporary directory for test files
        cls.test_dir = tempfile.mkdtemp()
        cls.extractor = PDFTableExtractor()
        
        # Create a simple test PDF with a table
        cls.test_pdf_path = os.path.join(cls.test_dir, "test_table.pdf")
        doc = fitz.open()
        page = doc.new_page()
        
        # Create a simple table in the PDF
        table_text = """
        Column1 Column2 Column3
        Data1   Data2   Data3
        Data4   Data5   Data6
        """
        page.insert_text((72, 72), table_text)
        doc.save(cls.test_pdf_path)
        doc.close()

    @classmethod
    def tearDownClass(cls):
        # Clean up temporary directory
        shutil.rmtree(cls.test_dir)

    def test_text_block_extraction(self):
        """Test if text blocks are correctly extracted from PDF"""
        doc = fitz.open(self.test_pdf_path)
        blocks = self.extractor._get_text_blocks(doc[0], 0)
        doc.close()
        
        self.assertTrue(len(blocks) > 0, "No text blocks extracted")
        self.assertTrue(any("Column" in block.text for block in blocks), 
                       "Header row not found in blocks")

    def test_table_detection(self):
        """Test if tables are correctly detected"""
        tables = self.extractor.extract_tables(self.test_pdf_path)
        
        self.assertTrue(len(tables) > 0, "No tables detected")
        self.assertIsInstance(tables[0], Table, "Detected table is not a Table instance")
        self.assertTrue(len(tables[0].rows) >= 3, "Table should have at least 3 rows")

    def test_merged_cell_detection(self):
        """Test if merged cells are correctly detected"""
        # Create a PDF with merged cells
        merged_pdf_path = os.path.join(self.test_dir, "merged_table.pdf")
        doc = fitz.open()
        page = doc.new_page()
        
        # Create a table with merged cells
        table_text = """
        MergedColumn    Column2
        Data1          Data2
        Data3          Data4
        """
        page.insert_text((72, 72), table_text)
        doc.save(merged_pdf_path)
        doc.close()
        
        tables = self.extractor.extract_tables(merged_pdf_path)
        self.assertTrue(any(cell.colspan > 1 or cell.rowspan > 1 
                          for row in tables[0].rows 
                          for cell in row), 
                       "No merged cells detected")

    def test_excel_export(self):
        """Test if tables are correctly exported to Excel"""
        tables = self.extractor.extract_tables(self.test_pdf_path)
        excel_path = os.path.join(self.test_dir, "test_output.xlsx")
        
        self.extractor.save_to_excel(tables, excel_path)
        self.assertTrue(os.path.exists(excel_path), "Excel file not created")
        self.assertTrue(os.path.getsize(excel_path) > 0, "Excel file is empty")

    def test_batch_processing(self):
        """Test batch processing of multiple PDFs"""
        # Create multiple test PDFs
        for i in range(3):
            pdf_path = os.path.join(self.test_dir, f"test_{i}.pdf")
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text((72, 72), f"Table{i} Header\nData1 Data2")
            doc.save(pdf_path)
            doc.close()
        
        output_dir = os.path.join(self.test_dir, "output")
        os.makedirs(output_dir, exist_ok=True)
        
        from table_extractor import batch_process_pdfs
        batch_process_pdfs(self.test_dir, output_dir)
        
        excel_files = [f for f in os.listdir(output_dir) if f.endswith('.xlsx')]
        self.assertTrue(len(excel_files) > 0, "No Excel files created during batch processing")

if __name__ == '__main__':
    unittest.main() 
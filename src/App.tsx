import React, { useState, useCallback } from 'react';
import { Upload, FileText, Table, Download, AlertCircle } from 'lucide-react';
import { pdfjs } from 'react-pdf';
import { detectTables } from './utils/tableDetection';
import { exportTablesToExcel } from './utils/excelExport';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [tables, setTables] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const tablesPerPage = 5;

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === 'application/pdf'
      );
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processFiles = async () => {
    setProcessing(true);
    setError(null);
    setTables([]);
    
    try {
      const extractedTables: any[] = [];
      
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          const pageTables = detectTables(textContent, i);
          extractedTables.push(...pageTables.map(table => ({
            ...table,
            fileName: file.name
          })));
        }
      }
      
      setTables(extractedTables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = useCallback(() => {
    try {
      exportTablesToExcel(tables);
    } catch (err) {
      setError('Failed to export tables to Excel');
    }
  }, [tables]);

  const paginatedTables = tables.slice(
    (currentPage - 1) * tablesPerPage,
    currentPage * tablesPerPage
  );

  const totalPages = Math.ceil(tables.length / tablesPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">PDF Table Extractor</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div 
            className="border-4 border-dashed border-gray-200 rounded-lg p-8 md:p-12 transition-colors duration-200 ease-in-out hover:border-indigo-200"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 transition-colors duration-200 ease-in-out group-hover:text-indigo-500" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-600">
                    Drop PDF files here or click to upload
                  </span>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-medium text-gray-900">Selected Files</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {files.map((file, index) => (
                  <li key={index} className="col-span-1 bg-white rounded-lg shadow divide-y divide-gray-200">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3 truncate">
                        <FileText className="flex-shrink-0 h-6 w-6 text-gray-400" />
                        <span className="flex-1 truncate text-sm font-medium text-gray-900">
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <span className="sr-only">Remove file</span>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <button
                  onClick={processFiles}
                  disabled={processing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Extract Tables'
                  )}
                </button>

                {tables.length > 0 && (
                  <button
                    onClick={handleExport}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Export to Excel
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {tables.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Extracted Tables ({tables.length} found)
              </h2>
              
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {paginatedTables.map((table, index) => (
                  <div key={index} className="border-b border-gray-200 p-4">
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-900">
                        Table {(currentPage - 1) * tablesPerPage + index + 1} from {table.fileName} (Page {table.pageNumber})
                      </h3>
                      <span className="text-sm text-gray-500">
                        Confidence: {Math.round(table.confidence * 100)}%
                      </span>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <tbody className="bg-white divide-y divide-gray-200">
                          {table.rows.map((row: any[], rowIndex: number) => (
                            <tr key={rowIndex}>
                              {row.map((cell: any, cellIndex: number) => (
                                <td
                                  key={cellIndex}
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                  rowSpan={cell.rowSpan}
                                  colSpan={cell.colSpan}
                                >
                                  {cell.text}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === i + 1
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </nav>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
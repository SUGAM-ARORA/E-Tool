import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const extractionDuration = new client.Histogram({
  name: 'pdf_table_extraction_duration_seconds',
  help: 'Duration of PDF table extraction in seconds',
  labelNames: ['status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60]
});

const tablesExtracted = new client.Counter({
  name: 'pdf_tables_extracted_total',
  help: 'Total number of tables extracted',
  labelNames: ['status']
});

const processingQueueSize = new client.Gauge({
  name: 'pdf_processing_queue_size',
  help: 'Current size of the PDF processing queue'
});

const fileSize = new client.Histogram({
  name: 'pdf_file_size_bytes',
  help: 'Size of processed PDF files in bytes',
  buckets: [1000, 10000, 100000, 1000000, 10000000]
});

const extractionErrors = new client.Counter({
  name: 'pdf_extraction_errors_total',
  help: 'Total number of extraction errors',
  labelNames: ['error_type']
});

const memoryUsage = new client.Gauge({
  name: 'pdf_extractor_memory_usage_bytes',
  help: 'Memory usage of the PDF extractor'
});

// Register all metrics
register.registerMetric(extractionDuration);
register.registerMetric(tablesExtracted);
register.registerMetric(processingQueueSize);
register.registerMetric(fileSize);
register.registerMetric(extractionErrors);
register.registerMetric(memoryUsage);

export const metrics = {
  extractionDuration,
  tablesExtracted,
  processingQueueSize,
  fileSize,
  extractionErrors,
  memoryUsage,
  register
};

// Update memory usage every 15 seconds
setInterval(() => {
  const used = process.memoryUsage();
  memoryUsage.set(used.heapUsed);
}, 15000); 
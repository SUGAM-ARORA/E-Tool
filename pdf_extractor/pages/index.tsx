import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Button, Snackbar, Alert, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import ResultsDisplay from '../components/ResultsDisplay';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { metrics } from '../utils/metrics';

const DropzoneBox = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(6),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: theme.palette.background.paper,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.secondary.main,
  },
}));

const SelectedFileBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[3],
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1, 3),
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    metrics.processingQueueSize.set(selectedFiles.length);
  }, [selectedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map(file => {
        metrics.fileSize.observe(file.size);
        return file;
      });
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setSnackbar({
        open: true,
        message: `Added ${acceptedFiles.length} file(s)`,
        severity: 'success'
      });
    },
    onDropRejected: () => {
      setSnackbar({
        open: true,
        message: 'Only PDF files are accepted',
        severity: 'error'
      });
    }
  });

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      metrics.processingQueueSize.set(newFiles.length);
      return newFiles;
    });
  };

  const handleRetry = async (fileName: string) => {
    const fileToRetry = selectedFiles.find(f => f.name === fileName);
    if (fileToRetry) {
      setIsProcessing(true);
      await processFile(fileToRetry);
      setIsProcessing(false);
    }
  };

  const processFile = async (file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);
    const startTime = Date.now();

    try {
      const response = await axios.post('/api/extract-tables', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const processingTime = Date.now() - startTime;
      metrics.extractionDuration.observe({ status: 'success' }, processingTime / 1000);
      metrics.tablesExtracted.inc({ status: 'success' }, response.data.tablesCount);

      return {
        fileName: file.name,
        status: 'success',
        message: `Successfully extracted ${response.data.tablesCount} tables`,
        tablesExtracted: response.data.tablesCount,
        outputPath: response.data.outputPath,
        processingTime,
        fileSize: file.size
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      metrics.extractionDuration.observe({ status: 'error' }, processingTime / 1000);
      metrics.extractionErrors.inc({ error_type: error.response?.data?.error || 'unknown' });

      return {
        fileName: file.name,
        status: 'error',
        message: error.response?.data?.message || 'Failed to extract tables',
        processingTime,
        fileSize: file.size
      };
    }
  };

  const handleExtractTables = async () => {
    setIsProcessing(true);
    setProgress(0);
    const newResults = [];
    const totalFiles = selectedFiles.length;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const result = await processFile(selectedFiles[i]);
        newResults.push(result);
        setProgress(((i + 1) / totalFiles) * 100);
      }

      setSnackbar({
        open: true,
        message: `Processed ${totalFiles} file(s)`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'An error occurred during processing',
        severity: 'error'
      });
    } finally {
      setResults(newResults);
      setIsProcessing(false);
      setProgress(100);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box py={6}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ 
            fontWeight: 'bold',
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 4
          }}
        >
          PDF Table Extractor
        </Typography>

        <DropzoneBox 
          {...getRootProps()} 
          sx={{ 
            borderColor: isDragActive ? theme.palette.secondary.main : theme.palette.primary.main,
            transform: isDragActive ? 'scale(1.02)' : 'scale(1)',
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            {isDragActive ? 'Drop your PDFs here' : 'Drop PDF files here or click to upload'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Drag and drop your PDF files here, or click to select files
          </Typography>
        </DropzoneBox>

        {selectedFiles.length > 0 && (
          <Box mt={4}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              Selected Files ({selectedFiles.length})
            </Typography>
            {selectedFiles.map((file, index) => (
              <SelectedFileBox key={index}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Size: {(file.size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>
                <ActionButton
                  startIcon={<DeleteIcon />}
                  onClick={() => handleRemoveFile(index)}
                  color="error"
                  disabled={isProcessing}
                  variant="outlined"
                >
                  Remove
                </ActionButton>
              </SelectedFileBox>
            ))}
            <Box mt={3} display="flex" justifyContent="center">
              <ActionButton
                variant="contained"
                color="primary"
                onClick={handleExtractTables}
                disabled={isProcessing}
                size="large"
                sx={{ minWidth: isMobile ? '100%' : 200 }}
              >
                {isProcessing ? 'Processing...' : 'Extract Tables'}
              </ActionButton>
            </Box>
          </Box>
        )}

        <ResultsDisplay
          isProcessing={isProcessing}
          progress={progress}
          results={results}
          onRetry={handleRetry}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
} 
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Snackbar,
  Alert,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import FileUploadIcon from '@mui/icons-material/FileUpload';

const steps = ['Upload PDFs', 'Configure Settings', 'Extract Tables'];

const DropzoneContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  border: `2px dashed ${theme.palette.divider}`,
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
  transition: 'all 0.3s ease',
}));

const IconContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& svg': {
    fontSize: 48,
    color: theme.palette.primary.main,
  },
}));

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      setActiveStep(1);
    },
  });

  const handleProcessFiles = async () => {
    setProcessing(true);
    try {
      // Process files logic will be implemented here
      setActiveStep(2);
    } catch (err) {
      setError('Error processing files. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        PDF Table Extractor
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Box sx={{ mt: 4 }}>
        {activeStep === 0 && (
          <DropzoneContainer {...getRootProps()}>
            <input {...getInputProps()} />
            <IconContainer>
              <FileUploadIcon />
            </IconContainer>
            <Typography variant="h6" gutterBottom>
              {isDragActive
                ? 'Drop PDFs here'
                : 'Drag and drop PDFs here, or click to select files'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Supports system-generated PDFs with tables
            </Typography>
          </DropzoneContainer>
        )}

        {activeStep === 1 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Selected Files ({files.length})
            </Typography>
            {files.map((file) => (
              <Typography key={file.name}>{file.name}</Typography>
            ))}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleProcessFiles}
                disabled={processing}
                startIcon={processing ? <CircularProgress size={20} /> : null}
              >
                {processing ? 'Processing...' : 'Process Files'}
              </Button>
            </Box>
          </Paper>
        )}

        {activeStep === 2 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Results
            </Typography>
            {/* Results display will be implemented here */}
          </Paper>
        )}
      </Box>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
} 
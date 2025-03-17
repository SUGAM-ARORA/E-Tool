import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Paper, Alert, LinearProgress, Fade, Zoom } from '@mui/material';
import { Table, Grid, Card, CardContent, IconButton, Tooltip, Modal, Button } from '@mui/material';
import { TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import { CheckCircle, Error, AccessTime, Download, Refresh, FileDownload, Preview, Close } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Styled Components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: `0 20px 25px -5px ${theme.palette.action.hover}, 0 10px 10px -5px ${theme.palette.action.selected}`,
  },
}));

const AnimatedProgress = styled(LinearProgress)(({ theme }) => ({
  height: 12,
  borderRadius: 6,
  background: `linear-gradient(45deg, ${theme.palette.grey[200]}, ${theme.palette.grey[300]})`,
  [`& .MuiLinearProgress-bar`]: {
    borderRadius: 6,
    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    backgroundSize: '200% 200%',
    animation: 'gradient 2s ease infinite',
  },
  '@keyframes gradient': {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
}));

const PreviewModal = styled(Modal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& .MuiPaper-root': {
    width: '90%',
    maxWidth: 1200,
    maxHeight: '90vh',
    overflow: 'auto',
    borderRadius: theme.shape.borderRadius * 2,
    padding: theme.spacing(3),
    background: theme.palette.background.paper,
    boxShadow: theme.shadows[24],
  },
}));

const ExcelPreviewContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '70vh',
  overflow: 'auto',
  background: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    '& th, & td': {
      border: `1px solid ${theme.palette.divider}`,
      padding: theme.spacing(1),
      textAlign: 'left',
    },
    '& th': {
      background: theme.palette.primary.light,
      color: theme.palette.primary.contrastText,
      position: 'sticky',
      top: 0,
      zIndex: 1,
    },
    '& tr:nth-of-type(even)': {
      background: theme.palette.action.hover,
    },
  },
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  '& .MuiTable-root': {
    minWidth: 750,
  },
  '& .MuiTableCell-root': {
    padding: theme.spacing(2),
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const DownloadButton = styled(IconButton)(({ theme }) => ({
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    background: theme.palette.primary.dark,
  },
  transition: 'all 0.2s ease-in-out',
}));

interface ResultsDisplayProps {
  isProcessing: boolean;
  progress: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    message: string;
    tablesExtracted?: number;
    outputPath?: string;
    processingTime?: number;
    fileSize?: number;
    excelData?: any[][];  // Add this for Excel preview data
  }>;
  onRetry?: (fileName: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatTime = (ms: number): string => {
  if (!ms) return '0s';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ isProcessing, progress, results, onRetry }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);

  const handlePreview = async (result: any) => {
    setSelectedResult(result);
    setPreviewOpen(true);
    // Here you would typically fetch the Excel data if it's not already loaded
    if (!result.excelData) {
      try {
        const response = await fetch(result.outputPath);
        const data = await response.json();
        result.excelData = data;
      } catch (error) {
        console.error('Failed to load Excel preview:', error);
      }
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalTables = results.reduce((sum, r) => sum + (r.tablesExtracted || 0), 0);
  const avgProcessingTime = results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / (results.length || 1);

  const renderStats = () => (
    <Fade in timeout={1000}>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CheckCircle color="success" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Success Rate</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {results.length ? ((successCount / results.length) * 100).toFixed(1) : 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {successCount} of {results.length} files processed successfully
              </Typography>
            </CardContent>
          </StyledCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AccessTime color="primary" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Processing Time</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {formatTime(avgProcessingTime)}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Average processing time per file
              </Typography>
            </CardContent>
          </StyledCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FileDownload color="info" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Tables Found</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {totalTables}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Total tables extracted from all files
              </Typography>
            </CardContent>
          </StyledCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StyledCard>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Error color="error" sx={{ mr: 1, fontSize: 32 }} />
                <Typography variant="h6">Errors</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                {errorCount}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Files that failed to process
              </Typography>
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
    </Fade>
  );

  const renderPreviewModal = () => (
    <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)}>
      <Paper>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Excel Preview: {selectedResult?.fileName}
          </Typography>
          <IconButton onClick={() => setPreviewOpen(false)}>
            <Close />
          </IconButton>
        </Box>
        
        {selectedResult?.excelData ? (
          <ExcelPreviewContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {selectedResult.excelData[0]?.map((header: string, index: number) => (
                    <TableCell key={index}>{header}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedResult.excelData.slice(1).map((row: any[], rowIndex: number) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell: any, cellIndex: number) => (
                      <TableCell key={cellIndex}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ExcelPreviewContainer>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <CircularProgress />
          </Box>
        )}
      </Paper>
    </PreviewModal>
  );

  if (isProcessing) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography variant="h6">
            Processing Files... ({Math.round(progress)}%)
          </Typography>
        </Box>
        <AnimatedProgress variant="determinate" value={progress} />
        <Typography variant="body2" color="text.secondary" mt={2} textAlign="center">
          Please wait while we process your files. This may take a few minutes.
        </Typography>
      </Box>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <Box mt={4}>
      <Fade in timeout={500}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center',
            mb: 4
          }}
        >
          Extraction Results
        </Typography>
      </Fade>

      {renderStats()}

      <Zoom in timeout={500}>
        <StyledTableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>File Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Processing Time</TableCell>
                <TableCell>File Size</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((result, index) => (
                <TableRow 
                  key={index}
                  sx={{
                    backgroundColor: result.status === 'error' ? 'error.lighter' : 'inherit',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'scale(1.01)',
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {result.fileName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Alert 
                      severity={result.status === 'success' ? 'success' : 'error'} 
                      sx={{ 
                        width: 'fit-content',
                        '& .MuiAlert-icon': {
                          fontSize: 24,
                        },
                      }}
                      icon={result.status === 'success' ? <CheckCircle /> : <Error />}
                    >
                      {result.status}
                    </Alert>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {result.message}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTime(result.processingTime || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatFileSize(result.fileSize || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center" gap={1}>
                      {result.status === 'success' && result.outputPath ? (
                        <>
                          <Tooltip title="Preview Excel">
                            <IconButton
                              size="small"
                              onClick={() => handlePreview(result)}
                              sx={{
                                color: 'primary.main',
                                '&:hover': {
                                  transform: 'scale(1.1)',
                                },
                              }}
                            >
                              <Preview />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download Excel">
                            <IconButton
                              size="small"
                              onClick={() => window.open(result.outputPath, '_blank')}
                              sx={{
                                color: 'success.main',
                                '&:hover': {
                                  transform: 'scale(1.1)',
                                },
                              }}
                            >
                              <Download />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <Tooltip title="Retry Processing">
                          <IconButton
                            size="small"
                            onClick={() => onRetry?.(result.fileName)}
                            sx={{
                              color: 'warning.main',
                              '&:hover': {
                                transform: 'scale(1.1)',
                              },
                            }}
                          >
                            <Refresh />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
      </Zoom>

      {renderPreviewModal()}
    </Box>
  );
};

export default ResultsDisplay; 
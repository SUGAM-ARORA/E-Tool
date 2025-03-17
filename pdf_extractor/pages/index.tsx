import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Container, Typography, Button, Snackbar, Alert, useTheme, useMediaQuery, Paper, 
  Switch, FormControlLabel, Chip, IconButton, Tooltip, CircularProgress, Drawer,
  List, ListItem, ListItemText, ListItemIcon, Slider, Select, MenuItem, FormControl,
  InputLabel, Collapse, Stepper, Step, StepLabel, StepContent, Backdrop, Zoom,
  SpeedDial, SpeedDialAction, SpeedDialIcon, Divider, Stack, Badge, Grid, Card, CardContent
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import SpeedIcon from '@mui/icons-material/Speed';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import BatchPredictionIcon from '@mui/icons-material/BatchPrediction';
import ResultsDisplay from '../components/ResultsDisplay';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { metrics } from '../utils/metrics';
import { 
  CloudUploadIcon as OldCloudUploadIcon, DeleteIcon as OldDeleteIcon, InfoIcon as OldInfoIcon, SpeedIcon as OldSpeedIcon,
  DarkModeIcon as OldDarkModeIcon, LightModeIcon as OldLightModeIcon, SettingsIcon as OldSettingsIcon,
  BatchPredictionIcon as OldBatchPredictionIcon, TableChartIcon, TuneIcon, FormatAlignLeftIcon,
  GridOnIcon, AutoFixHighIcon, ExpandMore, ExpandLess, Folder, FolderOpen,
  Description, CheckCircle, Error, Refresh, Save, Share, Download, Print, Preview
} from '@mui/icons-material';
import { extractTables } from '../lib/table-extractor';
import { PDFDocument } from 'pdf-lib';

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
`;

const DropzoneBox = styled(Paper)(({ theme }) => ({
  border: `3px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(8),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: 'transparent',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${theme.palette.primary.light}22 0%, ${theme.palette.secondary.light}22 100%)`,
    zIndex: -1,
  },
  '&:hover': {
    transform: 'translateY(-5px)',
    borderColor: theme.palette.secondary.main,
    '& .upload-icon': {
      animation: `${pulse} 1.5s ease-in-out infinite`,
    },
  },
}));

const SelectedFileBox = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  marginTop: theme.spacing(2),
  borderRadius: theme.shape.borderRadius * 2,
  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
  boxShadow: `0 10px 15px -3px ${theme.palette.primary.main}1a, 0 4px 6px -2px ${theme.palette.primary.main}0d`,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateX(5px)',
    boxShadow: `0 20px 25px -5px ${theme.palette.primary.main}1a, 0 10px 10px -5px ${theme.palette.primary.main}0d`,
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(1.5, 4),
  fontWeight: 600,
  letterSpacing: '0.5px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  '&:hover': {
    transform: 'translateY(-3px) scale(1.02)',
    boxShadow: `0 20px 25px -5px ${theme.palette.primary.main}4d, 0 10px 10px -5px ${theme.palette.primary.main}26`,
  },
}));

const StatsContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: theme.spacing(3),
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4),
}));

const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  borderRadius: theme.shape.borderRadius * 2,
  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
  boxShadow: `0 10px 15px -3px ${theme.palette.primary.main}1a, 0 4px 6px -2px ${theme.palette.primary.main}0d`,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: `0 20px 25px -5px ${theme.palette.primary.main}1a, 0 10px 10px -5px ${theme.palette.primary.main}0d`,
  },
}));

const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(4),
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius * 2,
  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
  boxShadow: `0 10px 15px -3px ${theme.palette.primary.main}1a`,
}));

const ThemeToggle = styled(Switch)(({ theme }) => ({
  width: 62,
  height: 34,
  padding: 7,
  '& .MuiSwitch-switchBase': {
    margin: 1,
    padding: 0,
    transform: 'translateX(6px)',
    '&.Mui-checked': {
      transform: 'translateX(22px)',
      '& .MuiSwitch-thumb:before': {
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
          '#fff',
        )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    backgroundColor: theme.palette.mode === 'dark' ? '#003892' : '#001e3c',
    width: 32,
    height: 32,
    '&:before': {
      content: "''",
      position: 'absolute',
      width: '100%',
      height: '100%',
      left: 0,
      top: 0,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
        '#fff',
      )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
    },
  },
}));

const OptionsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4),
  flexWrap: 'wrap',
  justifyContent: 'center',
}));

const OptionChip = styled(Chip)(({ theme }) => ({
  padding: theme.spacing(2),
  height: 'auto',
  '& .MuiChip-label': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
  },
}));

const SettingsDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: 320,
    padding: theme.spacing(3),
    [theme.breakpoints.down('sm')]: {
      width: '100%',
    },
  },
}));

const AnimatedChip = styled(Chip)(({ theme }) => ({
  padding: theme.spacing(2),
  height: 'auto',
  '& .MuiChip-label': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  transition: 'all 0.3s ease',
  animation: 'fadeIn 0.5s ease-out',
  '&:hover': {
    transform: 'translateY(-2px) scale(1.05)',
    boxShadow: theme.shadows[4],
  },
  '@keyframes fadeIn': {
    from: {
      opacity: 0,
      transform: 'translateY(10px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
}));

const ProcessingOptionItem = styled(ListItem)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    transform: 'translateX(5px)',
  },
}));

const AnimatedContainer = styled(Container)(({ theme }) => ({
  '@keyframes fadeSlideUp': {
    from: {
      opacity: 0,
      transform: 'translateY(20px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  animation: 'fadeSlideUp 0.5s ease-out',
}));

const ProcessingStep = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[4],
  },
}));

const FloatingActionButton = styled(SpeedDial)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(4),
  right: theme.spacing(4),
}));

const DropzoneArea = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  border: `2px dashed ${theme.palette.primary.main}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.primary.dark,
  },
}));

const FileCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const steps = ['Upload PDF', 'Extract Tables', 'Review Results'];

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [processingOptions, setProcessingOptions] = useState({
    detectBorders: true,
    extractHeaders: true,
    autoFormat: true,
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    confidenceThreshold: 80,
    maxThreads: 4,
    tableFormat: 'auto',
    processingMode: 'accurate',
    extractionMethod: 'hybrid',
    headerDetection: 'auto',
    cellMerging: true,
    formatPreservation: true,
    imageExtraction: false,
    ocrEnabled: true,
  });
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [processingSteps, setProcessingSteps] = useState([
    { label: 'Upload Files', completed: false },
    { label: 'Configure Settings', completed: false },
    { label: 'Process Files', completed: false },
    { label: 'View Results', completed: false },
  ]);
  const [showBackdrop, setShowBackdrop] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [stats, setStats] = useState({
    totalProcessed: 0,
    successRate: 0,
    avgProcessingTime: 0,
    totalTables: 0,
  });

  useEffect(() => {
    metrics.processingQueueSize.set(files.length);
  }, [files]);

  useEffect(() => {
    // Update stats when results change
    if (results.length > 0) {
      const successCount = results.filter(r => r.status === 'success').length;
      const totalTables = results.reduce((sum, r) => sum + (r.tablesExtracted || 0), 0);
      const avgTime = results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / results.length;

      setStats({
        totalProcessed: results.length,
        successRate: (successCount / results.length) * 100,
        avgProcessingTime: avgTime,
        totalTables,
      });
    }
  }, [results]);

  useEffect(() => {
    // Update processing steps based on state
    setProcessingSteps(prev => prev.map((step, index) => ({
      ...step,
      completed: index === 0 ? files.length > 0 :
                index === 1 ? settingsOpen :
                index === 2 ? results.length > 0 :
                index === 3 ? results.some(r => r.status === 'success') : false
    })));
  }, [files, settingsOpen, results]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== acceptedFiles.length) {
      setError('Only PDF files are supported');
      return;
    }
    setFiles(prev => [...prev, ...pdfFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessFiles = async () => {
    setProcessing(true);
    setError(null);
    const newResults = [];

    try {
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const extractedTables = await extractTables(pdfDoc);
        
        newResults.push({
          fileName: file.name,
          status: 'success',
          tables: extractedTables,
        });
      }
      setResults(newResults);
      setActiveStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async (result: any) => {
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tables: result.tables }),
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.fileName.replace('.pdf', '')}_tables.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download results');
    }
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    // Here you would typically update your theme context/provider
  };

  const handleOptionToggle = (option: keyof typeof processingOptions) => {
    setProcessingOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const handleSettingsToggle = () => {
    setSettingsOpen(!settingsOpen);
  };

  const handleAdvancedOptionChange = (option: string, value: any) => {
    setAdvancedOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const speedDialActions = [
    { icon: <Save />, name: 'Save Session', action: () => {} },
    { icon: <Share />, name: 'Share Results', action: () => {} },
    { icon: <Print />, name: 'Print Report', action: () => {} },
    { icon: <Download />, name: 'Download All', action: () => {} },
  ];

  const renderProcessingStepper = () => (
    <Stepper 
      activeStep={activeStep} 
      orientation="vertical"
      sx={{ 
        maxWidth: 400,
        mx: 'auto',
        mb: 4,
        '& .MuiStepConnector-line': {
          minHeight: 40,
        },
      }}
    >
      {processingSteps.map((step, index) => (
        <Step key={index}>
          <StepLabel
            optional={
              <Typography variant="caption" color="text.secondary">
                {step.completed ? 'Completed' : 'Pending'}
              </Typography>
            }
            onClick={() => setActiveStep(index)}
            sx={{ cursor: 'pointer' }}
          >
            <Typography variant="subtitle1" fontWeight={500}>
              {step.label}
            </Typography>
          </StepLabel>
          <StepContent>
            <ProcessingStep>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {index === 0 ? 'Drop your PDF files or click to select them' :
                 index === 1 ? 'Configure extraction settings and options' :
                 index === 2 ? 'Process files and extract tables' :
                 'View and analyze extracted data'}
              </Typography>
              {index === activeStep && (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => setActiveStep(prev => Math.min(prev + 1, processingSteps.length - 1))}
                  disabled={!step.completed}
                >
                  Continue
                </Button>
              )}
            </ProcessingStep>
          </StepContent>
        </Step>
      ))}
    </Stepper>
  );

  const renderSelectedFiles = () => (
    <Box mt={6}>
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 3,
          '&:after': {
            content: '""',
            flex: 1,
            height: '1px',
            background: theme.palette.divider,
            marginLeft: theme.spacing(2),
          },
        }}
      >
        Selected Files ({files.length})
      </Typography>
      <Stack spacing={2}>
        {files.map((file, index) => (
          <Zoom in key={index} style={{ transitionDelay: `${index * 100}ms` }}>
            <SelectedFileBox elevation={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Description sx={{ color: 'primary.main', fontSize: 40 }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {file.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Size: {(file.size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" gap={1}>
                <Tooltip title="Preview">
                  <IconButton size="small" color="primary">
                    <Preview />
                  </IconButton>
                </Tooltip>
                <ActionButton
                  startIcon={<DeleteIcon />}
                  onClick={() => handleRemoveFile(index)}
                  color="error"
                  disabled={processing}
                  variant="contained"
                  size="small"
                >
                  Remove
                </ActionButton>
              </Box>
            </SelectedFileBox>
          </Zoom>
        ))}
      </Stack>
      <Box mt={4} display="flex" justifyContent="center">
        <ActionButton
          variant="contained"
          onClick={handleProcessFiles}
          disabled={processing}
          size="large"
          sx={{ 
            minWidth: isMobile ? '100%' : 250,
            py: 2,
          }}
        >
          {processing ? (
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={24} color="inherit" />
              Processing...
            </Box>
          ) : (
            <>Extract Tables</>
          )}
        </ActionButton>
      </Box>
    </Box>
  );

  const renderStats = () => (
    <StatsContainer>
      <StatCard>
        <SpeedIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {stats.totalProcessed}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Files Processed
        </Typography>
      </StatCard>
      <StatCard>
        <InfoIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {stats.successRate.toFixed(1)}%
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Success Rate
        </Typography>
      </StatCard>
      <StatCard>
        <AccessTimeIcon sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {(stats.avgProcessingTime / 1000).toFixed(1)}s
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Avg. Processing Time
        </Typography>
      </StatCard>
      <StatCard>
        <TableChartIcon sx={{ fontSize: 40, color: 'warning.main', mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          {stats.totalTables}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Tables Extracted
        </Typography>
      </StatCard>
    </StatsContainer>
  );

  const renderSettingsDrawer = () => (
    <SettingsDrawer
      anchor="right"
      open={settingsOpen}
      onClose={handleSettingsToggle}
    >
      <Box>
        <Typography variant="h6" gutterBottom>
          Processing Settings
        </Typography>
        <List>
          <ProcessingOptionItem>
            <ListItemText
              primary="Confidence Threshold"
              secondary={`${advancedOptions.confidenceThreshold}%`}
            />
            <Slider
              value={advancedOptions.confidenceThreshold}
              onChange={(_, value) => handleAdvancedOptionChange('confidenceThreshold', value)}
              min={0}
              max={100}
              sx={{ width: 100, ml: 2 }}
            />
          </ProcessingOptionItem>

          <ProcessingOptionItem>
            <ListItemText
              primary="Processing Mode"
              secondary="Balance between speed and accuracy"
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={advancedOptions.processingMode}
                onChange={(e) => handleAdvancedOptionChange('processingMode', e.target.value)}
              >
                <MenuItem value="fast">Fast</MenuItem>
                <MenuItem value="balanced">Balanced</MenuItem>
                <MenuItem value="accurate">Accurate</MenuItem>
              </Select>
            </FormControl>
          </ProcessingOptionItem>

          <ProcessingOptionItem>
            <ListItemText
              primary="Table Format"
              secondary="Output format preference"
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={advancedOptions.tableFormat}
                onChange={(e) => handleAdvancedOptionChange('tableFormat', e.target.value)}
              >
                <MenuItem value="auto">Auto Detect</MenuItem>
                <MenuItem value="simple">Simple</MenuItem>
                <MenuItem value="complex">Complex</MenuItem>
              </Select>
            </FormControl>
          </ProcessingOptionItem>

          <ProcessingOptionItem button onClick={() => toggleSection('extraction')}>
            <ListItemIcon>
              <GridOnIcon />
            </ListItemIcon>
            <ListItemText primary="Extraction Settings" />
            {expandedSections.includes('extraction') ? <ExpandLess /> : <ExpandMore />}
          </ProcessingOptionItem>
          <Collapse in={expandedSections.includes('extraction')} timeout="auto">
            <List component="div" disablePadding>
              <ListItem sx={{ pl: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={advancedOptions.cellMerging}
                      onChange={(e) => handleAdvancedOptionChange('cellMerging', e.target.checked)}
                    />
                  }
                  label="Cell Merging"
                />
              </ListItem>
              <ListItem sx={{ pl: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={advancedOptions.formatPreservation}
                      onChange={(e) => handleAdvancedOptionChange('formatPreservation', e.target.checked)}
                    />
                  }
                  label="Preserve Formatting"
                />
              </ListItem>
            </List>
          </Collapse>

          <ProcessingOptionItem button onClick={() => toggleSection('ocr')}>
            <ListItemIcon>
              <AutoFixHighIcon />
            </ListItemIcon>
            <ListItemText primary="OCR Settings" />
            {expandedSections.includes('ocr') ? <ExpandLess /> : <ExpandMore />}
          </ProcessingOptionItem>
          <Collapse in={expandedSections.includes('ocr')} timeout="auto">
            <List component="div" disablePadding>
              <ListItem sx={{ pl: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={advancedOptions.ocrEnabled}
                      onChange={(e) => handleAdvancedOptionChange('ocrEnabled', e.target.checked)}
                    />
                  }
                  label="Enable OCR"
                />
              </ListItem>
              <ListItem sx={{ pl: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={advancedOptions.imageExtraction}
                      onChange={(e) => handleAdvancedOptionChange('imageExtraction', e.target.checked)}
                    />
                  }
                  label="Extract Images"
                />
              </ListItem>
            </List>
          </Collapse>
        </List>
      </Box>
    </SettingsDrawer>
  );

  return (
    <AnimatedContainer maxWidth="lg">
      <Box py={8}>
        <HeaderContainer>
          <Typography 
            variant="h2" 
            component="h1"
            sx={{ 
              fontWeight: 900,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-1px',
              animation: 'gradient 3s ease infinite',
              backgroundSize: '200% 200%',
              '@keyframes gradient': {
                '0%': { backgroundPosition: '0% 50%' },
                '50%': { backgroundPosition: '100% 50%' },
                '100%': { backgroundPosition: '0% 50%' },
              },
            }}
          >
            PDF Table Extractor
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Tooltip title="Toggle theme">
              <FormControlLabel
                control={<ThemeToggle checked={isDarkMode} onChange={handleThemeToggle} />}
                label=""
              />
            </Tooltip>
            <Tooltip title="Processing settings">
              <IconButton 
                color="primary" 
                onClick={handleSettingsToggle}
                sx={{
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'rotate(180deg)',
                  },
                }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </HeaderContainer>

        <Typography 
          variant="h6" 
          align="center" 
          color="text.secondary"
          sx={{ 
            mb: 4, 
            maxWidth: '600px', 
            mx: 'auto',
            opacity: 0,
            animation: 'fadeIn 0.5s ease-out forwards',
            animationDelay: '0.3s',
            '@keyframes fadeIn': {
              to: { opacity: 1 },
            },
          }}
        >
          Extract tables from your PDF documents quickly and efficiently
        </Typography>

        {renderProcessingStepper()}

        <OptionsContainer>
          <OptionChip
            icon={<BatchPredictionIcon />}
            label="Batch Processing"
            onClick={() => setBatchProcessing(!batchProcessing)}
            color={batchProcessing ? "primary" : "default"}
            variant={batchProcessing ? "filled" : "outlined"}
          />
          {Object.entries(processingOptions).map(([key, value]) => (
            <OptionChip
              key={key}
              icon={<InfoIcon />}
              label={key.replace(/([A-Z])/g, ' $1').trim()}
              onClick={() => handleOptionToggle(key as keyof typeof processingOptions)}
              color={value ? "primary" : "default"}
              variant={value ? "filled" : "outlined"}
            />
          ))}
        </OptionsContainer>

        {stats.totalProcessed > 0 && renderStats()}

        <DropzoneArea 
          {...getRootProps()} 
          elevation={3}
          sx={{ 
            borderColor: isDragActive ? theme.palette.secondary.main : theme.palette.primary.main,
            transform: isDragActive ? 'scale(1.02)' : 'scale(1)',
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon 
            className="upload-icon"
            sx={{ 
              fontSize: 80, 
              color: 'primary.main',
              mb: 3,
              opacity: 0.8,
            }} 
          />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            {isDragActive ? 'Drop your PDFs here' : 'Drop PDF files here or click to upload'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Drag and drop your PDF files here, or click to select files
          </Typography>
        </DropzoneArea>

        {files.length > 0 && renderSelectedFiles()}

        <ResultsDisplay
          isProcessing={processing}
          progress={0}
          results={results}
          onRetry={() => {}}
          onDownload={handleDownload}
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
            sx={{ 
              width: '100%',
              borderRadius: 2,
              boxShadow: theme.shadows[3],
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {renderSettingsDrawer()}

        <FloatingActionButton
          ariaLabel="actions"
          icon={<SpeedDialIcon />}
          direction="up"
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.action}
            />
          ))}
        </FloatingActionButton>

        <Backdrop
          sx={{ 
            color: '#fff',
            zIndex: theme.zIndex.drawer + 1,
            backdropFilter: 'blur(4px)',
          }}
          open={showBackdrop}
          onClick={() => setShowBackdrop(false)}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </Box>
    </AnimatedContainer>
  );
} 
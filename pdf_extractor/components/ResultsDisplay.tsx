import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Paper, Alert, LinearProgress, Fade, Zoom, Table, Grid, Card, CardContent, IconButton, Tooltip, Modal, Button, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, Menu, MenuItem, ListItemIcon, ListItemText, TextField, Chip, Badge, SpeedDial, SpeedDialAction, SpeedDialIcon, Drawer, useMediaQuery, useTheme, Pagination, InputAdornment, Divider, Collapse, Slider, ToggleButton, ToggleButtonGroup, Popover, Stack, Avatar } from '@mui/material';
import { CheckCircle, Error, AccessTime, Download, Refresh, FileDownload, Preview, Close, FilterList, Sort, ViewColumn, MoreVert, Share, SaveAlt, Print, ContentCopy, Search, FilterAlt, AutoGraph, PictureAsPdf, InsertChart, FormatColorFill, Calculate, TableChart, Visibility, VisibilityOff, TrendingUp, CompareArrows, DataUsage, Summarize, PieChart, BarChart, Timeline, BubbleChart } from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';

const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const ResultCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const DataVisContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[4],
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[8],
  },
}));

const ChartContainer = styled(Box)(({ theme }) => ({
  height: 300,
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
}));

const AnimatedTableRow = styled(TableRow)(({ theme }) => ({
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    transform: 'scale(1.01)',
  },
}));

interface ResultsDisplayProps {
  isProcessing: boolean;
  progress: number;
  results: Array<{
    fileName: string;
    status: string;
    message?: string;
    outputPath?: string;
    data?: any;
    processingTime?: number;
    fileSize?: number;
  }>;
  onRetry: (fileName: string) => void;
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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortConfig, setSortConfig] = useState({ field: 'fileName', direction: 'asc' });
  const [filterValue, setFilterValue] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handlePreview = (result: any) => {
    setSelectedResult(result);
    setPreviewOpen(true);
  };

  const handleSort = (field: string) => {
    setSortConfig({
      field,
      direction: sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const filteredResults = results.filter(result =>
    result.fileName.toLowerCase().includes(filterValue.toLowerCase())
  );

  const sortedResults = [...filteredResults].sort((a, b) => {
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const renderProgress = () => (
    <Box sx={{ width: '100%', mb: 4 }}>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 10,
          borderRadius: 5,
          backgroundColor: theme.palette.grey[200],
          '& .MuiLinearProgress-bar': {
            borderRadius: 5,
            backgroundColor: theme.palette.primary.main,
          },
        }}
      />
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
        {Math.round(progress)}% Complete
      </Typography>
    </Box>
  );

  const renderTableView = () => (
    <TableContainer component={Paper} sx={{ mt: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell
              onClick={() => handleSort('fileName')}
              sx={{ cursor: 'pointer', fontWeight: 'bold' }}
            >
              File Name
              {sortConfig.field === 'fileName' && (
                <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
              )}
            </TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Processing Time</TableCell>
            <TableCell>File Size</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedResults.map((result, index) => (
            <AnimatedTableRow key={index}>
              <TableCell>{result.fileName}</TableCell>
              <TableCell>
                <Chip
                  icon={result.status === 'success' ? <CheckCircle /> : <Error />}
                  label={result.status}
                  color={result.status === 'success' ? 'success' : 'error'}
                  size="small"
                />
              </TableCell>
              <TableCell>{formatTime(result.processingTime || 0)}</TableCell>
              <TableCell>{formatFileSize(result.fileSize || 0)}</TableCell>
              <TableCell align="right">
                <Box>
                  {result.status === 'success' && (
                    <>
                      <Tooltip title="Preview">
                        <IconButton size="small" onClick={() => handlePreview(result)}>
                          <Preview />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton size="small" href={result.outputPath} download>
                          <Download />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {result.status === 'error' && (
                    <Tooltip title="Retry">
                      <IconButton size="small" onClick={() => onRetry(result.fileName)}>
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            </AnimatedTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderCardView = () => (
    <Grid container spacing={3} sx={{ mt: 2 }}>
      {sortedResults.map((result, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Zoom in style={{ transitionDelay: `${index * 100}ms` }}>
            <ResultCard>
              <CardContent>
                <Typography variant="h6" noWrap>
                  {result.fileName}
                </Typography>
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Chip
                    icon={result.status === 'success' ? <CheckCircle /> : <Error />}
                    label={result.status}
                    color={result.status === 'success' ? 'success' : 'error'}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Processing Time: {formatTime(result.processingTime || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  File Size: {formatFileSize(result.fileSize || 0)}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  {result.status === 'success' && (
                    <>
                      <Tooltip title="Preview">
                        <IconButton size="small" onClick={() => handlePreview(result)}>
                          <Preview />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton size="small" href={result.outputPath} download>
                          <Download />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {result.status === 'error' && (
                    <Tooltip title="Retry">
                      <IconButton size="small" onClick={() => onRetry(result.fileName)}>
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </CardContent>
            </ResultCard>
          </Zoom>
        </Grid>
      ))}
    </Grid>
  );

  const renderPreviewModal = () => (
    <Modal
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          backgroundColor: 'background.paper',
          borderRadius: 2,
          p: 3,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Preview: {selectedResult?.fileName}</Typography>
          <IconButton onClick={() => setPreviewOpen(false)}>
            <Close />
          </IconButton>
        </Box>
        <Box>
          {/* Add preview content here based on the data structure */}
          <Typography>Preview content will be implemented based on the data structure</Typography>
        </Box>
      </Box>
    </Modal>
  );

  if (!results.length && !isProcessing) {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Results</Typography>
        <Box display="flex" gap={2}>
          <TextField
            size="small"
            placeholder="Filter files..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="table">
              <Tooltip title="Table View">
                <TableChart />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="cards">
              <Tooltip title="Card View">
                <ViewColumn />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {isProcessing && renderProgress()}

      {viewMode === 'table' ? renderTableView() : renderCardView()}

      {renderPreviewModal()}
    </Box>
  );
};

export default ResultsDisplay; 
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [sortConfig, setSortConfig] = useState({ field: '', direction: 'asc' });
  const [filterValue, setFilterValue] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDataVis, setShowDataVis] = useState(false);
  const [chartType, setChartType] = useState<string>('bar');
  const [dataAnalysis, setDataAnalysis] = useState<any>(null);
  const [highlightedColumns, setHighlightedColumns] = useState<string[]>([]);
  const [columnStats, setColumnStats] = useState<any>({});
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'grid'>('table');
  const [showTrends, setShowTrends] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handlePreview = async (result: any) => {
    setSelectedResult(result);
    setPreviewOpen(true);
    if (!result.data) {
      try {
        const response = await fetch(result.outputPath);
        const data = await response.json();
        result.data = data;
        if (data[0]) {
          setSelectedColumns(Object.keys(data[0]));
        }
      } catch (error) {
        console.error('Failed to load Excel preview:', error);
      }
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSort = (field: string) => {
    setSortConfig({
      field,
      direction: sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
    handleMenuClose();
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalTables = results.reduce((sum, r) => sum + (r.data?.tables?.length || 0), 0);
  const avgProcessingTime = results.reduce((sum, r) => sum + (r.data?.processingTime || 0), 0) / (results.length || 1);

  const analyzeData = () => {
    const analysis = {
      totalFiles: results.length,
      successRate: (results.filter(r => r.status === 'success').length / results.length) * 100,
      averageSize: results.reduce((acc, r) => acc + (r.data?.size || 0), 0) / results.length,
      columnTypes: {},
      trends: {},
    };

    results.forEach(result => {
      if (result.data?.columns) {
        result.data.columns.forEach((col: string) => {
          if (!analysis.columnTypes[col]) {
            analysis.columnTypes[col] = {
              numeric: 0,
              categorical: 0,
              total: 0,
            };
          }
          // Analyze column types and calculate statistics
          analysis.columnTypes[col].total++;
          if (typeof result.data[col]?.[0] === 'number') {
            analysis.columnTypes[col].numeric++;
          } else {
            analysis.columnTypes[col].categorical++;
          }
        });
      }
    });

    setDataAnalysis(analysis);
  };

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

  const renderDataVisualization = () => (
    <DataVisContainer>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Data Analysis</Typography>
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={(e, value) => value && setChartType(value)}
          size="small"
        >
          <ToggleButton value="bar">
            <BarChart />
          </ToggleButton>
          <ToggleButton value="pie">
            <PieChart />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ChartContainer>
            {/* Chart visualization would go here */}
            <Typography variant="body2" color="text.secondary" align="center">
              Column Distribution
            </Typography>
          </ChartContainer>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Column Analysis
            </Typography>
            {Object.entries(dataAnalysis?.columnTypes || {}).map(([col, stats]: [string, any]) => (
              <Box key={col} mb={2}>
                <Typography variant="body2" fontWeight={500}>
                  {col}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip 
                    size="small" 
                    label={`${stats.numeric} numeric`} 
                    color="primary" 
                    variant="outlined"
                  />
                  <Chip 
                    size="small" 
                    label={`${stats.categorical} categorical`} 
                    color="secondary" 
                    variant="outlined"
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>
    </DataVisContainer>
  );

  const renderPreviewToolbar = () => (
    <Box 
      display="flex" 
      justifyContent="space-between" 
      alignItems="center" 
      mb={3}
      sx={{
        position: 'sticky',
        top: 0,
        backgroundColor: theme.palette.background.paper,
        zIndex: 1,
        py: 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, value) => value && setViewMode(value)}
          size="small"
        >
          <ToggleButton value="table">
            <TableChart />
          </ToggleButton>
          <ToggleButton value="cards">
            <ViewColumn />
          </ToggleButton>
          <ToggleButton value="grid">
            <GridOnIcon />
          </ToggleButton>
        </ToggleButtonGroup>
        <Button
          startIcon={<FilterList />}
          variant="outlined"
          size="small"
        >
          Filter
        </Button>
        <Button
          startIcon={<Sort />}
          variant="outlined"
          size="small"
        >
          Sort
        </Button>
      </Box>
      <Box display="flex" alignItems="center" gap={2}>
        <Button
          startIcon={<BarChart />}
          variant="contained"
          size="small"
          onClick={() => setShowDataVis(!showDataVis)}
        >
          Analysis
        </Button>
        <IconButton size="small">
          <MoreVert />
        </IconButton>
      </Box>
    </Box>
  );

  const renderPreviewModal = () => (
    <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)}>
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PreviewHeader>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6">
              Excel Preview: {selectedResult?.fileName}
            </Typography>
            <Chip
              size="small"
              label={`${selectedResult?.data?.length - 1 || 0} rows`}
              color="primary"
              variant="outlined"
            />
          </Box>
          <Box display="flex" gap={1}>
            <SpeedDial
              ariaLabel="Excel actions"
              icon={<SpeedDialIcon />}
              direction="left"
              sx={{
                '& .MuiSpeedDial-fab': {
                  width: 40,
                  height: 40,
                  '& .MuiSvgIcon-root': {
                    fontSize: 20,
                  },
                },
              }}
            >
              <SpeedDialAction
                icon={<PictureAsPdf />}
                tooltipTitle="Export as PDF"
                onClick={() => {}}
              />
              <SpeedDialAction
                icon={<InsertChart />}
                tooltipTitle="View Charts"
                onClick={() => {
                  setShowDataVis(true);
                  analyzeData();
                }}
              />
              <SpeedDialAction
                icon={<Share />}
                tooltipTitle="Share"
                onClick={() => {}}
              />
            </SpeedDial>
            <ActionIconButton size="small" onClick={() => setPreviewOpen(false)}>
              <Close />
            </ActionIconButton>
          </Box>
        </PreviewHeader>

        {renderPreviewToolbar()}
        {renderDataVisualization()}
        
        <ExcelPreviewContainer>
          {viewMode === 'table' && (
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {selectedResult?.data[0]?.map((header: string, index: number) => (
                    selectedColumns.includes(header) && (
                      <TableCell 
                        key={index}
                        onClick={() => handleSort(header)}
                        sx={{ 
                          cursor: 'pointer',
                          userSelect: 'none',
                          position: 'sticky',
                          top: 0,
                          backgroundColor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: theme.palette.primary.dark,
                          },
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1}>
                          {header}
                          {sortConfig.field === header && (
                            <Sort sx={{ 
                              fontSize: 16,
                              transform: sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s ease',
                            }} />
                          )}
                        </Box>
                      </TableCell>
                    )
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedResult?.data.slice(1)
                  .filter(row => 
                    row.some(cell => 
                      String(cell).toLowerCase().includes(searchTerm.toLowerCase())
                    )
                  )
                  .map((row: any[], rowIndex: number) => (
                    <AnimatedTableRow 
                      key={rowIndex}
                      sx={{
                        animation: `fadeIn ${0.2 + rowIndex * 0.05}s ease-out`,
                      }}
                    >
                      {row.map((cell: any, cellIndex: number) => (
                        selectedColumns.includes(selectedResult.data[0][cellIndex]) && (
                          <TableCell 
                            key={cellIndex}
                            sx={{
                              position: 'relative',
                              '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                              },
                            }}
                          >
                            {cell}
                            {showTrends && !isNaN(parseFloat(cell)) && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  right: 8,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                }}
                              >
                                <TrendingUp 
                                  sx={{ 
                                    fontSize: 16,
                                    color: parseFloat(cell) > 0 ? 'success.main' : 'error.main',
                                  }} 
                                />
                              </Box>
                            )}
                          </TableCell>
                        )
                      ))}
                    </AnimatedTableRow>
                  ))
                }
              </TableBody>
            </Table>
          )}

          {viewMode === 'cards' && (
            <Grid container spacing={2}>
              {selectedResult?.data.slice(1)
                .filter(row => 
                  row.some(cell => 
                    String(cell).toLowerCase().includes(searchTerm.toLowerCase())
                  )
                )
                .map((row: any[], rowIndex: number) => (
                  <Grid item xs={12} sm={6} md={4} key={rowIndex}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: theme.shadows[8],
                        },
                      }}
                    >
                      <CardContent>
                        {row.map((cell: any, cellIndex: number) => (
                          selectedColumns.includes(selectedResult.data[0][cellIndex]) && (
                            <Box key={cellIndex} mb={1}>
                              <Typography variant="caption" color="text.secondary">
                                {selectedResult.data[0][cellIndex]}
                              </Typography>
                              <Typography variant="body1">{cell}</Typography>
                            </Box>
                          )
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              }
            </Grid>
          )}

          {viewMode === 'grid' && (
            <Grid container spacing={1}>
              {selectedResult?.data.slice(1)
                .filter(row => 
                  row.some(cell => 
                    String(cell).toLowerCase().includes(searchTerm.toLowerCase())
                  )
                )
                .map((row: any[], rowIndex: number) => (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={rowIndex}>
                    <Paper
                      sx={{
                        p: 1,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          zIndex: 1,
                        },
                      }}
                    >
                      {row.slice(0, 3).map((cell: any, cellIndex: number) => (
                        selectedColumns.includes(selectedResult.data[0][cellIndex]) && (
                          <Typography
                            key={cellIndex}
                            variant={cellIndex === 0 ? 'subtitle2' : 'body2'}
                            noWrap
                          >
                            {cell}
                          </Typography>
                        )
                      ))}
                      {row.length > 3 && (
                        <Chip
                          size="small"
                          label={`+${row.length - 3} more`}
                          sx={{ mt: 1, alignSelf: 'flex-start' }}
                        />
                      )}
                    </Paper>
                  </Grid>
                ))
              }
            </Grid>
          )}
        </ExcelPreviewContainer>
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
                      {formatTime(result.data?.processingTime || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatFileSize(result.data?.size || 0)}
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
                            onClick={() => onRetry(result.fileName)}
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
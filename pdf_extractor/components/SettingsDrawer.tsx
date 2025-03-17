import { 
  Drawer, Box, Typography, IconButton, List, ListItem, ListItemText,
  ListItemIcon, Switch, Slider, Select, MenuItem, FormControl,
  InputLabel, Divider, Button, Tooltip, Collapse, Stack, Chip,
  useTheme, useMediaQuery
} from '@mui/material';
import {
  Close, Settings, Speed, TableChart, Tune, FormatAlignLeft,
  GridOn, AutoFixHigh, ExpandMore, ExpandLess, Memory, Timer,
  Storage, ViewColumn, Image, TextFields, Layers, Compare,
  Straighten, Compress, Palette, DataObject
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useState } from 'react';

const DrawerHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  color: theme.palette.common.white,
}));

const SettingSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  '&:not(:last-child)': {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

const OptionItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateX(8px)',
    backgroundColor: theme.palette.action.hover,
  },
}));

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  settings: {
    confidenceThreshold: number;
    maxThreads: number;
    tableFormat: string;
    processingMode: string;
    extractionMethod: string;
    headerDetection: boolean;
    cellMerging: boolean;
    formatPreservation: boolean;
    imageExtraction: boolean;
    ocrEnabled: boolean;
  };
  onSettingChange: (setting: string, value: any) => void;
}

export default function SettingsDrawer({
  open,
  onClose,
  settings,
  onSettingChange,
}: SettingsDrawerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedSections, setExpandedSections] = useState<string[]>(['performance', 'extraction', 'format']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const renderPerformanceSettings = () => (
    <SettingSection>
      <Box 
        display="flex" 
        alignItems="center" 
        mb={3}
        sx={{ cursor: 'pointer' }}
        onClick={() => toggleSection('performance')}
      >
        <Speed color="primary" />
        <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
          Performance Settings
        </Typography>
        {expandedSections.includes('performance') ? <ExpandLess /> : <ExpandMore />}
      </Box>

      <Collapse in={expandedSections.includes('performance')}>
        <Stack spacing={4}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Processing Mode
            </Typography>
            <Select
              fullWidth
              value={settings.processingMode}
              onChange={(e) => onSettingChange('processingMode', e.target.value)}
              size="small"
            >
              <MenuItem value="fast">Fast (Lower Accuracy)</MenuItem>
              <MenuItem value="balanced">Balanced</MenuItem>
              <MenuItem value="accurate">Accurate (Slower)</MenuItem>
            </Select>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Confidence Threshold
            </Typography>
            <Slider
              value={settings.confidenceThreshold}
              onChange={(_, value) => onSettingChange('confidenceThreshold', value)}
              min={0}
              max={100}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: '0%' },
                { value: 50, label: '50%' },
                { value: 100, label: '100%' },
              ]}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Max Processing Threads
            </Typography>
            <Slider
              value={settings.maxThreads}
              onChange={(_, value) => onSettingChange('maxThreads', value)}
              min={1}
              max={8}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        </Stack>
      </Collapse>
    </SettingSection>
  );

  const renderExtractionSettings = () => (
    <SettingSection>
      <Box 
        display="flex" 
        alignItems="center" 
        mb={3}
        sx={{ cursor: 'pointer' }}
        onClick={() => toggleSection('extraction')}
      >
        <TableChart color="primary" />
        <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
          Extraction Settings
        </Typography>
        {expandedSections.includes('extraction') ? <ExpandLess /> : <ExpandMore />}
      </Box>

      <Collapse in={expandedSections.includes('extraction')}>
        <List disablePadding>
          <OptionItem>
            <ListItemIcon>
              <ViewColumn color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Header Detection"
              secondary="Automatically detect and extract table headers"
            />
            <Switch
              checked={settings.headerDetection}
              onChange={(e) => onSettingChange('headerDetection', e.target.checked)}
            />
          </OptionItem>

          <OptionItem>
            <ListItemIcon>
              <Compress color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Cell Merging"
              secondary="Handle merged cells in tables"
            />
            <Switch
              checked={settings.cellMerging}
              onChange={(e) => onSettingChange('cellMerging', e.target.checked)}
            />
          </OptionItem>

          <OptionItem>
            <ListItemIcon>
              <Image color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Image Extraction"
              secondary="Extract images from tables"
            />
            <Switch
              checked={settings.imageExtraction}
              onChange={(e) => onSettingChange('imageExtraction', e.target.checked)}
            />
          </OptionItem>

          <OptionItem>
            <ListItemIcon>
              <TextFields color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="OCR Support"
              secondary="Enable OCR for scanned documents"
            />
            <Switch
              checked={settings.ocrEnabled}
              onChange={(e) => onSettingChange('ocrEnabled', e.target.checked)}
            />
          </OptionItem>
        </List>
      </Collapse>
    </SettingSection>
  );

  const renderFormatSettings = () => (
    <SettingSection>
      <Box 
        display="flex" 
        alignItems="center" 
        mb={3}
        sx={{ cursor: 'pointer' }}
        onClick={() => toggleSection('format')}
      >
        <DataObject color="primary" />
        <Typography variant="h6" sx={{ ml: 2, flex: 1 }}>
          Output Format
        </Typography>
        {expandedSections.includes('format') ? <ExpandLess /> : <ExpandMore />}
      </Box>

      <Collapse in={expandedSections.includes('format')}>
        <Stack spacing={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Table Format</InputLabel>
            <Select
              value={settings.tableFormat}
              onChange={(e) => onSettingChange('tableFormat', e.target.value)}
              label="Table Format"
            >
              <MenuItem value="excel">Excel (.xlsx)</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="html">HTML Table</MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Active Format Options
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip 
                icon={<Palette />}
                label="Preserve Formatting"
                color={settings.formatPreservation ? "primary" : "default"}
                onClick={() => onSettingChange('formatPreservation', !settings.formatPreservation)}
              />
              <Chip 
                icon={<Layers />}
                label="Multiple Sheets"
                color="default"
                variant="outlined"
              />
              <Chip 
                icon={<Compare />}
                label="Data Validation"
                color="default"
                variant="outlined"
              />
            </Stack>
          </Box>
        </Stack>
      </Collapse>
    </SettingSection>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: isMobile ? '100%' : 400,
          maxWidth: '100%',
        },
      }}
    >
      <DrawerHeader>
        <Box display="flex" alignItems="center">
          <Settings sx={{ mr: 2 }} />
          <Typography variant="h6">Processing Settings</Typography>
        </Box>
        <IconButton 
          onClick={onClose}
          sx={{ color: 'inherit' }}
        >
          <Close />
        </IconButton>
      </DrawerHeader>

      {renderPerformanceSettings()}
      {renderExtractionSettings()}
      {renderFormatSettings()}

      <Box p={3}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onClose}
          sx={{
            py: 1.5,
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            '&:hover': {
              background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
            },
          }}
        >
          Apply Settings
        </Button>
      </Box>
    </Drawer>
  );
} 
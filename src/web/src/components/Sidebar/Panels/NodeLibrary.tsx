import React, { useState } from 'react';
import styled from 'styled-components';
import { Text, Box, ScrollArea, Badge } from '@radix-ui/themes';
import { 
  FileTextIcon, 
  MixIcon, 
  GearIcon,
  PlusIcon,
  BarChartIcon,
  CodeIcon,
  GlobeIcon,
  ImageIcon,
  LayersIcon,
  LightningBoltIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  // PlayIcon,
  TimerIcon,
  // UpdateIcon
} from '@radix-ui/react-icons';

const PanelContainer = styled.div`
  margin-bottom: 24px;
`;

// const PanelHeader = styled.div`
//   margin-bottom: 12px;
// `;

const NodeCategory = styled.div`
  margin-bottom: 16px;
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 4px 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
`;

// Add styled component for category name with hover brightness
const CategoryName = styled(Text)`
  transition: color 0.2s ease;

  ${CategoryHeader}:hover & {
    color: var(--gray-12);
  }
`;

const CollapseIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--gray-10);
  transition: transform 0.2s ease;
`;

const NodeItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--gray-3);
  margin-bottom: 4px;
  cursor: grab;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--gray-4);
    transform: translateY(-1px);
  }
  
  &:active {
    cursor: grabbing;
    transform: translateY(0);
  }
`;

const NodeIcon = styled.div.attrs<{ $color: string }>(({ $color }) => ({
  style: { background: $color }
}))`
  width: 16px;
  height: 16px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
`;

const NodeInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const NodeName = styled(Text)`
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-12);
  display: block;
`;

const NodeDescription = styled(Text)`
  font-size: 11px;
  color: var(--gray-11);
  display: block;
  margin-top: 2px;
`;

const nodeCategories = [
  {
    name: 'File I/O',
    icon: <FileTextIcon />,
    color: '#3b82f6',
    nodes: [
      { name: 'Read Excel', description: 'Read data from Excel files' },
      { name: 'Read CSV', description: 'Read data from CSV files' },
      { name: 'Read JSON', description: 'Read data from JSON files' },
      { name: 'Read Parquet', description: 'Read data from Parquet files' },
      { name: 'Write JSON', description: 'Write data to JSON files' },
      { name: 'Write CSV', description: 'Write data to CSV files' },
      { name: 'Write Excel', description: 'Write data to Excel files' },
      { name: 'Write Parquet', description: 'Write data to Parquet files' },
      { name: 'Read Image', description: 'Read image files (PNG, JPG, etc.)' },
      { name: 'Save Image', description: 'Save images to files' },
      { name: 'Read PDF', description: 'Extract text from PDF files' },
      { name: 'Read XML', description: 'Parse XML files' },
      { name: 'Read YAML', description: 'Parse YAML configuration files' },
      { name: 'Write YAML', description: 'Write data to YAML files' },
    ]
  },
  {
    name: 'Data Operations',
    icon: <MixIcon />,
    color: '#f59e42',
    nodes: [
      { name: 'Join Tables', description: 'Join two tables on a key' },
      { name: 'Group By', description: 'Group and aggregate data' },
      { name: 'Filter', description: 'Filter rows by condition' },
      { name: 'Sort', description: 'Sort data by columns' },
      { name: 'Pivot Table', description: 'Create pivot tables' },
      { name: 'Merge Data', description: 'Merge multiple datasets' },
      { name: 'Split Data', description: 'Split dataset into train/test' },
      { name: 'Reshape Data', description: 'Reshape data structure' },
      { name: 'Drop Columns', description: 'Remove columns from dataset' },
      { name: 'Rename Columns', description: 'Rename column headers' },
      { name: 'Add Column', description: 'Add calculated columns' },
      { name: 'Replace Values', description: 'Replace values in columns' },
      { name: 'Handle Missing', description: 'Handle missing values' },
      { name: 'Remove Duplicates', description: 'Remove duplicate rows' },
      { name: 'Sample Data', description: 'Take random sample of data' },
      { name: 'Concatenate', description: 'Combine datasets vertically' },
    ]
  },
  {
    name: 'Math & Statistics',
    icon: <PlusIcon />,
    color: '#a259e6',
    nodes: [
      { name: 'Calculate Mean', description: 'Calculate mean of columns' },
      { name: 'Calculate Sum', description: 'Calculate sum of columns' },
      { name: 'Calculate Median', description: 'Calculate median of columns' },
      { name: 'Calculate Std', description: 'Calculate standard deviation' },
      { name: 'Calculate Variance', description: 'Calculate variance' },
      { name: 'Correlation', description: 'Calculate correlation matrix' },
      { name: 'Regression', description: 'Perform linear regression' },
      { name: 'T-Test', description: 'Perform t-test analysis' },
      { name: 'Chi-Square Test', description: 'Perform chi-square test' },
      { name: 'ANOVA', description: 'Perform ANOVA analysis' },
      { name: 'Z-Score', description: 'Calculate z-scores' },
      { name: 'Percentile', description: 'Calculate percentiles' },
      { name: 'Moving Average', description: 'Calculate moving averages' },
      { name: 'Rolling Statistics', description: 'Calculate rolling statistics' },
      { name: 'Normalize Data', description: 'Normalize data to 0-1 range' },
      { name: 'Standardize Data', description: 'Standardize data (z-score)' },
      { name: 'Min-Max Scale', description: 'Scale data to min-max range' },
    ]
  },
  {
    name: 'Machine Learning',
    icon: <BarChartIcon />,
    color: '#ef4444',
    nodes: [
      { name: 'Train Model', description: 'Train machine learning model' },
      { name: 'Predict', description: 'Make predictions with model' },
      { name: 'Cross Validation', description: 'Perform cross-validation' },
      { name: 'Grid Search', description: 'Hyperparameter tuning' },
      { name: 'Random Forest', description: 'Train random forest model' },
      { name: 'Linear Regression', description: 'Train linear regression' },
      { name: 'Logistic Regression', description: 'Train logistic regression' },
      { name: 'SVM Classifier', description: 'Train SVM classifier' },
      { name: 'K-Means Clustering', description: 'Perform k-means clustering' },
      { name: 'DBSCAN', description: 'Perform DBSCAN clustering' },
      { name: 'PCA', description: 'Principal Component Analysis' },
      { name: 'Feature Selection', description: 'Select important features' },
      { name: 'Model Evaluation', description: 'Evaluate model performance' },
      { name: 'Confusion Matrix', description: 'Generate confusion matrix' },
      { name: 'ROC Curve', description: 'Generate ROC curve' },
      { name: 'Feature Importance', description: 'Get feature importance' },
    ]
  },
  {
    name: 'Data Visualization',
    icon: <BarChartIcon />,
    color: '#8b5cf6',
    nodes: [
      { name: 'Line Plot', description: 'Create line charts' },
      { name: 'Bar Chart', description: 'Create bar charts' },
      { name: 'Scatter Plot', description: 'Create scatter plots' },
      { name: 'Histogram', description: 'Create histograms' },
      { name: 'Box Plot', description: 'Create box plots' },
      { name: 'Heatmap', description: 'Create heatmaps' },
      { name: 'Pie Chart', description: 'Create pie charts' },
      { name: 'Violin Plot', description: 'Create violin plots' },
      { name: '3D Scatter', description: 'Create 3D scatter plots' },
      { name: 'Time Series Plot', description: 'Create time series plots' },
      { name: 'Correlation Plot', description: 'Create correlation plots' },
      { name: 'Distribution Plot', description: 'Create distribution plots' },
      { name: 'Pair Plot', description: 'Create pair plots' },
      { name: 'Save Plot', description: 'Save plots to files' },
      { name: 'Interactive Plot', description: 'Create interactive plots' },
    ]
  },
  {
    name: 'Text Processing',
    icon: <CodeIcon />,
    color: '#06b6d4',
    nodes: [
      { name: 'Text Preprocessing', description: 'Clean and normalize text' },
      { name: 'Tokenize', description: 'Split text into tokens' },
      { name: 'Remove Stopwords', description: 'Remove common stopwords' },
      { name: 'Stemming', description: 'Apply stemming to words' },
      { name: 'Lemmatization', description: 'Apply lemmatization' },
      { name: 'TF-IDF', description: 'Calculate TF-IDF vectors' },
      { name: 'Word Embeddings', description: 'Generate word embeddings' },
      { name: 'Sentiment Analysis', description: 'Analyze text sentiment' },
      { name: 'Named Entity Recognition', description: 'Extract named entities' },
      { name: 'Text Classification', description: 'Classify text documents' },
      { name: 'Text Summarization', description: 'Summarize text documents' },
      { name: 'Language Detection', description: 'Detect text language' },
      { name: 'Text Similarity', description: 'Calculate text similarity' },
      { name: 'Keyword Extraction', description: 'Extract keywords from text' },
    ]
  },
  {
    name: 'Web & API',
    icon: <GlobeIcon />,
    color: '#10b981',
    nodes: [
      { name: 'HTTP Request', description: 'Make HTTP requests' },
      { name: 'API Call', description: 'Call REST API endpoints' },
      { name: 'Web Scraping', description: 'Scrape data from websites' },
      { name: 'JSON Parser', description: 'Parse JSON responses' },
      { name: 'XML Parser', description: 'Parse XML responses' },
      { name: 'HTML Parser', description: 'Parse HTML content' },
      { name: 'Download File', description: 'Download files from URLs' },
      { name: 'Upload File', description: 'Upload files to server' },
      { name: 'WebSocket', description: 'Connect to WebSocket' },
      { name: 'OAuth Authentication', description: 'Handle OAuth flow' },
      { name: 'Rate Limiting', description: 'Implement rate limiting' },
      { name: 'Retry Logic', description: 'Add retry logic to requests' },
    ]
  },
  {
    name: 'Image Processing',
    icon: <ImageIcon />,
    color: '#f97316',
    nodes: [
      { name: 'Resize Image', description: 'Resize images' },
      { name: 'Crop Image', description: 'Crop images' },
      { name: 'Rotate Image', description: 'Rotate images' },
      { name: 'Filter Image', description: 'Apply image filters' },
      { name: 'Convert Format', description: 'Convert image formats' },
      { name: 'Image Enhancement', description: 'Enhance image quality' },
      { name: 'Edge Detection', description: 'Detect edges in images' },
      { name: 'Object Detection', description: 'Detect objects in images' },
      { name: 'Face Recognition', description: 'Recognize faces in images' },
      { name: 'Image Segmentation', description: 'Segment images' },
      { name: 'Color Analysis', description: 'Analyze image colors' },
      { name: 'Image Classification', description: 'Classify images' },
    ]
  },
  {
    name: 'Time Series',
    icon: <TimerIcon />,
    color: '#84cc16',
    nodes: [
      { name: 'Time Series Analysis', description: 'Analyze time series data' },
      { name: 'Seasonal Decomposition', description: 'Decompose seasonal patterns' },
      { name: 'Moving Average', description: 'Calculate moving averages' },
      { name: 'Exponential Smoothing', description: 'Apply exponential smoothing' },
      { name: 'ARIMA Model', description: 'Fit ARIMA model' },
      { name: 'Forecasting', description: 'Forecast future values' },
      { name: 'Trend Analysis', description: 'Analyze trends' },
      { name: 'Seasonality Detection', description: 'Detect seasonality' },
      { name: 'Time Series Plot', description: 'Create time series plots' },
      { name: 'Resample', description: 'Resample time series data' },
      { name: 'Rolling Statistics', description: 'Calculate rolling statistics' },
    ]
  },
  {
    name: 'Database',
    icon: <LayersIcon />,
    color: '#6366f1',
    nodes: [
      { name: 'SQL Query', description: 'Execute SQL queries' },
      { name: 'Read Database', description: 'Read from database' },
      { name: 'Write Database', description: 'Write to database' },
      { name: 'Create Table', description: 'Create database tables' },
      { name: 'Drop Table', description: 'Drop database tables' },
      { name: 'Database Connection', description: 'Connect to database' },
      { name: 'MongoDB Query', description: 'Query MongoDB' },
      { name: 'Redis Operations', description: 'Perform Redis operations' },
      { name: 'Database Migration', description: 'Run database migrations' },
      { name: 'Backup Database', description: 'Backup database' },
      { name: 'Restore Database', description: 'Restore database' },
    ]
  },
  {
    name: 'Automation',
    icon: <LightningBoltIcon />,
    color: '#f59e0b',
    nodes: [
      { name: 'Schedule Task', description: 'Schedule recurring tasks' },
      { name: 'Email Sender', description: 'Send emails' },
      { name: 'File Watcher', description: 'Monitor file changes' },
      { name: 'System Command', description: 'Execute system commands' },
      { name: 'Process Monitor', description: 'Monitor system processes' },
      { name: 'Log Parser', description: 'Parse log files' },
      { name: 'Backup Files', description: 'Backup files automatically' },
      { name: 'Data Sync', description: 'Synchronize data' },
      { name: 'Error Handler', description: 'Handle errors gracefully' },
      { name: 'Notification', description: 'Send notifications' },
      { name: 'Conditional Logic', description: 'Apply conditional logic' },
      { name: 'Loop Control', description: 'Control loop execution' },
    ]
  },
  {
    name: 'Data Quality',
    icon: <MagnifyingGlassIcon />,
    color: '#ec4899',
    nodes: [
      { name: 'Data Validation', description: 'Validate data integrity' },
      { name: 'Data Cleaning', description: 'Clean and normalize data' },
      { name: 'Outlier Detection', description: 'Detect outliers' },
      { name: 'Data Profiling', description: 'Profile data characteristics' },
      { name: 'Quality Report', description: 'Generate quality reports' },
      { name: 'Duplicate Detection', description: 'Detect duplicate records' },
      { name: 'Data Consistency', description: 'Check data consistency' },
      { name: 'Schema Validation', description: 'Validate data schema' },
      { name: 'Data Completeness', description: 'Check data completeness' },
      { name: 'Data Accuracy', description: 'Assess data accuracy' },
      { name: 'Data Timeliness', description: 'Check data timeliness' },
      { name: 'Data Lineage', description: 'Track data lineage' },
    ]
  },
  {
    name: 'Utilities',
    icon: <GearIcon />,
    color: '#6b7280',
    nodes: [
      { name: 'Data Export', description: 'Export to various formats' },
      { name: 'Data Import', description: 'Import from various sources' },
      { name: 'Format Converter', description: 'Convert between formats' },
      { name: 'Data Compression', description: 'Compress data' },
      { name: 'Encryption', description: 'Encrypt sensitive data' },
      { name: 'Decryption', description: 'Decrypt data' },
      { name: 'Hash Generator', description: 'Generate data hashes' },
      { name: 'Random Generator', description: 'Generate random data' },
      { name: 'UUID Generator', description: 'Generate UUIDs' },
      { name: 'Date/Time Utils', description: 'Date and time utilities' },
      { name: 'String Utils', description: 'String manipulation utilities' },
      { name: 'Math Utils', description: 'Mathematical utilities' },
      { name: 'File Utils', description: 'File system utilities' },
      { name: 'Network Utils', description: 'Network utilities' },
      { name: 'System Utils', description: 'System information utilities' },
    ]
  }
];

export default function NodeLibrary() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'operator',
      name: nodeType,
      position: { x: 0, y: 0 }
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleCategory = (categoryName: string) => {
    setActiveCategory(prev => prev === categoryName ? null : categoryName);
  };

  return (
    <PanelContainer>
      
      <ScrollArea style={{ height: 'calc(100vh - 120px)' }}>
        {nodeCategories.map((category) => {
          const isExpanded = activeCategory === category.name;
          return (
            <NodeCategory key={category.name}>
              <CategoryHeader onClick={() => toggleCategory(category.name)}>
                <CollapseIcon>
                  {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                </CollapseIcon>
                <Box style={{ color: category.color }}>
                  {category.icon}
                </Box>
                <CategoryName size="2" weight="medium" color="gray">
                  {category.name}
                </CategoryName>
                <Badge color="gray" variant="soft">
                  {category.nodes.length}
                </Badge>
              </CategoryHeader>
              {isExpanded && category.nodes.map((node) => (
                <NodeItem
                  key={node.name}
                  draggable
                  onDragStart={(e) => handleDragStart(e, node.name)}
                >
                  <NodeIcon $color={category.color}>
                    <PlusIcon />
                  </NodeIcon>
                  <NodeInfo>
                    <NodeName>{node.name}</NodeName>
                    <NodeDescription>{node.description}</NodeDescription>
                  </NodeInfo>
                </NodeItem>
              ))}
            </NodeCategory>
          );
        })}
      </ScrollArea>
    </PanelContainer>
  );
} 
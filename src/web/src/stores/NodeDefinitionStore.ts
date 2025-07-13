import { create } from 'zustand';
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
  TimerIcon,
} from '@radix-ui/react-icons';
import { OpNodeProps, NodeIOProps } from '../components/Node/OperationNode';

export interface NodeDefinition {
  name: string;
  description: string;
  category: string;
  namespace: string;
  inputs: NodeIOProps[];
  outputs: NodeIOProps[];
}

export interface NodeCategory {
  name: string;
  icon: React.ComponentType;
  color: string;
  nodes: Array<{ name: string; description: string }>;
}

interface NodeDefinitionState {
  categories: NodeCategory[];
  getNodeDefinition: (nodeName: string) => NodeDefinition | null;
  getNodesByCategory: (categoryName: string) => NodeDefinition[];
  getAllCategories: () => NodeCategory[];
  getCategoryForNode: (nodeName: string) => string | null;
}

// Mapping from Node Library categories to node namespaces
const CATEGORY_TO_NAMESPACE: Record<string, string> = {
  'File I/O': 'FileIO',
  'Data Operations': 'DataOps',
  'Math & Statistics': 'Math',
  'Machine Learning': 'MachineLearning',
  'Data Visualization': 'DataOps',
  'Text Processing': 'TextProcessing',
  'Web & API': 'WebAPI',
  'Image Processing': 'ImageProcessing',
  'Time Series': 'TimeSeries',
  'Database': 'Database',
  'Automation': 'Automation',
  'Data Quality': 'DataQuality',
  'Utilities': 'Utilities'
};

// Sample input/output data based on node type and category
const generateSamplePorts = (nodeName: string, category: string): { inputs: NodeIOProps[], outputs: NodeIOProps[] } => {
  switch (category) {
    case 'File I/O':
      if (nodeName.startsWith('Read')) {
        return {
          inputs: [{ name: 'filePath', typeId: 'str' }],
          outputs: [
            { name: 'data', typeId: 'list' },
            { name: 'success', typeId: 'bool' }
          ]
        };
      } else if (nodeName.startsWith('Write')) {
        return {
          inputs: [
            { name: 'data', typeId: 'list' },
            { name: 'filePath', typeId: 'str' }
          ],
          outputs: [
            { name: 'success', typeId: 'bool' },
            { name: 'fileSize', typeId: 'int' }
          ]
        };
      }
      break;
      
    case 'Data Operations':
      return {
        inputs: [
          { name: 'data', typeId: 'list' },
          { name: 'config', typeId: 'dict' }
        ],
        outputs: [
          { name: 'result', typeId: 'list' },
          { name: 'count', typeId: 'int' }
        ]
      };
      
    case 'Math & Statistics':
      return {
        inputs: [
          { name: 'values', typeId: 'list' },
          { name: 'axis', typeId: 'int' }
        ],
        outputs: [
          { name: 'result', typeId: 'float' },
          { name: 'stats', typeId: 'dict' }
        ]
      };
      
    case 'Machine Learning':
      if (nodeName.includes('Train')) {
        return {
          inputs: [
            { name: 'X_train', typeId: 'list' },
            { name: 'y_train', typeId: 'list' },
            { name: 'params', typeId: 'dict' }
          ],
          outputs: [
            { name: 'model', typeId: 'dict' },
            { name: 'accuracy', typeId: 'float' }
          ]
        };
      } else if (nodeName.includes('Predict')) {
        return {
          inputs: [
            { name: 'model', typeId: 'dict' },
            { name: 'X_test', typeId: 'list' }
          ],
          outputs: [
            { name: 'predictions', typeId: 'list' },
            { name: 'confidence', typeId: 'list' }
          ]
        };
      }
      break;
      
    case 'Data Visualization':
      return {
        inputs: [
          { name: 'data', typeId: 'list' },
          { name: 'x_col', typeId: 'str' },
          { name: 'y_col', typeId: 'str' }
        ],
        outputs: [
          { name: 'chart', typeId: 'dict' },
          { name: 'saved', typeId: 'bool' }
        ]
      };
      
    case 'Text Processing':
      return {
        inputs: [
          { name: 'text', typeId: 'str' },
          { name: 'options', typeId: 'dict' }
        ],
        outputs: [
          { name: 'processed', typeId: 'str' },
          { name: 'tokens', typeId: 'list' }
        ]
      };
      
    case 'Web & API':
      return {
        inputs: [
          { name: 'url', typeId: 'str' },
          { name: 'headers', typeId: 'dict' }
        ],
        outputs: [
          { name: 'response', typeId: 'dict' },
          { name: 'status', typeId: 'int' }
        ]
      };
      
    case 'Image Processing':
      return {
        inputs: [
          { name: 'image', typeId: 'str' },
          { name: 'params', typeId: 'dict' }
        ],
        outputs: [
          { name: 'result', typeId: 'str' },
          { name: 'metadata', typeId: 'dict' }
        ]
      };
      
    case 'Time Series':
      return {
        inputs: [
          { name: 'timeseries', typeId: 'list' },
          { name: 'window', typeId: 'int' }
        ],
        outputs: [
          { name: 'forecast', typeId: 'list' },
          { name: 'metrics', typeId: 'dict' }
        ]
      };
      
    case 'Database':
      return {
        inputs: [
          { name: 'query', typeId: 'str' },
          { name: 'connection', typeId: 'str' }
        ],
        outputs: [
          { name: 'result', typeId: 'list' },
          { name: 'rowCount', typeId: 'int' }
        ]
      };
      
    case 'Automation':
      return {
        inputs: [
          { name: 'trigger', typeId: 'dict' },
          { name: 'config', typeId: 'dict' }
        ],
        outputs: [
          { name: 'success', typeId: 'bool' },
          { name: 'log', typeId: 'str' }
        ]
      };
      
    case 'Data Quality':
      return {
        inputs: [
          { name: 'data', typeId: 'list' },
          { name: 'rules', typeId: 'dict' }
        ],
        outputs: [
          { name: 'report', typeId: 'dict' },
          { name: 'score', typeId: 'float' }
        ]
      };
      
    default: // Utilities
      return {
        inputs: [
          { name: 'input', typeId: 'str' }
        ],
        outputs: [
          { name: 'output', typeId: 'str' }
        ]
      };
  }
  
  // Default fallback
  return {
    inputs: [{ name: 'input', typeId: 'str' }],
    outputs: [{ name: 'output', typeId: 'str' }]
  };
};

const nodeCategories: NodeCategory[] = [
  {
    name: 'File I/O',
    icon: FileTextIcon,
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
    icon: MixIcon,
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
    icon: PlusIcon,
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
    icon: BarChartIcon,
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
    icon: BarChartIcon,
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
    icon: CodeIcon,
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
    icon: GlobeIcon,
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
    icon: ImageIcon,
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
    icon: TimerIcon,
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
    icon: LayersIcon,
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
    icon: LightningBoltIcon,
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
    icon: MagnifyingGlassIcon,
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
    icon: GearIcon,
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

export const useNodeDefinitionStore = create<NodeDefinitionState>()((set, get) => ({
  categories: nodeCategories,
  
  getNodeDefinition: (nodeName: string): NodeDefinition | null => {
    const { categories } = get();
    
    for (const category of categories) {
      const node = category.nodes.find(n => n.name === nodeName);
      if (node) {
        const namespace = CATEGORY_TO_NAMESPACE[category.name] || 'Utilities';
        const ports = generateSamplePorts(nodeName, category.name);
        
        return {
          name: nodeName,
          description: node.description,
          category: category.name,
          namespace: namespace,
          inputs: ports.inputs,
          outputs: ports.outputs
        };
      }
    }
    
    return null;
  },
  
  getNodesByCategory: (categoryName: string): NodeDefinition[] => {
    const { categories, getNodeDefinition } = get();
    const category = categories.find(c => c.name === categoryName);
    
    if (!category) return [];
    
    return category.nodes
      .map(node => getNodeDefinition(node.name))
      .filter((def): def is NodeDefinition => def !== null);
  },
  
  getAllCategories: (): NodeCategory[] => {
    return get().categories;
  },
  
  getCategoryForNode: (nodeName: string): string | null => {
    const { categories } = get();
    
    for (const category of categories) {
      if (category.nodes.some(n => n.name === nodeName)) {
        return category.name;
      }
    }
    
    return null;
  }
}));
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
  CubeIcon,
} from '@radix-ui/react-icons';
import { OpNodeProps, NodeIOProps } from '../components/Node/OperationNode';

export interface PortDefinition {
  name: string;
  type: string;
  required?: boolean;
  default?: any;
  description?: string;
  multiple?: boolean;
}

export interface NodeDefinition {
  type: string;  // Full type identifier (e.g., "numpy.array")
  namespace: string;
  nodeType: string;
  displayName: string;
  description: string;
  icon?: string;
  color?: string;
  category: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  properties?: Record<string, any>;
}

export interface NodeCategory {
  name: string;
  icon: React.ComponentType;
  color: string;
  nodes: NodeDefinition[];
}

interface NodeDefinitionState {
  categories: NodeCategory[];
  isLoading: boolean;
  error: string | null;
  fetchNodes: () => Promise<void>;
  getNodeDefinition: (nodeType: string) => NodeDefinition | null;
  getNodesByCategory: (categoryName: string) => NodeDefinition[];
  getAllCategories: () => NodeCategory[];
  getCategoryForNode: (nodeType: string) => string | null;
  clearError: () => void;
}

// Icon mapping for categories
const CATEGORY_ICONS: Record<string, React.ComponentType> = {
  'File I/O': FileTextIcon,
  'Input/Output': FileTextIcon,
  'Data Operations': MixIcon,
  'Math & Statistics': PlusIcon,
  'Math': PlusIcon,
  'Machine Learning': BarChartIcon,
  'Data Visualization': BarChartIcon,
  'Text Processing': CodeIcon,
  'Web & API': GlobeIcon,
  'Network': GlobeIcon,
  'Image Processing': ImageIcon,
  'Time Series': TimerIcon,
  'Database': LayersIcon,
  'Automation': LightningBoltIcon,
  'Data Quality': MagnifyingGlassIcon,
  'Utilities': GearIcon,
  'Basic': CubeIcon,
  'Logic': LightningBoltIcon,
  'NumPy': PlusIcon,
  'Pandas': LayersIcon,
  'Torch': BarChartIcon,
  'Custom': GearIcon,
  'Context Manager': GearIcon,
};

// Color mapping for categories
const CATEGORY_COLORS: Record<string, string> = {
  'File I/O': '#3b82f6',
  'Input/Output': '#4CAF50',
  'Data Operations': '#f59e42',
  'Math & Statistics': '#a259e6',
  'Math': '#2196F3',
  'Machine Learning': '#ef4444',
  'Data Visualization': '#8b5cf6',
  'Text Processing': '#06b6d4',
  'Web & API': '#10b981',
  'Network': '#FF9800',
  'Image Processing': '#f97316',
  'Time Series': '#84cc16',
  'Database': '#6366f1',
  'Automation': '#f59e0b',
  'Data Quality': '#ec4899',
  'Utilities': '#6b7280',
  'Basic': '#607D8B',
  'Logic': '#FFC107',
  'NumPy': '#013243',
  'Pandas': '#150954',
  'Torch': '#EE4C2C',
  'Custom': '#9C27B0',
  'Context Manager': '#00BCD4',
};

// Convert API response to internal format
function convertApiNodesToCategories(apiNodes: Record<string, any[]>): NodeCategory[] {
  const categories: NodeCategory[] = [];
  
  for (const [categoryName, nodes] of Object.entries(apiNodes)) {
    const category: NodeCategory = {
      name: categoryName,
      icon: CATEGORY_ICONS[categoryName] || GearIcon,
      color: CATEGORY_COLORS[categoryName] || '#6b7280',
      nodes: nodes.map(node => ({
        type: node.type,
        namespace: node.namespace,
        nodeType: node.nodeType,
        displayName: node.displayName,
        description: node.description,
        icon: node.icon,
        color: node.color,
        category: categoryName,
        inputs: node.inputs || [],
        outputs: node.outputs || [],
        properties: node.properties || {}
      }))
    };
    categories.push(category);
  }
  
  return categories;
}

// Fetch nodes from API
async function fetchNodesFromAPI(): Promise<Record<string, any[]>> {
  try {
    // Try to get the API URL from various sources
    let apiUrl = 'http://localhost:8000';
    
    // Check if we're in VSCode webview
    if (typeof window !== 'undefined' && (window as any).vscode) {
      // In VSCode extension, the backend should be running on localhost
      apiUrl = 'http://localhost:8000';
    }
    
    const response = await fetch(`${apiUrl}/api/nodes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch nodes: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.nodes) {
      return data.nodes;
    } else {
      throw new Error(data.error || 'Failed to fetch nodes');
    }
  } catch (error) {
    console.error('Error fetching nodes from API:', error);
    
    // Return fallback nodes if API is not available
    return getFallbackNodes();
  }
}

// Fallback nodes when API is not available
function getFallbackNodes(): Record<string, any[]> {
  return {
    'Input/Output': [
      {
        type: 'builtin.input',
        namespace: 'builtin',
        nodeType: 'input',
        displayName: 'Input',
        description: 'Graph input node',
        icon: '📥',
        color: '#4CAF50',
        inputs: [],
        outputs: [
          { name: 'value', type: 'any', required: true, description: 'Input value' }
        ]
      },
      {
        type: 'builtin.output',
        namespace: 'builtin',
        nodeType: 'output',
        displayName: 'Output',
        description: 'Graph output node',
        icon: '📤',
        color: '#FF5722',
        inputs: [
          { name: 'value', type: 'any', required: true, description: 'Output value' }
        ],
        outputs: []
      }
    ],
    'Basic': [
      {
        type: 'builtin.constant',
        namespace: 'builtin',
        nodeType: 'constant',
        displayName: 'Constant',
        description: 'Constant value',
        icon: '🔢',
        color: '#607D8B',
        inputs: [],
        outputs: [
          { name: 'value', type: 'any', required: true, description: 'Constant value' }
        ],
        properties: { value: null, type: 'number' }
      },
      {
        type: 'builtin.print',
        namespace: 'builtin',
        nodeType: 'print',
        displayName: 'Print',
        description: 'Print value to console',
        icon: '🖨️',
        color: '#795548',
        inputs: [
          { name: 'value', type: 'any', required: true, description: 'Value to print' }
        ],
        outputs: [
          { name: 'value', type: 'any', required: true, description: 'Pass-through value' }
        ]
      }
    ],
    'Math': [
      {
        type: 'builtin.add',
        namespace: 'builtin',
        nodeType: 'add',
        displayName: 'Add',
        description: 'Add two numbers',
        icon: '➕',
        color: '#2196F3',
        inputs: [
          { name: 'a', type: 'number', required: true, description: 'First number' },
          { name: 'b', type: 'number', required: true, description: 'Second number' }
        ],
        outputs: [
          { name: 'result', type: 'number', required: true, description: 'Sum of a and b' }
        ]
      },
      {
        type: 'builtin.multiply',
        namespace: 'builtin',
        nodeType: 'multiply',
        displayName: 'Multiply',
        description: 'Multiply two numbers',
        icon: '✖️',
        color: '#9C27B0',
        inputs: [
          { name: 'a', type: 'number', required: true, description: 'First number' },
          { name: 'b', type: 'number', required: true, description: 'Second number' }
        ],
        outputs: [
          { name: 'result', type: 'number', required: true, description: 'Product of a and b' }
        ]
      }
    ],
    'Logic': [
      {
        type: 'builtin.if',
        namespace: 'builtin',
        nodeType: 'if',
        displayName: 'If/Else',
        description: 'Conditional branching',
        icon: '🔀',
        color: '#FFC107',
        inputs: [
          { name: 'condition', type: 'boolean', required: true, description: 'Condition to evaluate' },
          { name: 'true_value', type: 'any', required: true, description: 'Value if true' },
          { name: 'false_value', type: 'any', required: true, description: 'Value if false' }
        ],
        outputs: [
          { name: 'result', type: 'any', required: true, description: 'Selected value' }
        ]
      },
      {
        type: 'builtin.compare',
        namespace: 'builtin',
        nodeType: 'compare',
        displayName: 'Compare',
        description: 'Compare two values',
        icon: '⚖️',
        color: '#00BCD4',
        inputs: [
          { name: 'a', type: 'any', required: true, description: 'First value' },
          { name: 'b', type: 'any', required: true, description: 'Second value' },
          { name: 'operator', type: 'string', required: false, default: '==', description: 'Comparison operator' }
        ],
        outputs: [
          { name: 'result', type: 'boolean', required: true, description: 'Comparison result' }
        ],
        properties: { operators: ['==', '!=', '>', '<', '>=', '<='] }
      }
    ]
  };
}

export const useNodeDefinitionStore = create<NodeDefinitionState>()((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,
  
  fetchNodes: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const apiNodes = await fetchNodesFromAPI();
      const categories = convertApiNodesToCategories(apiNodes);
      set({ categories, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch nodes';
      console.error('Error loading nodes:', errorMessage);
      
      // Use fallback nodes
      const fallbackNodes = getFallbackNodes();
      const categories = convertApiNodesToCategories(fallbackNodes);
      
      set({ 
        categories, 
        isLoading: false, 
        error: errorMessage 
      });
    }
  },
  
  getNodeDefinition: (nodeType: string): NodeDefinition | null => {
    const { categories } = get();
    
    for (const category of categories) {
      const node = category.nodes.find(n => n.type === nodeType || n.displayName === nodeType);
      if (node) {
        return node;
      }
    }
    
    return null;
  },
  
  getNodesByCategory: (categoryName: string): NodeDefinition[] => {
    const { categories } = get();
    const category = categories.find(c => c.name === categoryName);
    
    if (!category) return [];
    
    return category.nodes;
  },
  
  getAllCategories: (): NodeCategory[] => {
    return get().categories;
  },
  
  getCategoryForNode: (nodeType: string): string | null => {
    const { categories } = get();
    
    for (const category of categories) {
      if (category.nodes.some(n => n.type === nodeType || n.displayName === nodeType)) {
        return category.name;
      }
    }
    
    return null;
  },
  
  clearError: () => {
    set({ error: null });
  }
}));

// Auto-fetch nodes when store is created
const store = useNodeDefinitionStore.getState();
store.fetchNodes();
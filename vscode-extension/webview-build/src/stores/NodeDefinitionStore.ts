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
  SquareIcon,
  Link1Icon,
  ArrowDownIcon,
  ActivityLogIcon,
  DotIcon,
  LoopIcon,
  EyeOpenIcon,
  BookmarkIcon,
  StackIcon,
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
  // Neural Network Categories
  'Convolutional': SquareIcon,
  'Linear': Link1Icon,
  'Pooling': ArrowDownIcon,
  'Normalization': BarChartIcon,
  'Activation': ActivityLogIcon,
  'Regularization': DotIcon,
  'Recurrent': LoopIcon,
  'Transformer': EyeOpenIcon,
  'Embedding': BookmarkIcon,
  'Container': StackIcon,
};

// Color mapping for categories
const CATEGORY_COLORS: Record<string, string> = {
  'File I/O': '#3b82f6',
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
  // Neural Network Categories
  'Convolutional': '#FF6B6B',     // Red for conv layers
  'Linear': '#4ECDC4',            // Teal for linear layers
  'Pooling': '#96CEB4',           // Green for pooling
  'Normalization': '#F39C12',     // Orange for normalization
  'Activation': '#E74C3C',        // Red for activations
  'Regularization': '#9B59B6',    // Purple for regularization
  'Recurrent': '#3498DB',         // Blue for RNNs
  'Transformer': '#FF6B6B',       // Red for transformers
  'Embedding': '#16A085',         // Teal for embeddings
  'Container': '#7F8C8D',         // Gray for containers
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
    // Check if we're in VSCode webview environment
    if (typeof window !== 'undefined' && (window as any).vscode) {
      console.log('🍜 [NodeStore] VSCode webview detected, using message proxy');
      
      // Use VSCode message passing instead of direct fetch
      return new Promise((resolve, reject) => {
        let timeoutId: number;
        
        // Listen for response
        const handleMessage = (event: MessageEvent) => {
          const message = event.data;
          console.log('🍜 [NodeStore] Received message:', message);
          
          if (message.command === 'nodesResponse') {
            window.removeEventListener('message', handleMessage);
            clearTimeout(timeoutId);
            
            if (message.success && message.data && message.data.nodes) {
              console.log('🍜 [NodeStore] Successfully received nodes:', 
                Object.keys(message.data.nodes).length, 'categories');
              resolve(message.data.nodes);
            } else {
              console.error('🍜 [NodeStore] Failed response:', message);
              reject(new Error(message.error || 'Failed to fetch nodes'));
            }
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        console.log('🍜 [NodeStore] Sending fetchNodes command to extension...');
        // Request nodes from extension
        (window as any).vscode.postMessage({
          command: 'fetchNodes'
        });
        
        // Timeout after 20 seconds (increased for debugging)
        timeoutId = window.setTimeout(() => {
          console.error('🍜 [NodeStore] Request timeout after 20 seconds');
          window.removeEventListener('message', handleMessage);
          reject(new Error('Request timeout after 20 seconds'));
        }, 20000);
      });
    } else {
      // Fallback to direct fetch for non-VSCode environments
      console.log('🍜 [NodeStore] Non-VSCode environment, using direct fetch');
      const apiUrl = 'http://localhost:8000';
      
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
    }
  } catch (error) {
    console.error('Error fetching nodes from API:', error);
    throw error;
  }
}


export const useNodeDefinitionStore = create<NodeDefinitionState>()((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,
  
  fetchNodes: async () => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('🍜 Starting to fetch nodes from API...');
      const apiNodes = await fetchNodesFromAPI();
      console.log('🍜 Successfully fetched nodes:', Object.keys(apiNodes));
      const categories = convertApiNodesToCategories(apiNodes);
      console.log('🍜 Converted to categories:', categories.map(c => `${c.name} (${c.nodes.length})`));
      set({ categories, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch nodes';
      console.error('🍜 Error loading nodes:', errorMessage);
      
      // No fallback - set empty categories and show error
      set({ 
        categories: [], 
        isLoading: false, 
        error: `Server unavailable: ${errorMessage}. Please ensure the Ramen server is running.`
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

// Initialize nodes after a delay to allow VSCode webview to setup
// Also retry if the first attempt fails
let retryCount = 0;
const maxRetries = 3;

const tryFetchNodes = () => {
  const store = useNodeDefinitionStore.getState();
  
  // Check if we already have nodes
  if (store.categories.length > 0) {
    console.log('🍜 Nodes already loaded');
    return;
  }
  
  console.log(`🍜 Attempting to fetch nodes (attempt ${retryCount + 1}/${maxRetries})`);
  
  store.fetchNodes().catch((error) => {
    console.error('🍜 Failed to fetch nodes:', error);
    retryCount++;
    
    if (retryCount < maxRetries) {
      console.log(`🍜 Retrying in ${retryCount * 2} seconds...`);
      setTimeout(tryFetchNodes, retryCount * 2000);
    }
  });
};

// Start after a longer initial delay
setTimeout(tryFetchNodes, 500);
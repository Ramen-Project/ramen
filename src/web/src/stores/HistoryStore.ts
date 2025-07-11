import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

// Delta types for different operations
export interface NodeDelta {
  type: 'add' | 'delete' | 'update';
  nodeId: string;
  node?: Node;
  changes?: Partial<Node>;
}

export interface EdgeDelta {
  type: 'add' | 'delete' | 'update';
  edgeId: string;
  edge?: Edge;
  changes?: Partial<Edge>;
}

export interface HistoryEntry {
  id: string;
  type: 'add' | 'delete' | 'move' | 'edit' | 'connect' | 'disconnect' | 'group' | 'ungroup' | 'initial';
  title: string;
  timestamp: Date;
  description?: string;
  nodeDeltas: NodeDelta[];
  edgeDeltas: EdgeDelta[];
}

interface HistoryState {
  history: HistoryEntry[];
  currentIndex: number;
  maxHistorySize: number;
  
  // Actions
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: () => { nodes: Node[]; edges: Edge[] } | null;
  redo: () => { nodes: Node[]; edges: Edge[] } | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  goToHistory: (index: number) => { nodes: Node[]; edges: Edge[] } | null;
  getCurrentState: () => { nodes: Node[]; edges: Edge[] } | null;
}

// Helper function to apply deltas to a state
const applyDeltas = (
  baseState: { nodes: Node[]; edges: Edge[] },
  nodeDeltas: NodeDelta[] | undefined,
  edgeDeltas: EdgeDelta[] | undefined
): { nodes: Node[]; edges: Edge[] } => {
  let nodes = [...baseState.nodes];
  let edges = [...baseState.edges];

  // Apply node deltas (with null check)
  if (nodeDeltas && Array.isArray(nodeDeltas)) {
    nodeDeltas.forEach(delta => {
      switch (delta.type) {
        case 'add':
          if (delta.node) {
            nodes.push(delta.node);
          }
          break;
        case 'delete':
          nodes = nodes.filter(n => n.id !== delta.nodeId);
          break;
        case 'update':
          if (delta.changes) {
            nodes = nodes.map(n => 
              n.id === delta.nodeId ? { ...n, ...delta.changes } : n
            );
          }
          break;
      }
    });
  }

  // Apply edge deltas (with null check)
  if (edgeDeltas && Array.isArray(edgeDeltas)) {
    edgeDeltas.forEach(delta => {
      switch (delta.type) {
        case 'add':
          if (delta.edge) {
            edges.push(delta.edge);
          }
          break;
        case 'delete':
          edges = edges.filter(e => e.id !== delta.edgeId);
          break;
        case 'update':
          if (delta.changes) {
            edges = edges.map(e => 
              e.id === delta.edgeId ? { ...e, ...delta.changes } : e
            );
          }
          break;
      }
    });
  }

  return { nodes, edges };
};

// Helper function to compute state at a specific index
const computeStateAt = (
  history: HistoryEntry[],
  targetIndex: number
): { nodes: Node[]; edges: Edge[] } => {
  if (targetIndex < 0 || targetIndex >= history.length) {
    return { nodes: [], edges: [] };
  }

  let currentState = { nodes: [], edges: [] };
  
  // Apply all deltas up to and including the target index
  for (let i = 0; i <= targetIndex; i++) {
    const entry = history[i];
    // Handle legacy entries that might not have delta properties
    if (entry.nodeDeltas || entry.edgeDeltas) {
      currentState = applyDeltas(currentState, entry.nodeDeltas, entry.edgeDeltas);
    } else if ('nodes' in entry && 'edges' in entry) {
      // Legacy format - use the full state
      return {
        nodes: (entry as any).nodes || [],
        edges: (entry as any).edges || []
      };
    }
  }
  
  return currentState;
};

export const useHistoryStore = create<HistoryState>((set, get) => {
  // One-time migration check
  const initialState = {
    history: [],
    currentIndex: -1,
    maxHistorySize: 50
  };

  // Check if we need to migrate legacy data from localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('history-store');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.history && parsed.history.length > 0) {
          // Check if any entries need migration
          const needsMigration = parsed.history.some((entry: any) => 
            !entry.nodeDeltas && !entry.edgeDeltas && ('nodes' in entry || 'edges' in entry)
          );
          
          if (needsMigration) {
            console.log('Migrating legacy history entries to delta format...');
            // Clear legacy data
            localStorage.removeItem('history-store');
          } else {
            // Use existing data if it's already in the new format
            initialState.history = parsed.history || [];
            initialState.currentIndex = parsed.currentIndex ?? -1;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load history from localStorage:', error);
    }
  }

  return {
    ...initialState,

    addEntry: (entry) => {
      const { history, currentIndex, maxHistorySize } = get();
      
      // Remove any entries after currentIndex (when we add a new entry after undoing)
      const newHistory = history.slice(0, currentIndex + 1);
      
      // Add the new entry
      const newEntry: HistoryEntry = {
        ...entry,
        id: Date.now().toString(),
        timestamp: new Date()
      };
      
      newHistory.push(newEntry);
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }
      
      set({
        history: newHistory,
        currentIndex: newHistory.length - 1
      });
    },

    undo: () => {
      const { history, currentIndex } = get();
      if (currentIndex <= 0) return null; // Can't undo beyond the first entry
      
      const newIndex = currentIndex - 1;
      set({ currentIndex: newIndex });
      
      return computeStateAt(history, newIndex);
    },

    redo: () => {
      const { history, currentIndex } = get();
      if (currentIndex >= history.length - 1) return null;
      
      const newIndex = currentIndex + 1;
      set({ currentIndex: newIndex });
      
      return computeStateAt(history, newIndex);
    },

    canUndo: () => {
      const { currentIndex, history } = get();
      // Disable undo when at the initial state (index 0) or when no history exists
      return history.length > 0 && currentIndex > 0;
    },

    canRedo: () => {
      const { history, currentIndex } = get();
      return currentIndex < history.length - 1;
    },

    clearHistory: () => {
      set({
        history: [],
        currentIndex: -1
      });
    },

    goToHistory: (index) => {
      const { history } = get();
      if (index < 0 || index >= history.length) return null;
      
      set({ currentIndex: index });
      
      return computeStateAt(history, index);
    },

    getCurrentState: () => {
      const { history, currentIndex } = get();
      if (currentIndex < 0 || currentIndex >= history.length) return null;
      
      return computeStateAt(history, currentIndex);
    }
  };
}); 
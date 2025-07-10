import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

export interface HistoryEntry {
  id: string;
  type: 'add' | 'delete' | 'move' | 'edit' | 'connect' | 'disconnect' | 'group' | 'ungroup';
  title: string;
  timestamp: Date;
  description?: string;
  nodes: Node[];
  edges: Edge[];
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

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  currentIndex: -1,
  maxHistorySize: 50,

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
    if (currentIndex < 0) return null;
    if (currentIndex === 0) {
      set({ currentIndex: -1 });
      return { nodes: [], edges: [] };
    }
    const newIndex = currentIndex - 1;
    set({ currentIndex: newIndex });
    return {
      nodes: history[newIndex].nodes,
      edges: history[newIndex].edges
    };
  },

  redo: () => {
    const { history, currentIndex } = get();
    if (currentIndex >= history.length - 1) return null;
    
    const newIndex = currentIndex + 1;
    set({ currentIndex: newIndex });
    
    return {
      nodes: history[newIndex].nodes,
      edges: history[newIndex].edges
    };
  },

  canUndo: () => {
    const { currentIndex, history } = get();
    // Allow undo if there is at least one entry and currentIndex >= 0
    return history.length > 0 && currentIndex >= 0;
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
    
    return {
      nodes: history[index].nodes,
      edges: history[index].edges
    };
  },

  getCurrentState: () => {
    const { history, currentIndex } = get();
    if (currentIndex < 0 || currentIndex >= history.length) return null;
    
    return {
      nodes: history[currentIndex].nodes,
      edges: history[currentIndex].edges
    };
  }
})); 
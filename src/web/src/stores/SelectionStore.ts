import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Node, Edge } from '@xyflow/react';

interface SelectionState {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  setSelectedNode: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  setSelection: (selection: { node?: Node; edge?: Edge } | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>()(
  devtools(
    (set) => ({
      selectedNode: null,
      selectedEdge: null,
      
      setSelectedNode: (node: Node | null) => 
        set({ selectedNode: node, selectedEdge: null }, false, 'setSelectedNode'),
      
      setSelectedEdge: (edge: Edge | null) => 
        set({ selectedEdge: edge, selectedNode: null }, false, 'setSelectedEdge'),
      
      setSelection: (selection: { node?: Node; edge?: Edge } | null) => {
        if (!selection) {
          set({ selectedNode: null, selectedEdge: null }, false, 'clearSelection');
        } else if (selection.node) {
          set({ selectedNode: selection.node, selectedEdge: null }, false, 'selectNode');
        } else if (selection.edge) {
          set({ selectedEdge: selection.edge, selectedNode: null }, false, 'selectEdge');
        }
      },
      
      clearSelection: () => 
        set({ selectedNode: null, selectedEdge: null }, false, 'clearSelection'),
    }),
    {
      name: 'selection-store'
    }
  )
);
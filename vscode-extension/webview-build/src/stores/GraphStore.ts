import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';
import { nanoid } from 'nanoid';

interface GraphData {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
}

interface GraphState {
  graphs: GraphData[];
  activeGraphId: string | null;
  varRegistries: {[id: string]: {name: string, typeId: string}};
  
  // Graph management
  addGraph: (id: string, name: string) => void;
  removeGraph: (id: string) => void;
  setActiveGraph: (id: string) => void;
  updateGraphData: (id: string, nodes: Node[], edges: Edge[]) => void;
  updateGraphName: (id: string, name: string) => void;
  reorderGraphs: (fromIndex: number, toIndex: number) => void;
  getActiveGraph: () => GraphData | null;
  getGraph: (id: string) => GraphData | null;
  
  // Variable management (keeping existing functionality)
  addVar: (varId: string, name: string, typeId: string) => void;
}

export const useGraphStore = create<GraphState>()((set, get) => {
  const initialGraphId = `graph-${nanoid()}`;
  
  return {
    graphs: [
      { id: initialGraphId, name: 'Graph 1', nodes: [], edges: [] }
    ],
    activeGraphId: initialGraphId,
    varRegistries: {
      '1': {name: 'SampleVar1', typeId: 'bool'}
    },
    
    addGraph: (id: string, name: string) => 
      set((state) => ({
        graphs: [...state.graphs, { id, name, nodes: [], edges: [] }],
        activeGraphId: id
      })),
      
    removeGraph: (id: string) => 
      set((state) => {
        const newGraphs = state.graphs.filter(g => g.id !== id);
        let newActiveId = state.activeGraphId;
        
        // If we're removing the active graph, switch to another
        if (id === state.activeGraphId && newGraphs.length > 0) {
          newActiveId = newGraphs[0].id;
        } else if (newGraphs.length === 0) {
          // Always keep at least one graph
          const fallbackId = `graph-${nanoid()}`;
          newActiveId = fallbackId;
          newGraphs.push({ id: fallbackId, name: 'Graph', nodes: [], edges: [] });
        }
        
        return {
          graphs: newGraphs,
          activeGraphId: newActiveId
        };
      }),
      
    setActiveGraph: (id: string) => 
      set({ activeGraphId: id }),
      
    updateGraphData: (id: string, nodes: Node[], edges: Edge[]) => 
      set((state) => ({
        graphs: state.graphs.map(g => 
          g.id === id ? { ...g, nodes, edges } : g
        )
      })),
      
    updateGraphName: (id: string, name: string) => 
      set((state) => ({
        graphs: state.graphs.map(g => 
          g.id === id ? { ...g, name } : g
        )
      })),
      
    reorderGraphs: (fromIndex: number, toIndex: number) => 
      set((state) => {
        const newGraphs = [...state.graphs];
        const [movedGraph] = newGraphs.splice(fromIndex, 1);
        newGraphs.splice(toIndex, 0, movedGraph);
        return { graphs: newGraphs };
      }),
      
    getActiveGraph: () => {
      const state = get();
      return state.graphs.find(g => g.id === state.activeGraphId) || null;
    },
    
    getGraph: (id: string) => {
      const state = get();
      return state.graphs.find(g => g.id === id) || null;
    },
    
    addVar: (varId: string, name: string, typeId: string) => 
      set((state) => ({varRegistries: {[varId]: {name: name, typeId: typeId}, ...state.varRegistries}})),
  };
});
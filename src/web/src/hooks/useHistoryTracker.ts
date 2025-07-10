import { useEffect, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useHistoryStore } from '../stores/HistoryStore';

interface UseHistoryTrackerProps {
  nodes: Node[];
  edges: Edge[];
  onStateChange?: (nodes: Node[], edges: Edge[]) => void;
}

// Helper to strip UI-only properties from data
function stripUIProps(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const { highlighted, selected, ...rest } = data;
  // Recursively strip from nested objects if needed
  for (const key in rest) {
    if (typeof rest[key] === 'object') {
      rest[key] = stripUIProps(rest[key]);
    }
  }
  return rest;
}

// Helper function to compare nodes for meaningful changes (excluding position and UI-only props)
const compareNodes = (prevNodes: Node[], currNodes: Node[]): boolean => {
  if (prevNodes.length !== currNodes.length) return true;
  for (let i = 0; i < prevNodes.length; i++) {
    const prev = prevNodes[i];
    const curr = currNodes[i];
    if (
      prev.id !== curr.id ||
      prev.type !== curr.type ||
      prev.parentId !== curr.parentId ||
      JSON.stringify(stripUIProps(prev.data)) !== JSON.stringify(stripUIProps(curr.data))
    ) {
      return true;
    }
  }
  return false;
};

// Helper function to compare edges for meaningful changes (excluding UI-only props)
const compareEdges = (prevEdges: Edge[], currEdges: Edge[]): boolean => {
  if (prevEdges.length !== currEdges.length) return true;
  for (let i = 0; i < prevEdges.length; i++) {
    const prev = prevEdges[i];
    const curr = currEdges[i];
    if (
      prev.id !== curr.id ||
      prev.source !== curr.source ||
      prev.target !== curr.target ||
      prev.sourceHandle !== curr.sourceHandle ||
      prev.targetHandle !== curr.targetHandle ||
      JSON.stringify(stripUIProps(prev.data)) !== JSON.stringify(stripUIProps(curr.data))
    ) {
      return true;
    }
  }
  return false;
};

export const useHistoryTracker = ({ nodes, edges, onStateChange }: UseHistoryTrackerProps) => {
  const { addEntry } = useHistoryStore();
  const prevNodesRef = useRef<Node[]>([]);
  const prevEdgesRef = useRef<Edge[]>([]);
  const isInitializedRef = useRef(false);
  const isNavigatingRef = useRef(false);

  // Initialize history with current state
  // Removed initial state history entry
  // useEffect(() => {
  //   if (!isInitializedRef.current && nodes.length > 0) {
  //     addEntry({
  //       type: 'add',
  //       title: 'Initial state',
  //       description: 'Graph loaded',
  //       nodes: [...nodes],
  //       edges: [...edges]
  //     });
  //     isInitializedRef.current = true;
  //   }
  // }, [nodes, edges, addEntry]);

  // Track changes
  useEffect(() => {
    if (!isInitializedRef.current || isNavigatingRef.current) return;

    const prevNodes = prevNodesRef.current;
    const prevEdges = prevEdgesRef.current;

    // Skip if this is the first render
    if (prevNodes.length === 0 && prevEdges.length === 0) {
      prevNodesRef.current = [...nodes];
      prevEdgesRef.current = [...edges];
      return;
    }

    // Detect changes using selective comparison
    const nodesChanged = compareNodes(prevNodes, nodes);
    const edgesChanged = compareEdges(prevEdges, edges);

    if (nodesChanged || edgesChanged) {
      // Determine the type of change
      let changeType: 'add' | 'delete' | 'move' | 'edit' | 'connect' | 'disconnect' | 'group' | 'ungroup' | null = null;
      let title = '';
      let description = '';

      // Node changes
      if (nodesChanged) {
        const addedNodes = nodes.filter(node => !prevNodes.find(prev => prev.id === node.id));
        const removedNodes = prevNodes.filter(node => !nodes.find(curr => curr.id === node.id));

        if (addedNodes.length > 0) {
          changeType = 'add';
          title = `Added ${addedNodes.length} node${addedNodes.length > 1 ? 's' : ''}`;
          description = `Added: ${addedNodes.map(n => n.data?.name || n.id).join(', ')}`;
        } else if (removedNodes.length > 0) {
          changeType = 'delete';
          title = `Deleted ${removedNodes.length} node${removedNodes.length > 1 ? 's' : ''}`;
          description = `Deleted: ${removedNodes.map(n => n.data?.name || n.id).join(', ')}`;
        }
        // Note: We don't track moves here since they're handled by onNodeDragStop
      }

      // Edge changes
      if (edgesChanged && !nodesChanged) {
        const addedEdges = edges.filter(edge => !prevEdges.find(prev => prev.id === edge.id));
        const removedEdges = prevEdges.filter(edge => !edges.find(curr => curr.id === edge.id));

        if (addedEdges.length > 0) {
          changeType = 'connect';
          title = `Connected ${addedEdges.length} edge${addedEdges.length > 1 ? 's' : ''}`;
          description = `Created new connections`;
        } else if (removedEdges.length > 0) {
          changeType = 'disconnect';
          title = `Disconnected ${removedEdges.length} edge${removedEdges.length > 1 ? 's' : ''}`;
          description = `Removed connections`;
        }
      }

      // Only add to history if we have a specific, identifiable change
      if (changeType && title) {
        addEntry({
          type: changeType,
          title,
          description,
          nodes: [...nodes],
          edges: [...edges]
        });
      }

      // Update refs
      prevNodesRef.current = [...nodes];
      prevEdgesRef.current = [...edges];
    }
  }, [nodes, edges, addEntry]);

  // Handle history navigation
  const handleHistoryChange = (newNodes: Node[], newEdges: Edge[]) => {
    isNavigatingRef.current = true;
    
    if (onStateChange) {
      onStateChange(newNodes, newEdges);
    }
    
    // Update refs to prevent tracking this change
    prevNodesRef.current = [...newNodes];
    prevEdgesRef.current = [...newEdges];
    
    // Reset flag after a short delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
  };

  return {
    handleHistoryChange
  };
}; 
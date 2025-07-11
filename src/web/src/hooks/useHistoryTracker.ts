import { useEffect, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useHistoryStore, NodeDelta, EdgeDelta } from '../stores/HistoryStore';

interface UseHistoryTrackerProps {
  nodes: Node[];
  edges: Edge[];
  onStateChange?: (nodes: Node[], edges: Edge[]) => void;
}

// Helper function to strip UI-only properties for comparison
function stripUIProps(data: any): any {
  if (!data) return data;
  const { onUngroup, onAutoResize, ...stripped } = data;
  return stripped;
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

// Helper function to compute deltas between two states
const computeDeltas = (
  prevNodes: Node[],
  currNodes: Node[],
  prevEdges: Edge[],
  currEdges: Edge[]
): { nodeDeltas: NodeDelta[]; edgeDeltas: EdgeDelta[] } => {
  const nodeDeltas: NodeDelta[] = [];
  const edgeDeltas: EdgeDelta[] = [];

  // Node deltas
  const prevNodeMap = new Map(prevNodes.map(n => [n.id, n]));
  const currNodeMap = new Map(currNodes.map(n => [n.id, n]));

  // Find added nodes
  currNodes.forEach(node => {
    if (!prevNodeMap.has(node.id)) {
      nodeDeltas.push({
        type: 'add',
        nodeId: node.id,
        node: node
      });
    }
  });

  // Find deleted nodes
  prevNodes.forEach(node => {
    if (!currNodeMap.has(node.id)) {
      nodeDeltas.push({
        type: 'delete',
        nodeId: node.id
      });
    }
  });

  // Find updated nodes
  currNodes.forEach(node => {
    const prevNode = prevNodeMap.get(node.id);
    if (prevNode && (
      prevNode.type !== node.type ||
      prevNode.parentId !== node.parentId ||
      JSON.stringify(stripUIProps(prevNode.data)) !== JSON.stringify(stripUIProps(node.data))
    )) {
      nodeDeltas.push({
        type: 'update',
        nodeId: node.id,
        changes: {
          type: node.type,
          parentId: node.parentId,
          data: node.data
        }
      });
    }
  });

  // Edge deltas
  const prevEdgeMap = new Map(prevEdges.map(e => [e.id, e]));
  const currEdgeMap = new Map(currEdges.map(e => [e.id, e]));

  // Find added edges
  currEdges.forEach(edge => {
    if (!prevEdgeMap.has(edge.id)) {
      edgeDeltas.push({
        type: 'add',
        edgeId: edge.id,
        edge: edge
      });
    }
  });

  // Find deleted edges
  prevEdges.forEach(edge => {
    if (!currEdgeMap.has(edge.id)) {
      edgeDeltas.push({
        type: 'delete',
        edgeId: edge.id
      });
    }
  });

  // Find updated edges
  currEdges.forEach(edge => {
    const prevEdge = prevEdgeMap.get(edge.id);
    if (prevEdge && (
      prevEdge.source !== edge.source ||
      prevEdge.target !== edge.target ||
      prevEdge.sourceHandle !== edge.sourceHandle ||
      prevEdge.targetHandle !== edge.targetHandle ||
      JSON.stringify(stripUIProps(prevEdge.data)) !== JSON.stringify(stripUIProps(edge.data))
    )) {
      edgeDeltas.push({
        type: 'update',
        edgeId: edge.id,
        changes: {
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          data: edge.data
        }
      });
    }
  });

  return { nodeDeltas, edgeDeltas };
};

export const useHistoryTracker = ({ nodes, edges, onStateChange }: UseHistoryTrackerProps) => {
  const { addEntry } = useHistoryStore();
  const prevNodesRef = useRef<Node[]>([]);
  const prevEdgesRef = useRef<Edge[]>([]);
  const isInitializedRef = useRef(false);
  const isNavigatingRef = useRef(false);

  // Initialize history with current state
  useEffect(() => {
    if (!isInitializedRef.current && nodes.length > 0) {
      // Auto-resize group nodes to fit their child nodes before storing initial state
      const processedNodes = nodes.map(node => {
        if (node.type === 'group') {
          const groupData = node.data as any;
          const childNodes = nodes.filter(n => n.parentId === node.id);
          
          if (childNodes.length > 0) {
            // Calculate the bounds of child nodes
            const childPositions = childNodes.map(child => {
              const childWidth = child.measured?.width || 150;
              const childHeight = child.measured?.height || 100;
              return {
                minX: child.position.x,
                maxX: child.position.x + childWidth,
                minY: child.position.y,
                maxY: child.position.y + childHeight
              };
            });
            
            const minX = Math.min(...childPositions.map(p => p.minX));
            const maxX = Math.max(...childPositions.map(p => p.maxX));
            const minY = Math.min(...childPositions.map(p => p.minY));
            const maxY = Math.max(...childPositions.map(p => p.maxY));
            
            // Add padding
            const padding = 40;
            const newWidth = maxX - minX + padding * 2;
            const newHeight = maxY - minY + padding * 2;
            
            return {
              ...node,
              data: {
                ...groupData,
                width: newWidth,
                height: newHeight,
                hasBeenResized: true
              }
            };
          }
        }
        return node;
      });
      
      // Create initial state deltas (add all nodes and edges)
      const initialNodeDeltas: NodeDelta[] = processedNodes.map(node => ({
        type: 'add',
        nodeId: node.id,
        node: node
      }));
      
      const initialEdgeDeltas: EdgeDelta[] = edges.map(edge => ({
        type: 'add',
        edgeId: edge.id,
        edge: edge
      }));
      
      // Add the initial state as the first history entry
      addEntry({
        type: 'initial',
        title: 'Initial state',
        description: 'Graph loaded',
        nodeDeltas: initialNodeDeltas,
        edgeDeltas: initialEdgeDeltas
      });
      
      isInitializedRef.current = true;
    }
  }, [nodes, edges, addEntry]);

  // Track changes
  useEffect(() => {
    if (isNavigatingRef.current) return;

    const prevNodes = prevNodesRef.current;
    const prevEdges = prevEdgesRef.current;

    // Skip if this is the first render
    if (prevNodes.length === 0 && prevEdges.length === 0) {
      prevNodesRef.current = [...nodes];
      prevEdgesRef.current = [...edges];
      isInitializedRef.current = true;
      return;
    }

    // Detect changes using selective comparison
    const nodesChanged = compareNodes(prevNodes, nodes);
    const edgesChanged = compareEdges(prevEdges, edges);

    if (nodesChanged || edgesChanged) {
      // Compute deltas
      const { nodeDeltas, edgeDeltas } = computeDeltas(prevNodes, nodes, prevEdges, edges);

      // Determine the type of change
      let changeType: 'add' | 'delete' | 'move' | 'edit' | 'connect' | 'disconnect' | 'group' | 'ungroup' | null = null;
      let title = '';
      let description = '';

      // Node changes
      if (nodesChanged) {
        const addedNodes = nodeDeltas.filter(d => d.type === 'add');
        const removedNodes = nodeDeltas.filter(d => d.type === 'delete');

        if (addedNodes.length > 0) {
          changeType = 'add';
          title = `Added ${addedNodes.length} node${addedNodes.length > 1 ? 's' : ''}`;
          description = `Added: ${addedNodes.map(d => d.node?.data?.name || d.nodeId).join(', ')}`;
        } else if (removedNodes.length > 0) {
          changeType = 'delete';
          title = `Deleted ${removedNodes.length} node${removedNodes.length > 1 ? 's' : ''}`;
          description = `Deleted: ${removedNodes.map(d => d.nodeId).join(', ')}`;
        }
        // Note: We don't track moves here since they're handled by onNodeDragStop
      }

      // Edge changes
      if (edgesChanged && !nodesChanged) {
        const addedEdges = edgeDeltas.filter(d => d.type === 'add');
        const removedEdges = edgeDeltas.filter(d => d.type === 'delete');

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
          nodeDeltas,
          edgeDeltas
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
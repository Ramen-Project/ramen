import { useCallback, MouseEvent, useState, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  addEdge,
  SelectionMode,
  useEdgesState,
  useNodesState,
  Node,
  Edge,
  Connection,
  useOnSelectionChange,
  Background,
  BackgroundVariant,
  NodeChange,
  useReactFlow,
  Node as FlowNode,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import './Graph.css';
// import chroma from 'chroma-js'; // Removed as per edit hint

import { ConnectionLine, DefaultEdge } from '../Edges';
import { nodeTypes } from '../Node';
import GroupNode from '../Node/GroupNode';
import PerformanceMonitor from '../PerformanceMonitor';
import { 
  ungroupGroup, 
  autoResizeGroup, 
  createGroup
} from './groupUtils';
import { useHistoryTracker } from '../../hooks/useHistoryTracker';
import { useHistoryStore, NodeDelta, EdgeDelta } from '../../stores/HistoryStore';
import { useSelectionStore } from '../../stores/SelectionStore';
import { useNodeDefinitionStore } from '../../stores/NodeDefinitionStore';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';

import * as Constants from '../../constants';
import { nanoid } from 'nanoid';

// Namespace colors for operator nodes
const NAMESPACE_COLORS: Record<string, string> = {
  FileIO: '#3b82f6',
  DataOps: '#f59e42',
  Math: '#a259e6',
  default: '#bbb'
};




const edgeTypes = {
  default: DefaultEdge
}

// Function to calculate dynamic graph boundary based on node positions
// const calculateGraphBoundary = (nodes: Node[]): [[number, number], [number, number]] => {
//   if (nodes.length === 0) {
//     // Default boundary if no nodes exist
//     return [[-2000, -2000], [2000, 2000]];
//   }

//   // Calculate bounds of all nodes
//   const positions = nodes.map(node => {
//     let width = 150;
//     let height = 100;
    
//     // Get node dimensions
//     if (node.style && typeof node.style.width === 'number') width = node.style.width;
//     else if (node.data && typeof node.data.width === 'number') width = node.data.width;
//     if (node.style && typeof node.style.height === 'number') height = node.style.height;
//     else if (node.data && typeof node.data.height === 'number') height = node.data.height;
    
//     return {
//       x: node.position.x,
//       y: node.position.y,
//       width,
//       height
//     };
//   });

//   const minX = Math.min(...positions.map(p => p.x));
//   const maxX = Math.max(...positions.map(p => p.x + p.width));
//   const minY = Math.min(...positions.map(p => p.y));
//   const maxY = Math.max(...positions.map(p => p.y + p.height));

//   // Add buffer zone from constants
//   const bufferX = Constants.GraphBoundaryBufferX;
//   const bufferY = Constants.GraphBoundaryBufferY;

//   return [
//     [minX - bufferX, minY - bufferY],
//     [maxX + bufferX, maxY + bufferY]
//   ];
// };

const initialNodes: Node<any>[] = [];

const initialEdges: Edge[] = [];

function connectionCheck(connection: Connection | Edge): boolean {
  // Prevent self-connections (node connecting to itself)
  if (connection.source === connection.target) {
    return false;
  }
  
  // TODO: Prevent any variables getter and setter connect directly
  // TODO: Return if there's a caster, after that onConnectEnd should insert the caster in between
  
  return true;
}

interface GraphProps {
  onNodeSelect?: (node: any) => void;
  onUndoRedoHandlers?: (undo: () => void, redo: () => void) => void;
  onGraphDataChange?: (nodes: Node[], edges: Edge[]) => void;
  onSelectionChange?: (selection: { node?: Node; edge?: Edge } | null) => void;
}

export default function Graph({ onNodeSelect, onUndoRedoHandlers, onGraphDataChange, onSelectionChange }: GraphProps) {
  const { setSelection } = useSelectionStore();
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const multiMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getNodes, getEdges, screenToFlowPosition } = useReactFlow();
  const copyBuffer = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [dragType, setDragType] = useState<string | null>(null);
  
  // Performance monitoring
  const {
    metrics,
    startDragSession,
    trackOperation,
    endDragSession,
    measureAsync,
    reset: resetPerformanceMetrics,
    isEnabled: isPerformanceEnabled
  } = usePerformanceMonitor();
  
  // Drag and drop handler
  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    setDragType(nodeType);
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);
  
  // History management
  const { undo, redo, canUndo, canRedo, addEntry, goToHistory } = useHistoryStore();
  
  // Notify parent of graph data changes
  useEffect(() => {
    onGraphDataChange?.(nodes, edges);
  }, [nodes, edges, onGraphDataChange]);
  
  // Helper function to create specific deltas for paste operations
  const createPasteDeltas = (pastedNodes: Node[], pastedEdges: Edge[]) => {
    const nodeDeltas: NodeDelta[] = pastedNodes.map(node => ({
      type: 'add',
      nodeId: node.id,
      node: node
    }));
    
    const edgeDeltas: EdgeDelta[] = pastedEdges.map(edge => ({
      type: 'add',
      edgeId: edge.id,
      edge: edge
    }));
    
    return { nodeDeltas, edgeDeltas };
  };

  // Helper function to create specific deltas for cut operations  
  const createCutDeltas = (cutNodes: Node[], cutEdges: Edge[]) => {
    const nodeDeltas: NodeDelta[] = cutNodes.map(node => ({
      type: 'delete',
      nodeId: node.id,
      node: node
    }));
    
    const edgeDeltas: EdgeDelta[] = cutEdges.map(edge => ({
      type: 'delete',
      edgeId: edge.id,
      edge: edge
    }));
    
    return { nodeDeltas, edgeDeltas };
  };

  // Helper function to animate node positions
  // const animateNodePositions = useCallback((
  //   currentNodes: Node[],
  //   targetNodes: Node[],
  //   setNodes: (nodes: Node[]) => void,
  //   onComplete?: () => void
  // ) => {
  //   const startTime = Date.now();
  //   // const nodeMap = new Map(currentNodes.map(node => [node.id, node])); // REMOVED
  //   // const targetMap = new Map(targetNodes.map(node => [node.id, node])); // REMOVED
    
  //   // Find nodes that need animation (position changes)
  //   const nodesToAnimate = currentNodes.filter(() => {
  //     return false; // Simplified to avoid unused parameter
  //   });

  //   if (nodesToAnimate.length === 0) {
  //     // No animation needed, just update immediately
  //     setNodes(targetNodes);
  //     onComplete?.();
  //     return;
  //   }

  //   // Set animation flag to prevent history tracking during animation
  //   // isAnimatingRef.current = true; // REMOVED

  //   // Create animation frame function
  //   const animate = () => {
  //     const elapsed = Date.now() - startTime;
  //     const progress = Math.min(elapsed / ANIMATION_CONFIG.duration, 1);
      
  //     // Easing function (ease-in-out)
  //     const easedProgress = progress < 0.5 
  //       ? 2 * progress * progress 
  //       : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  //     // Update node positions
  //     const animatedNodes = currentNodes.map(node => {
  //       // const targetNode = targetMap.get(node.id); // REMOVED
  //       if (false) { // REMOVED
  //         return node; // REMOVED
  //       }

  //       return {
  //         ...node,
  //         position: {
  //           x: node.position.x + (node.position.x - node.position.x) * easedProgress, // REMOVED
  //           y: node.position.y + (node.position.y - node.position.y) * easedProgress // REMOVED
  //         }
  //       };
  //     });

  //     setNodes(animatedNodes);

  //     // Continue animation or complete
  //     if (progress < 1) {
  //       requestAnimationFrame(animate);
  //     } else {
  //       // Ensure final positions are exact
  //       setNodes(targetNodes);
  //       // Clear animation flag
  //       // isAnimatingRef.current = false; // REMOVED
  //       onComplete?.();
  //     }
  //   };

  //   // Start animation
  //   requestAnimationFrame(animate);
  // }, []);
  
  // Track changes for history
  const { handleHistoryChange, skipNextChange } = useHistoryTracker({
    nodes,
    edges,
    onStateChange: (newNodes, newEdges) => {
      setNodes(newNodes);
      setEdges(newEdges);
    }
  });

  // Handle undo/redo (no animation)
  const handleUndo = useCallback(() => {
    const result = undo();
    if (result) {
      handleHistoryChange(result.nodes, result.edges);
      // Auto-resize groups after undo
      setTimeout(() => {
        const currentNodes = getNodes();
        const groupNodes = currentNodes.filter(node => node.type === 'group');
        groupNodes.forEach(groupNode => {
          autoResizeGroup(currentNodes, groupNode.id, setNodes);
        });
      }, 0);
    }
  }, [undo, handleHistoryChange, getNodes, setNodes]);

  const handleRedo = useCallback(() => {
    const result = redo();
    if (result) {
      handleHistoryChange(result.nodes, result.edges);
      // Auto-resize groups after redo
      setTimeout(() => {
        const currentNodes = getNodes();
        const groupNodes = currentNodes.filter(node => node.type === 'group');
        groupNodes.forEach(groupNode => {
          autoResizeGroup(currentNodes, groupNode.id, setNodes);
        });
      }, 0);
    }
  }, [redo, handleHistoryChange, getNodes, setNodes]);

  // Expose undo/redo to parent component
  useEffect(() => {
    // @ts-ignore - Adding to window for global access
    window.handleUndo = handleUndo;
    // @ts-ignore
    window.handleRedo = handleRedo;
    // @ts-ignore
    window.canUndo = canUndo;
    // @ts-ignore
    window.canRedo = canRedo;
    
    // Pass handlers to parent component
    if (onUndoRedoHandlers) {
      onUndoRedoHandlers(handleUndo, handleRedo);
    }
  }, [handleUndo, handleRedo, canUndo, canRedo, onUndoRedoHandlers]);

  // Expose handlers globally for direct access
  useEffect(() => {
    // @ts-ignore
    window.graphUndo = handleUndo;
    // @ts-ignore
    window.graphRedo = handleRedo;
    // @ts-ignore
    window.graphGoToHistory = (index: number) => {
      const result = goToHistory(index);
      if (result) {
        handleHistoryChange(result.nodes, result.edges);
        // Auto-resize groups after going to history
        setTimeout(() => {
          const currentNodes = getNodes();
          const groupNodes = currentNodes.filter(node => node.type === 'group');
          groupNodes.forEach(groupNode => {
            autoResizeGroup(currentNodes, groupNode.id, setNodes);
          });
        }, 0);
      }
    };
    // @ts-ignore
    window.graphOnDragStart = onDragStart;
  }, [handleUndo, handleRedo, goToHistory, handleHistoryChange, onDragStart]);

  const onConnect = useCallback(
    (connection: any) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // Helper to generate a unique ID not in the provided set
  function getUniqueId(existingIds: Set<string>): string {
    let id = nanoid();
    while (existingIds.has(id)) {
      id = nanoid();
    }
    return id;
  }

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Check if we have a valid drag type
      if (!dragType) {
        return;
      }

      // Use React Flow's screenToFlowPosition for accurate positioning
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Get node definition from store to ensure consistency with preview
      const { getNodeDefinition } = useNodeDefinitionStore.getState();
      const nodeDefinition = getNodeDefinition(dragType);
      
      if (!nodeDefinition) {
        console.warn(`No node definition found for: ${dragType}`);
        return;
      }

      // Use getUniqueId to avoid collision
      const existingNodeIds = new Set(getNodes().map(n => n.id));
      const newNode = {
        id: getUniqueId(existingNodeIds),
        type: 'operator',
        position,
        data: {
          name: nodeDefinition.name,
          namespace: nodeDefinition.namespace,
          brief: nodeDefinition.description,
          inputs: nodeDefinition.inputs,
          outputs: nodeDefinition.outputs
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setDragType(null); // Reset drag type
    },
    [screenToFlowPosition, dragType, getNodes, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Track when nodes are being dragged over groups
  const onNodeDragStart = useCallback((_event: React.MouseEvent, _node: FlowNode) => {
    // Clear any previous drag-over state
    trackOperation('dragOverStateReset', () => {
      setDragOverGroupId(null);
    });
    
    // Start performance monitoring session
    startDragSession();
    
    if (isPerformanceEnabled) {
      console.log(`Started drag session for node: ${_node.id}`);
    }
  }, [trackOperation, startDragSession, isPerformanceEnabled]);

  const onNodeDrag = useCallback((_event: React.MouseEvent, node: FlowNode) => {
    // Check if node is being dragged over a group
    if (node.type !== 'group') {
      trackOperation('groupDetection', () => {
        const currentNodes = getNodes();
        const groupUnderNode = findGroupUnderNode(node, currentNodes);
        
        if (groupUnderNode && groupUnderNode.id !== node.parentId) {
          setDragOverGroupId(groupUnderNode.id);
        } else {
          setDragOverGroupId(null);
        }
      });
    }
  }, [getNodes, trackOperation]);

  const onMouseEnterEdge = useCallback(
    (_: MouseEvent, edge: Edge) => {
      setEdges((eds) => eds.map((value) => {
        if (value.id !== edge.id) return value;
        return { ...edge, data: { ...edge.data, highlighted: true } };
      }));
    }, [setEdges]
  );

  const onMouseLeaveEdge = useCallback(
    (_: MouseEvent, edge: Edge) => {
      setEdges((eds) => eds.map((value) => {
        if (value.id !== edge.id) return value;
        return { ...edge, data: { ...edge.data, highlighted: false } };
      }))
    }, [setEdges]
  );

  useOnSelectionChange({
    onChange: (args) => {
      const selectedNodeIds = args.nodes.map(node => node.id);
      const selectedEdgeIds = args.edges.map(edge => edge.id);
      
      setSelectedNodeIds(selectedNodeIds);
      setSelectedEdgeIds(selectedEdgeIds);
      
      // Call legacy onNodeSelect for backward compatibility
      if (args.nodes.length > 0) {
        onNodeSelect?.(args.nodes[0]);
      } else {
        onNodeSelect?.(null);
      }
      
      // Update selection store
      if (args.nodes.length > 0) {
        setSelection({ node: args.nodes[0] });
      } else if (args.edges.length > 0) {
        setSelection({ edge: args.edges[0] });
      } else {
        setSelection(null);
      }
      
      // Still call the callback for backward compatibility
      onSelectionChange?.(args.nodes.length > 0 ? { node: args.nodes[0] } : 
                         args.edges.length > 0 ? { edge: args.edges[0] } : null);
    }
  });

  // Enhanced onNodesChange to resize group when nodes are dragged
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    trackOperation('nodesChangeAnalysis', () => {
      // Step 1: Map current parentIds and positions
      const prevNodes = getNodes();
      const prevParentMap: Record<string, string | undefined> = {};
      const prevPositionMap: Record<string, { x: number; y: number }> = {};
      prevNodes.forEach(node => {
        prevParentMap[node.id] = node.parentId;
        prevPositionMap[node.id] = node.position;
      });

      // Step 2: Apply changes
      onNodesChangeBase(changes);

      // Step 3: After a tick (to ensure state is updated), check for changes
      setTimeout(() => {
        trackOperation('groupResizeAnalysis', () => {
          const updatedNodes = getNodes();
          const affectedGroupIds = new Set<string>();
          
          updatedNodes.forEach(node => {
            const prevParent = prevParentMap[node.id];
            const currParent = node.parentId;
            const prevPos = prevPositionMap[node.id];
            
            // Check if node left a group
            if (
              prevParent &&
              prevParent.startsWith('group-') &&
              prevParent !== currParent
            ) {
              affectedGroupIds.add(prevParent);
            }
            
            // Check if node is being dragged within or outside a group (for resizing)
            if (
              currParent &&
              currParent.startsWith('group-') &&
              prevPos &&
              (node.position.x !== prevPos.x || node.position.y !== prevPos.y)
            ) {
              // Always trigger resize when node in group is moved
              affectedGroupIds.add(currParent);
            }
            
            // Check for drag-to-join: node moved from no parent to a group
            if (
              !prevParent &&
              currParent &&
              currParent.startsWith('group-') &&
              node.type !== 'group' // Don't handle group-to-group joins here
            ) {
              // Node joined a group via drag
              console.log(`Node ${node.id} joined group ${currParent}`);
              affectedGroupIds.add(currParent);
            }
          });
          
          // Step 4: Resize all affected groups
          if (affectedGroupIds.size > 0) {
            const nodesNow = getNodes();
            affectedGroupIds.forEach(groupId => {
              trackOperation(`autoResize-${groupId}`, () => {
                autoResizeGroup(nodesNow, groupId, setNodes);
              });
            });
          }
        });
      }, 0);
    });
  }, [onNodesChangeBase, getNodes, setNodes, trackOperation]);

  // Helper to check if a point is inside a group
  function isPointInGroup(point: { x: number; y: number }, groupNode: Node): boolean {
    if (groupNode.type !== 'group') return false;
    
    const groupData = groupNode.data as any;
    const groupWidth = groupData?.width || 300;
    const groupHeight = groupData?.height || 200;
    
    return (
      point.x >= groupNode.position.x &&
      point.x <= groupNode.position.x + groupWidth &&
      point.y >= groupNode.position.y &&
      point.y <= groupNode.position.y + groupHeight
    );
  }

  // Helper to find the group that a node is being dragged over
  function findGroupUnderNode(node: Node, allNodes: Node[]): Node | null {
    const groupNodes = allNodes.filter(n => n.type === 'group');
    
    // Calculate the center point of the node
    const nodeCenter = {
      x: node.position.x + (node.measured?.width || 150) / 2,
      y: node.position.y + (node.measured?.height || 100) / 2
    };
    
    // Find the group that contains this point
    for (const groupNode of groupNodes) {
      if (isPointInGroup(nodeCenter, groupNode)) {
        return groupNode;
      }
    }
    
    return null;
  }

  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: FlowNode) => {
    // Clear drag-over state
    trackOperation('dragOverClear', () => {
      setDragOverGroupId(null);
    });
    
    // Find the previous node position from the previous state
    const prevNode = nodes.find(n => n.id === node.id);
    if (!prevNode) {
      endDragSession();
      return;
    }
    
    const currentNodes = getNodes();
    
    // Check for drag-to-join: if node is not already in a group, check if it's over a group
    if (!node.parentId && node.type !== 'group') {
      let groupUnderNode: Node | null = null;
      trackOperation('dragToJoinCheck', () => {
        groupUnderNode = findGroupUnderNode(node, currentNodes);
      });
      
      if (groupUnderNode) {
        // Node was dragged into a group - join it
        trackOperation('dragToJoinUpdate', () => {
          const updatedNodes = currentNodes.map(n => {
            if (n.id === node.id) {
              return {
                ...n,
                parentId: groupUnderNode!.id,
                // Remove extent restriction to allow dragging outside group for resizing
                // extent: 'parent' as const,
                // Adjust position to be relative to group
                position: {
                  x: n.position.x - groupUnderNode!.position.x,
                  y: n.position.y - groupUnderNode!.position.y
                }
              };
            }
            return n;
          });
          
          setNodes(updatedNodes);
          
          // Auto-resize the group to accommodate the new member
          setTimeout(() => {
            trackOperation('autoResizeAfterJoin', () => {
              autoResizeGroup(updatedNodes, groupUnderNode!.id, setNodes);
            });
          }, 0);
        });
        
        // Skip the normal drag history entry
        endDragSession();
        return; // Skip the normal drag history entry
      }
    }
    
    // Check if this is a group node
    if (node.type === 'group') {
      // Skip history for group moves to avoid duplicate key issues
      // TODO: Implement proper delta tracking for group moves
    } else {
      // Check if this node is part of a multi-selection move
      const isMultiSelection = selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id);
      if (isMultiSelection) {
        if (multiMoveTimeoutRef.current) {
          clearTimeout(multiMoveTimeoutRef.current);
        }
        multiMoveTimeoutRef.current = setTimeout(() => {
          const movedNodes = nodes.filter(n => 
            selectedNodeIds.includes(n.id) && 
            n.type !== 'group' && 
            !n.parentId // Don't include nodes inside groups
          );
          if (movedNodes.length > 1) {
            // Skip history for multi-node moves to avoid duplicate key issues
            // TODO: Implement proper delta tracking for multi-node moves
          }
          multiMoveTimeoutRef.current = null;
        }, 100);
      } else {
        // Skip single node move history to avoid duplicate key issues
        // TODO: Implement proper delta tracking for single node moves
      }
    }
    
    // End performance monitoring session
    endDragSession();
    
    if (isPerformanceEnabled) {
      console.log(`Ended drag session for node: ${node.id}`, metrics);
    }
  }, [addEntry, nodes, edges, selectedNodeIds, getNodes, setNodes, trackOperation, endDragSession, isPerformanceEnabled, metrics]);

  // Toolbar callback functions
  const handleCreateGroup = useCallback(() => {
    if (selectedNodeIds.length > 1) {
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const selectedNodes = currentNodes.filter(n => selectedNodeIds.includes(n.id));
      
      createGroup(currentNodes, currentEdges, selectedNodeIds, setNodes, setEdges);
      
      // Skip history for group creation to avoid duplicate key issues
      // TODO: Implement proper delta tracking for group creation
    }
  }, [selectedNodeIds, getNodes, getEdges, setNodes, setEdges, addEntry]);

  const handleUngroupGroup = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const groupsToUngroup = currentNodes.filter(n => 
      selectedNodeIds.includes(n.id) && n.type === 'group'
    );
    
    groupsToUngroup.forEach(groupNode => {
      const childNodes = currentNodes.filter(n => n.parentId === groupNode.id);
      
      ungroupGroup(currentNodes, currentEdges, groupNode.id, setNodes, setEdges);
      
      // Skip history for group ungrouping to avoid duplicate key issues
      // TODO: Implement proper delta tracking for group ungrouping
    });
  }, [selectedNodeIds, getNodes, getEdges, setNodes, setEdges, addEntry]);

  const handleAutoResizeGroup = useCallback(() => {
    const currentNodes = getNodes();
    selectedNodeIds.forEach(nodeId => {
      const node = currentNodes.find(n => n.id === nodeId);
      if (node?.type === 'group') {
        autoResizeGroup(currentNodes, nodeId, setNodes);
      }
    });
  }, [selectedNodeIds, getNodes, setNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Z: Undo
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        console.log('Ctrl+Z');
        event.preventDefault();
        handleUndo();
      }
      
      // Ctrl+Y: Redo
      if (event.ctrlKey && (event.key === 'y')) {
        console.log('Ctrl+Y');
        event.preventDefault();
        handleRedo();
      }
      
      // G key: Toggle group/ungroup
      if (event.key === 'g' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        console.log('G key');
        event.preventDefault();
        handleToggleGroup();
      }
      
      // Ctrl+R: Auto resize selected group
      if (event.ctrlKey && event.key === 'r') {
        console.log('Ctrl+R');
        event.preventDefault();
        handleAutoResizeGroup();
      }
      // Ctrl+C: Copy selected node(s)
      if (event.ctrlKey && event.key === 'c') {
        console.log('Ctrl+C');
        event.preventDefault();
        if (selectedNodeIds.length === 0) return;
        const currentNodes = getNodes();
        const currentEdges = getEdges();
        // Only copy operator/reference nodes (not groups)
        const nodesToCopy = currentNodes.filter(n => selectedNodeIds.includes(n.id) && n.type !== 'group');
        if (nodesToCopy.length === 0) return;
        // Copy edges between selected nodes
        const nodeIds = new Set(nodesToCopy.map(n => n.id));
        const edgesToCopy = currentEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
        // Deep copy nodes/edges (remove parentId, callbacks, etc.)
        const nodesCopy = nodesToCopy.map(n => ({
          ...JSON.parse(JSON.stringify(n)),
          parentId: undefined,
          selected: false,
        }));
        const edgesCopy = edgesToCopy.map(e => ({ ...JSON.parse(JSON.stringify(e)) }));
        copyBuffer.current = { nodes: nodesCopy, edges: edgesCopy };
      }
      // Ctrl+V: Paste node(s)
      if (event.ctrlKey && event.key === 'v') {
        console.log('Ctrl+V');
        event.preventDefault();
        if (!copyBuffer.current) return;
        const { nodes: nodesToPaste, edges: edgesToPaste } = copyBuffer.current;
        if (!nodesToPaste || nodesToPaste.length === 0) return;
        // Map old IDs to new unique IDs
        const existingNodeIds = new Set(getNodes().map(n => n.id));
        const existingEdgeIds = new Set(getEdges().map(e => e.id));
        const idMap: Record<string, string> = {};
        nodesToPaste.forEach(n => { idMap[n.id] = getUniqueId(existingNodeIds); existingNodeIds.add(idMap[n.id]); });
        // Offset for paste (e.g., 40px right and down)
        const OFFSET = 40;
        // Paste nodes with new IDs and offset positions
        const pastedNodes = nodesToPaste.map(n => ({
          ...n,
          id: idMap[n.id],
          position: { x: n.position.x + OFFSET, y: n.position.y + OFFSET },
          selected: true,
        }));
        // Paste edges with new source/target IDs and unique edge IDs
        const pastedEdges = edgesToPaste.map(e => {
          const newId = getUniqueId(existingEdgeIds);
          existingEdgeIds.add(newId);
          return {
            ...e,
            id: newId,
            source: idMap[e.source],
            target: idMap[e.target],
          };
        });
        // Get current state before updating
        const currentNodes = getNodes();
        const currentEdges = getEdges();
        // Skip the next automatic history tracking to avoid duplicate entries
        skipNextChange();
        // Deselect all, then select new nodes
        setNodes(nds => nds.map(n => ({ ...n, selected: false })).concat(pastedNodes));
        setEdges(eds => eds.concat(pastedEdges));
        setSelectedNodeIds(pastedNodes.map(n => n.id));
        // Add history entry with only the pasted items
        const { nodeDeltas, edgeDeltas } = createPasteDeltas(pastedNodes, pastedEdges);
        addEntry({
          type: 'paste',
          title: `Pasted ${pastedNodes.length} node${pastedNodes.length > 1 ? 's' : ''}`,
          description: `Pasted node(s) at offset`,
          nodeDeltas,
          edgeDeltas
        });
      }
      // Ctrl+X: Cut selected node(s)
      if (event.ctrlKey && event.key === 'x') {
        console.log('Ctrl+X');
        event.preventDefault();
        if (selectedNodeIds.length === 0) return;
        const currentNodes = getNodes();
        const currentEdges = getEdges();
        // Only cut operator/reference nodes (not groups)
        const nodesToCut = currentNodes.filter(n => selectedNodeIds.includes(n.id) && n.type !== 'group');
        if (nodesToCut.length === 0) return;
        // Cut edges between selected nodes
        const nodeIds = new Set(nodesToCut.map(n => n.id));
        const edgesToCut = currentEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
        // Deep copy for buffer
        const nodesCopy = nodesToCut.map(n => ({
          ...JSON.parse(JSON.stringify(n)),
          parentId: undefined,
          selected: false,
        }));
        const edgesCopy = edgesToCut.map(e => ({ ...JSON.parse(JSON.stringify(e)) }));
        copyBuffer.current = { nodes: nodesCopy, edges: edgesCopy };
        // Remove nodes and edges from graph
        setNodes(nds => nds.filter(n => !nodeIds.has(n.id)));
        setEdges(eds => eds.filter(e => !nodeIds.has(e.source) && !nodeIds.has(e.target)));
        setSelectedNodeIds([]);
        // Add history entry for the cut items
        const cutEdges = currentEdges.filter(e => nodeIds.has(e.source) || nodeIds.has(e.target));
        const { nodeDeltas, edgeDeltas } = createCutDeltas(nodesToCut, cutEdges);
        addEntry({
          type: 'cut',
          title: `Cut ${nodesToCut.length} node${nodesToCut.length > 1 ? 's' : ''}`,
          description: `Cut node(s) from graph`,
          nodeDeltas,
          edgeDeltas
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCreateGroup, handleUngroupGroup, handleAutoResizeGroup, selectedNodeIds, getNodes, getEdges, setNodes, setEdges, addEntry]);

  // Toggle group/ungroup with G key
  const handleToggleGroup = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const selectedNodes = currentNodes.filter(n => selectedNodeIds.includes(n.id));
    
    // Check if any selected nodes are groups
    const selectedGroups = selectedNodes.filter(n => n.type === 'group');
    const selectedRegularNodes = selectedNodes.filter(n => n.type !== 'group');
    
    if (selectedGroups.length > 0) {
      // First, ungroup all selected groups
      selectedGroups.forEach(groupNode => {
        const childNodes = currentNodes.filter(n => n.parentId === groupNode.id);
        ungroupGroup(currentNodes, currentEdges, groupNode.id, setNodes, setEdges);
        
        // Skip history entry to avoid duplicate key issues
      });
      
      // After ungrouping, check if we have 2+ regular nodes to group
      setTimeout(() => {
        const updatedNodes = getNodes();
        const remainingRegularNodes = updatedNodes.filter(n => 
          selectedRegularNodes.some(selected => selected.id === n.id) && 
          n.type !== 'group' && 
          !n.parentId
        );
        
        if (remainingRegularNodes.length >= 2) {
          const remainingIds = remainingRegularNodes.map(n => n.id);
          createGroup(updatedNodes, getEdges(), remainingIds, setNodes, setEdges);
          
          // Skip history entry to avoid duplicate key issues
        }
      }, 0);
    } else if (selectedRegularNodes.length >= 2) {
      // No groups selected, just create group with regular nodes
      createGroup(currentNodes, currentEdges, selectedNodeIds, setNodes, setEdges);
      
      // Skip history entry to avoid duplicate key issues
    }
    // If only 1 regular node selected, do nothing
  }, [selectedNodeIds, getNodes, getEdges, setNodes, setEdges, addEntry]);

  // Update group node callbacks
  const updateGroupCallbacks = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    
    const updatedNodes = currentNodes.map(node => {
      if (node.type === 'group') {
        return {
          ...node,
          data: {
            ...node.data,
            onUngroup: () => {
              const childNodes = currentNodes.filter(n => n.parentId === node.id);
              ungroupGroup(currentNodes, currentEdges, node.id, setNodes, setEdges);
              
              // Skip history entry to avoid duplicate key issues
            },
            onAutoResize: () => {
              autoResizeGroup(currentNodes, node.id, setNodes);
              
              // Skip history entry to avoid duplicate key issues
            }
          }
        };
      }
      return node;
    });
    
    setNodes(updatedNodes);
  }, [getNodes, getEdges, setNodes, setEdges, addEntry]);

  // Update callbacks when nodes or edges change
  useEffect(() => {
    updateGroupCallbacks();
  }, [nodes.length, edges.length, updateGroupCallbacks]);

  // Auto-resize all groups whenever nodes change
  useEffect(() => {
    const currentNodes = getNodes();
    const groupNodes = currentNodes.filter(node => node.type === 'group');
    
    if (groupNodes.length > 0) {
      groupNodes.forEach(groupNode => {
        autoResizeGroup(currentNodes, groupNode.id, setNodes);
      });
    }
  }, [nodes, getNodes, setNodes]);

  // Create nodeTypes with drag-over state for groups
  const nodeTypesWithDragOver = useMemo(() => ({
    ...nodeTypes,
    group: (props: any) => <GroupNode {...props} dragOverGroupId={dragOverGroupId} />
  }), [dragOverGroupId]);

  // Create a memoized function for node colors that has access to the current nodes
  const getNodeColorWithNodes = useMemo(() => {
    return (node: Node): string => {
      // Handle nodes inside groups (they have a parentId)
      if (node.parentId) {
        // If selected, show the node's namespace color
        if (node.selected) {
          if (node.type === 'operator') {
            const namespace = (node.data as any)?.namespace || 'default';
            return NAMESPACE_COLORS[namespace] || NAMESPACE_COLORS.default;
          }
          // Default color for other node types
          return '#ff6b6b';
        }
        
        // If not selected, show dark color for contrast with group
        const parentGroup = nodes.find(n => n.id === node.parentId);
        if (parentGroup && parentGroup.type === 'group') {
          return '#333333';
        }
        // Fallback for nodes with invalid parentId
        return '#999999';
      }
      
      // Return grey for unselected nodes, colored for selected nodes
      if (node.selected) {
        if (node.type === 'group') {
          // Use the group's backgroundColor property
          return (node.data as any)?.backgroundColor || 'rgb(0, 145, 255)';
        } else if (node.type === 'operator') {
          // Use namespace-based color for operator nodes
          const namespace = (node.data as any)?.namespace || 'default';
          return NAMESPACE_COLORS[namespace] || NAMESPACE_COLORS.default;
        }
        // Default color for other node types
        return '#ff6b6b';
      } else {
        // Return grey for unselected nodes
        return '#999999';
      }
    };
  }, [nodes]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <PerformanceMonitor
        metrics={metrics}
        isEnabled={isPerformanceEnabled}
        onReset={resetPerformanceMetrics}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypesWithDragOver}
        edgeTypes={edgeTypes}

        // Behavior settings
        fitView
        zoomOnDoubleClick={false}
        selectionOnDrag
        minZoom={Constants.GraphMinZoom}
        maxZoom={Constants.GraphMaxZoom}
        // Removed translateExtent and nodeExtent to remove boundary limit
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
        proOptions={{ hideAttribution: true }}
        connectionLineComponent={ConnectionLine}
        onlyRenderVisibleElements={true}
        deleteKeyCode={'Delete'}

        // Callbacks
        isValidConnection={connectionCheck}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeMouseEnter={onMouseEnterEdge}
        onEdgeMouseLeave={onMouseLeaveEdge}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(event, node) => {
          // Manually trigger selection
          setNodes(nodes => nodes.map(n => ({
            ...n,
            selected: n.id === node.id
          })));
          // Also manually trigger the store update as fallback
          setSelection({ node });
        }}
        onEdgeClick={(event, edge) => {
          // Manually trigger edge selection
          setEdges(edges => edges.map(e => ({
            ...e,
            selected: e.id === edge.id
          })));
          setNodes(nodes => nodes.map(n => ({
            ...n,
            selected: false
          })));
        }}
        onPaneClick={() => {
          // Clear all selections
          setNodes(nodes => nodes.map(n => ({
            ...n,
            selected: false
          })));
          setEdges(edges => edges.map(e => ({
            ...e,
            selected: false
          })));
        }}
      >
        <Background color='#c7c7c7' variant={BackgroundVariant.Dots} size={5} gap={Constants.DotsGap} />
      </ReactFlow>
      
    </div>
  );
}
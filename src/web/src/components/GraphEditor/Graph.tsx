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
  MiniMap,
  Node as FlowNode,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import './Graph.css';
import chroma from 'chroma-js';

import { ConnectionLine, DefaultEdge } from '../Edges';
import { nodeTypes } from '../Node';
import GroupNode from '../Node/GroupNode';
import { 
  ungroupGroup, 
  autoResizeGroup, 
  createGroup
} from './groupUtils';
import { useHistoryTracker } from '../../hooks/useHistoryTracker';
import { useHistoryStore, NodeDelta, EdgeDelta } from '../../stores/HistoryStore';

import * as Constants from '../../constants';

// Namespace colors for operator nodes
const NAMESPACE_COLORS: Record<string, string> = {
  FileIO: '#3b82f6',
  DataOps: '#f59e42',
  Math: '#a259e6',
  default: '#bbb'
};

// Animation configuration
const ANIMATION_CONFIG = {
  duration: 400, // milliseconds - longer animation
  easing: 'ease-in-out'
};




const edgeTypes = {
  default: DefaultEdge
}

// Function to calculate dynamic graph boundary based on node positions
const calculateGraphBoundary = (nodes: Node[]): [[number, number], [number, number]] => {
  if (nodes.length === 0) {
    // Default boundary if no nodes exist
    return [[-2000, -2000], [2000, 2000]];
  }

  // Calculate bounds of all nodes
  const positions = nodes.map(node => {
    let width = 150;
    let height = 100;
    
    // Get node dimensions
    if (node.style && typeof node.style.width === 'number') width = node.style.width;
    else if (node.data && typeof node.data.width === 'number') width = node.data.width;
    if (node.style && typeof node.style.height === 'number') height = node.style.height;
    else if (node.data && typeof node.data.height === 'number') height = node.data.height;
    
    return {
      x: node.position.x,
      y: node.position.y,
      width,
      height
    };
  });

  const minX = Math.min(...positions.map(p => p.x));
  const maxX = Math.max(...positions.map(p => p.x + p.width));
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y + p.height));

  // Add buffer zone from constants
  const bufferX = Constants.GraphBoundaryBufferX;
  const bufferY = Constants.GraphBoundaryBufferY;

  return [
    [minX - bufferX, minY - bufferY],
    [maxX + bufferX, maxY + bufferY]
  ];
};

const initialNodes: Node<any>[] = [
  // Example group node
  {
    id: 'group-1',
    type: 'group',
    position: { x: 50, y: 50 },
    draggable: true,
    selectable: true,
    data: {
      label: 'Data Processing Group',
      width: 400,
      height: 250,
      backgroundColor: 'rgb(0, 145, 255)',
      childCount: 2,
      isExpanded: true,
      hasBeenResized: true,
      onUngroup: () => console.log('Ungroup group-1'),
      onAutoResize: () => console.log('Auto resize group-1')
    },
    style: { width: 400, height: 250 }
  },
  {
    id: '1',
    type: 'operator',
    position: { x: 100, y: 100 },
    parentId: 'group-1',
    data: {
      name: 'Read Excel',
      namespace: 'FileIO',
      brief: 'Reads data from an Excel file and outputs sheets as tables.',
      inputs: [
        { name: 'filePath', typeId: 'str' }
      ],
      outputs: [
        { name: 'tables', typeId: 'list' },
        { name: 'sheetNames', typeId: 'list' },
        { name: 'rowCount', typeId: 'int' },
        { name: 'error', typeId: 'exception' }
      ]
    },
  },
  {
    id: '2',
    type: 'operator',
    position: { x: 350, y: 100 },
    parentId: 'group-1',
    data: {
      name: 'Join Tables',
      namespace: 'DataOps',
      brief: 'Joins two tables on a specified key.',
      inputs: [
        { name: 'leftTable', typeId: 'list' },
        { name: 'rightTable', typeId: 'list' },
        { name: 'key', typeId: 'str' }
      ],
      outputs: [
        { name: 'joinedTable', typeId: 'list' },
        { name: 'matchCount', typeId: 'int' },
        { name: 'unmatchedLeft', typeId: 'int' },
        { name: 'unmatchedRight', typeId: 'int' }
      ]
    },
  },
  {
    id: '3',
    type: 'operator',
    position: { x: 700, y: 130 },
    data: {
      name: 'Group By',
      namespace: 'DataOps',
      brief: 'Groups rows by a specified column and applies aggregation.',
      inputs: [
        { name: 'table', typeId: 'list' },
        { name: 'groupBy', typeId: 'str' },
        { name: 'aggFunc', typeId: 'str' }
      ],
      outputs: [
        { name: 'groupedTable', typeId: 'list' },
        { name: 'groupCount', typeId: 'int' },
        { name: 'summary', typeId: 'dict' },
        { name: 'stats', typeId: 'dict' }
      ]
    },
  },
  {
    id: '4',
    type: 'operator',
    position: { x: 1050, y: 130 },
    data: {
      name: 'Write JSON',
      namespace: 'FileIO',
      brief: 'Writes a table to a JSON file.',
      inputs: [
        { name: 'table', typeId: 'list' },
        { name: 'filePath', typeId: 'str' }
      ],
      outputs: [
        { name: 'success', typeId: 'bool' },
        { name: 'bytesWritten', typeId: 'int' },
        { name: 'fileSize', typeId: 'int' },
        { name: 'error', typeId: 'exception' }
      ]
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', sourceHandle: 'output0', targetHandle: 'input0' },
  { id: 'e2-3', source: '2', target: '3', sourceHandle: 'output0', targetHandle: 'input0' },
  { id: 'e3-4', source: '3', target: '4', sourceHandle: 'output0', targetHandle: 'input0' },
];

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
}

export default function Graph({ onNodeSelect, onUndoRedoHandlers }: GraphProps) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const multiMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getNodes, getEdges } = useReactFlow();
  
  // History management
  const { undo, redo, canUndo, canRedo, addEntry, goToHistory } = useHistoryStore();
  
  // Helper function to convert current state to deltas for manual history entries
  const createStateDeltas = (nodes: Node[], edges: Edge[]) => {
    const nodeDeltas: NodeDelta[] = nodes.map(node => ({
      type: 'add',
      nodeId: node.id,
      node: node
    }));
    
    const edgeDeltas: EdgeDelta[] = edges.map(edge => ({
      type: 'add',
      edgeId: edge.id,
      edge: edge
    }));
    
    return { nodeDeltas, edgeDeltas };
  };

  // Helper function to animate node positions
  const animateNodePositions = useCallback((
    currentNodes: Node[],
    targetNodes: Node[],
    setNodes: (nodes: Node[]) => void,
    onComplete?: () => void
  ) => {
    const startTime = Date.now();
    const nodeMap = new Map(currentNodes.map(node => [node.id, node]));
    const targetMap = new Map(targetNodes.map(node => [node.id, node]));
    
    // Find nodes that need animation (position changes)
    const nodesToAnimate = currentNodes.filter(node => {
      const targetNode = targetMap.get(node.id);
      return targetNode && (
        node.position.x !== targetNode.position.x ||
        node.position.y !== targetNode.position.y
      );
    });

    if (nodesToAnimate.length === 0) {
      // No animation needed, just update immediately
      setNodes(targetNodes);
      onComplete?.();
      return;
    }

    // Set animation flag to prevent history tracking during animation
    // isAnimatingRef.current = true; // REMOVED

    // Create animation frame function
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / ANIMATION_CONFIG.duration, 1);
      
      // Easing function (ease-in-out)
      const easedProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Update node positions
      const animatedNodes = currentNodes.map(node => {
        const targetNode = targetMap.get(node.id);
        if (!targetNode) return node;

        const startPos = node.position;
        const endPos = targetNode.position;
        
        // Only animate if position changed
        if (startPos.x === endPos.x && startPos.y === endPos.y) {
          return targetNode; // Use target node directly for non-position changes
        }

        return {
          ...targetNode,
          position: {
            x: startPos.x + (endPos.x - startPos.x) * easedProgress,
            y: startPos.y + (endPos.y - startPos.y) * easedProgress
          }
        };
      });

      setNodes(animatedNodes);

      // Continue animation or complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure final positions are exact
        setNodes(targetNodes);
        // Clear animation flag
        // isAnimatingRef.current = false; // REMOVED
        onComplete?.();
      }
    };

    // Start animation
    requestAnimationFrame(animate);
  }, []);
  
  // Track changes for history
  const { handleHistoryChange } = useHistoryTracker({
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
  }, [handleUndo, handleRedo, goToHistory, handleHistoryChange]);

  const onConnect = useCallback(
    (connection: any) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;

      const parsedData = JSON.parse(data);
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      const newNode = {
        id: `${Date.now()}`,
        type: parsedData.type,
        position,
        data: {
          name: parsedData.name,
          namespace: 'DataOps',
          brief: `A ${parsedData.name} operation`,
          inputs: [
            { name: 'input', typeId: 'any' }
          ],
          outputs: [
            { name: 'output', typeId: 'any' }
          ]
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Track when nodes are being dragged over groups
  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: FlowNode) => {
    // Clear any previous drag-over state
    setDragOverGroupId(null);
  }, []);

  const onNodeDrag = useCallback((_event: React.MouseEvent, node: FlowNode) => {
    // Check if node is being dragged over a group
    if (node.type !== 'group') {
      const currentNodes = getNodes();
      const groupUnderNode = findGroupUnderNode(node, currentNodes);
      
      if (groupUnderNode && groupUnderNode.id !== node.parentId) {
        setDragOverGroupId(groupUnderNode.id);
      } else {
        setDragOverGroupId(null);
      }
    }
  }, [getNodes]);

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
      const selectedIds = args.nodes.map(node => node.id);
      setSelectedNodeIds(selectedIds);
      
      // Call onNodeSelect with the first selected node (or null if none selected)
      if (args.nodes.length > 0) {
        onNodeSelect?.(args.nodes[0]);
        console.log(`Selected ${selectedIds}`)
      } else {
        onNodeSelect?.(null);
        console.log(`Unselected`)
      }
    }
  });

  // Enhanced onNodesChange to resize group when nodes are dragged
  const onNodesChange = useCallback((changes: NodeChange[]) => {
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
          autoResizeGroup(nodesNow, groupId, setNodes);
        });
      }
    }, 0);
  }, [onNodesChangeBase, getNodes, setNodes]);

  // Helper to calculate Euclidean distance
  function getDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

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
    setDragOverGroupId(null);
    
    // Find the previous node position from the previous state
    const prevNode = nodes.find(n => n.id === node.id);
    if (!prevNode) return;
    
    const currentNodes = getNodes();
    
    // Check for drag-to-join: if node is not already in a group, check if it's over a group
    if (!node.parentId && node.type !== 'group') {
      const groupUnderNode = findGroupUnderNode(node, currentNodes);
      
      if (groupUnderNode) {
        // Node was dragged into a group - join it
        const updatedNodes = currentNodes.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              parentId: groupUnderNode.id,
              // Remove extent restriction to allow dragging outside group for resizing
              // extent: 'parent' as const,
              // Adjust position to be relative to group
              position: {
                x: n.position.x - groupUnderNode.position.x,
                y: n.position.y - groupUnderNode.position.y
              }
            };
          }
          return n;
        });
        
        setNodes(updatedNodes);
        
        // Auto-resize the group to accommodate the new member
        setTimeout(() => {
          autoResizeGroup(updatedNodes, groupUnderNode.id, setNodes);
        }, 0);
        
        // Add history entry for join
        const { nodeDeltas, edgeDeltas } = createStateDeltas(currentNodes, edges);
        addEntry({
          type: 'group',
          title: `Joined node '${node.data?.name || node.id}' to group`,
          description: `Node joined '${groupUnderNode.data?.label || groupUnderNode.id}' group`,
          nodeDeltas,
          edgeDeltas
        });
        
        return; // Skip the normal drag history entry
      }
    }
    
    // Check if this is a group node
    if (node.type === 'group') {
      // Get all child nodes of this group
      const childNodes = nodes.filter(n => n.parentId === node.id);
      const { nodeDeltas, edgeDeltas } = createStateDeltas(nodes, edges);
      addEntry({
        type: 'move',
        title: `Moved group '${node.data?.label || node.id}'`,
        description: `Group moved with ${childNodes.length} child node${childNodes.length !== 1 ? 's' : ''}`,
        nodeDeltas,
        edgeDeltas
      });
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
            const { nodeDeltas, edgeDeltas } = createStateDeltas(nodes, edges);
            addEntry({
              type: 'move',
              title: `Moved ${movedNodes.length} nodes`,
              description: `Moved: ${movedNodes.map(n => n.data?.name || n.id).join(', ')}`,
              nodeDeltas,
              edgeDeltas
            });
          }
          multiMoveTimeoutRef.current = null;
        }, 100);
      } else {
        // Single node move
        if (node.parentId) {
          const parentGroup = nodes.find(n => n.id === node.parentId);
          const { nodeDeltas, edgeDeltas } = createStateDeltas(nodes, edges);
          addEntry({
            type: 'move',
            title: `Moved node '${node.data?.name || node.id}' within group`,
            description: `Node moved within '${parentGroup?.data?.label || parentGroup?.id}' group`,
            nodeDeltas,
            edgeDeltas
          });
        } else {
          const { nodeDeltas, edgeDeltas } = createStateDeltas(nodes, edges);
          addEntry({
            type: 'move',
            title: `Moved node '${node.data?.name || node.id}'`,
            description: `Node moved to (${node.position.x}, ${node.position.y})`,
            nodeDeltas,
            edgeDeltas
          });
        }
      }
    }
  }, [addEntry, nodes, edges, selectedNodeIds, getNodes, setNodes]);

  // Toolbar callback functions
  const handleCreateGroup = useCallback(() => {
    if (selectedNodeIds.length > 1) {
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const selectedNodes = currentNodes.filter(n => selectedNodeIds.includes(n.id));
      
      createGroup(currentNodes, currentEdges, selectedNodeIds, setNodes, setEdges);
      
      // Add history entry for group creation
      const { nodeDeltas, edgeDeltas } = createStateDeltas(currentNodes, currentEdges);
      addEntry({
        type: 'group',
        title: `Created group with ${selectedNodes.length} nodes`,
        description: `Grouped: ${selectedNodes.map(n => n.data?.name || n.id).join(', ')}`,
        nodeDeltas,
        edgeDeltas
      });
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
      
      // Add history entry for group ungrouping
      const { nodeDeltas, edgeDeltas } = createStateDeltas(currentNodes, currentEdges);
      addEntry({
        type: 'ungroup',
        title: `Ungrouped '${groupNode.data?.label || groupNode.id}'`,
        description: `Released ${childNodes.length} node${childNodes.length !== 1 ? 's' : ''} from group`,
        nodeDeltas,
        edgeDeltas
      });
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
        event.preventDefault();
        handleUndo();
      }
      
      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if (event.ctrlKey && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        handleRedo();
      }
      
      // G key: Toggle group/ungroup
      if (event.key === 'g' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        handleToggleGroup();
      }
      
      // Ctrl+G: Create group (existing behavior)
      if (event.ctrlKey && event.key === 'g') {
        event.preventDefault();
        handleCreateGroup();
      }
      
      // Ctrl+U: Ungroup selected group
      if (event.ctrlKey && event.key === 'u') {
        event.preventDefault();
        handleUngroupGroup();
      }
      
      // Ctrl+R: Auto resize selected group
      if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        handleAutoResizeGroup();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCreateGroup, handleUngroupGroup, handleAutoResizeGroup]);

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
        
        // Add history entry for group ungrouping
        const { nodeDeltas, edgeDeltas } = createStateDeltas(currentNodes, currentEdges);
        addEntry({
          type: 'ungroup',
          title: `Ungrouped '${groupNode.data?.label || groupNode.id}'`,
          description: `Released ${childNodes.length} node${childNodes.length !== 1 ? 's' : ''} from group`,
          nodeDeltas,
          edgeDeltas
        });
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
          
          // Add history entry for new group creation
          const { nodeDeltas, edgeDeltas } = createStateDeltas(updatedNodes, getEdges());
          addEntry({
            type: 'group',
            title: `Created group with ${remainingRegularNodes.length} nodes`,
            description: `Grouped: ${remainingRegularNodes.map(n => n.data?.name || n.id).join(', ')}`,
            nodeDeltas,
            edgeDeltas
          });
        }
      }, 0);
    } else if (selectedRegularNodes.length >= 2) {
      // No groups selected, just create group with regular nodes
      createGroup(currentNodes, currentEdges, selectedNodeIds, setNodes, setEdges);
      
      // Add history entry for group creation
      const { nodeDeltas, edgeDeltas } = createStateDeltas(currentNodes, currentEdges);
      addEntry({
        type: 'group',
        title: `Created group with ${selectedRegularNodes.length} nodes`,
        description: `Grouped: ${selectedRegularNodes.map(n => n.data?.name || n.id).join(', ')}`,
        nodeDeltas,
        edgeDeltas
      });
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
              
              // Add history entry for group ungrouping
              const { nodeDeltas, edgeDeltas } = createStateDeltas(currentNodes, currentEdges);
              addEntry({
                type: 'ungroup',
                title: `Ungrouped '${node.data?.label || node.id}'`,
                description: `Released ${childNodes.length} node${childNodes.length !== 1 ? 's' : ''} from group`,
                nodeDeltas,
                edgeDeltas
              });
            },
            onAutoResize: () => {
              autoResizeGroup(currentNodes, node.id, setNodes);
              
              // Add history entry for group resize
              const { nodeDeltas, edgeDeltas } = createStateDeltas(currentNodes, currentEdges);
              addEntry({
                type: 'edit',
                title: `Resized group '${node.data?.label || node.id}'`,
                description: 'Group automatically resized to fit content',
                nodeDeltas,
                edgeDeltas
              });
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

  const dynamicBoundary = useMemo(() => calculateGraphBoundary(nodes), [nodes]);

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
      >
        <Background color='#c7c7c7' variant={BackgroundVariant.Dots} size={5} gap={Constants.DotsGap} />
        <MiniMap
          style={{
            // background: 'rgba(10, 10, 10, 0.64)',
            border: '1px solid #222',
            borderRadius: '4px'
          }}
          nodeColor={getNodeColorWithNodes}
          nodeStrokeColor={(node) => {
            if (node.selected) {
              return '#ff0000';
            }
            return '#999999';
          }}
          
          bgColor='rgba(10, 10, 10, 0.3)'
          maskColor='rgba(10, 10, 10, 0.4)'
          nodeStrokeWidth={1}
          pannable
        />
      </ReactFlow>
    </div>
  );
}
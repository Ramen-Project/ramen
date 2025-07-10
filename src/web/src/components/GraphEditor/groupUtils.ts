import { Node, Edge } from '@xyflow/react';

export interface GroupNode extends Node {
  data: {
    label: string;
    width?: number;
    height?: number;
    backgroundColor?: string;
    childCount?: number;
    onUngroup?: () => void;
    onRename?: (newLabel: string) => void;
    onResize?: (width: number, height: number) => void;
    onAutoResize?: () => void;
  };
}

// Get all nodes inside a group
export const getGroupNodes = (nodes: Node[], groupId: string): Node[] => {
  return nodes.filter(node => node.parentId === groupId);
};

// Get all edges inside a group
export const getGroupEdges = (edges: Edge[], groupNodes: Node[]): Edge[] => {
  const groupNodeIds = groupNodes.map(node => node.id);
  return edges.filter(edge => 
    groupNodeIds.includes(edge.source) && groupNodeIds.includes(edge.target)
  );
};

// Ungroup group
export const ungroupGroup = (
  nodes: Node[], 
  edges: Edge[], 
  groupId: string,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void
): void => {
  const childNodes = getGroupNodes(nodes, groupId);
  
  // Remove parentId from child nodes
  const nodesWithoutParent = nodes.map(node => {
    if (childNodes.some(child => child.id === node.id)) {
      const { parentId, ...nodeWithoutParent } = node;
      return nodeWithoutParent;
    }
    return node;
  });

  // Remove group node
  const nodesWithoutGroup = nodesWithoutParent.filter(node => node.id !== groupId);
  
  setNodes(nodesWithoutGroup);
  setEdges(edges);
};

// Auto resize group
export const autoResizeGroup = (
  nodes: Node[], 
  groupId: string,
  setNodes: (nodes: Node[]) => void
): void => {
  const childNodes = getGroupNodes(nodes, groupId);
  if (childNodes.length === 0) return;

  // Find the group node
  const groupNode = nodes.find(node => node.id === groupId);
  if (!groupNode) return;
  const groupPos = groupNode.position;

  const portOffset = 40;
  const xPadding = 10, yPadding = 100;

  // Calculate absolute positions for children
  const absPositions = childNodes.map(node => {
    let width = (node.measured?.width ?? 0);
    let height = (node.measured?.height ?? 0);

    // Check if the node has inputs or outputs
    if(node.data === undefined){
      throw new Error('Node data is undefined');
    }
    let hasInputs = (node.data as any).inputs.length > 0, hasOutputs = (node.data as any).outputs.length > 0;
    
    // Adding port offset to topX and bottomX since node.width and node.height does not include ports
    return {
      topX: groupPos.x + node.position.x - (hasInputs ? portOffset : 0),
      topY: groupPos.y + node.position.y,
      bottomX: groupPos.x + node.position.x + width + (hasOutputs ? portOffset : 0),
      bottomY: groupPos.y + node.position.y + height,
      hasInputs,
      hasOutputs
    };
  });
  
  const minTopX = Math.min(...absPositions.map(p => p.topX));
  const maxBottomX = Math.max(...absPositions.map(p => p.bottomX));

  const minTopY = Math.min(...absPositions.map(p => p.topY));
  const maxBottomY = Math.max(...absPositions.map(p => p.bottomY));
  
  const newGroupPos = { x: minTopX-xPadding, y: minTopY-yPadding };

  const newWidth = maxBottomX - minTopX + xPadding * 2;
  const newHeight = maxBottomY - minTopY + yPadding;

  // Update all child nodes' positions to be relative to the new group position
  const updatedNodes = nodes.map(node => {
    if (node.id === groupId) {
      return {
        ...node,
        style: {
          ...node.style,
          width: newWidth,
          height: newHeight
        },
        data: {
          ...node.data,
          width: newWidth,
          height: newHeight
        },
        position: newGroupPos
      };
    }
    if (childNodes.some(child => child.id === node.id)) {
      // Update child position to be relative to new group position
      const absX = groupPos.x + node.position.x;
      const absY = groupPos.y + node.position.y;
      return {
        ...node,
        position: {
          x: absX - newGroupPos.x,
          y: absY - newGroupPos.y
        }
      };
    }
    return node;
  });

  setNodes(updatedNodes);
};

// Create group
export const createGroup = (
  nodes: Node[], 
  edges: Edge[], 
  selectedNodeIds: string[],
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void
): string | null => {
  if (selectedNodeIds.length === 0) return null;

  const selectedNodes = nodes.filter(node => selectedNodeIds.includes(node.id));
  if (selectedNodes.length === 0) return null;

  // Separate regular nodes and group nodes
  const regularNodes = selectedNodes.filter(node => node.type !== 'group');
  const groupNodes = selectedNodes.filter(node => node.type === 'group');

  // Calculate group position and size considering all selected nodes
  const allNodePositions = selectedNodes.map(node => {
    let width = 150;
    let height = 100;
    if (node.style && typeof node.style.width === 'number') width = node.style.width;
    else if (node.data && typeof node.data.width === 'number') width = node.data.width;
    if (node.style && typeof node.style.height === 'number') height = node.style.height;
    else if (node.data && typeof node.data.height === 'number') height = node.data.height;
    
    // For nodes inside groups, calculate absolute position
    let absX = node.position.x;
    let absY = node.position.y;
    if (node.parentId) {
      const parentGroup = nodes.find(n => n.id === node.parentId);
      if (parentGroup) {
        absX = parentGroup.position.x + node.position.x;
        absY = parentGroup.position.y + node.position.y;
      }
    }
    
    return {
      x: absX,
      y: absY,
      width,
      height
    };
  });

  const minX = Math.min(...allNodePositions.map(p => p.x));
  const maxX = Math.max(...allNodePositions.map(p => p.x + p.width));
  const minY = Math.min(...allNodePositions.map(p => p.y));
  const maxY = Math.max(...allNodePositions.map(p => p.y + p.height));

  const padding = 40;
  const groupWidth = maxX - minX + padding * 2;
  const groupHeight = maxY - minY + padding * 2;
  const groupX = minX - padding;
  const groupY = minY - padding;

  const groupId = `group-${Date.now()}`;

  // Create group node
  const groupNode: GroupNode = {
    id: groupId,
    type: 'group',
    position: { x: groupX, y: groupY },
    draggable: true,
    selectable: true,
    data: {
      label: `Group ${selectedNodes.length}`,
      width: groupWidth,
      height: groupHeight,
      backgroundColor: 'rgba(0, 150, 255, 0.1)',
      childCount: selectedNodes.length,
      onUngroup: () => ungroupGroup(nodes, edges, groupId, setNodes, setEdges),
      onAutoResize: () => autoResizeGroup(nodes, groupId, setNodes)
    },
    style: { width: groupWidth, height: groupHeight }
  };

  // Update nodes to join the new group
  const updatedNodes = nodes.map(node => {
    if (selectedNodeIds.includes(node.id)) {
      // Calculate absolute position for the node
      let absX = node.position.x;
      let absY = node.position.y;
      if (node.parentId) {
        const parentGroup = nodes.find(n => n.id === node.parentId);
        if (parentGroup) {
          absX = parentGroup.position.x + node.position.x;
          absY = parentGroup.position.y + node.position.y;
        }
      }
      
      // Calculate relative position to new group
      const relativeX = absX - groupX;
      const relativeY = absY - groupY;
      
      return {
        ...node,
        parentId: groupId,
        // Remove extent restriction to allow dragging outside group for resizing
        // extent: 'parent' as const,
        position: {
          x: relativeX,
          y: relativeY
        }
      };
    }
    return node;
  });

  // Add group node
  const newNodes = [...updatedNodes, groupNode];
  setNodes(newNodes);

  return groupId;
}; 
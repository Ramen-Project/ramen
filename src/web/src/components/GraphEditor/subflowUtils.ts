import { Node, Edge } from '@xyflow/react';

export interface SubflowNode extends Node {
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

// 獲取子流程內的所有節點
export const getSubflowNodes = (nodes: Node[], subflowId: string): Node[] => {
  return nodes.filter(node => node.parentId === subflowId);
};

// 獲取子流程內的所有邊
export const getSubflowEdges = (edges: Edge[], subflowNodes: Node[]): Edge[] => {
  const subflowNodeIds = subflowNodes.map(node => node.id);
  return edges.filter(edge => 
    subflowNodeIds.includes(edge.source) && subflowNodeIds.includes(edge.target)
  );
};

// 解散子流程
export const ungroupSubflow = (
  nodes: Node[], 
  edges: Edge[], 
  subflowId: string,
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void
): void => {
  const childNodes = getSubflowNodes(nodes, subflowId);
  
  // 移除子節點的 parentId
  const nodesWithoutParent = nodes.map(node => {
    if (childNodes.some(child => child.id === node.id)) {
      const { parentId, ...nodeWithoutParent } = node;
      return nodeWithoutParent;
    }
    return node;
  });

  // 移除子流程節點
  const nodesWithoutSubflow = nodesWithoutParent.filter(node => node.id !== subflowId);
  
  setNodes(nodesWithoutSubflow);
  setEdges(edges);
};

// 自動調整子流程大小
export const autoResizeSubflow = (
  nodes: Node[], 
  subflowId: string,
  setNodes: (nodes: Node[]) => void
): void => {
  const childNodes = getSubflowNodes(nodes, subflowId);
  if (childNodes.length === 0) return;

  // Find the subflow node
  const subflowNode = nodes.find(node => node.id === subflowId);
  if (!subflowNode) return;
  const subflowPos = subflowNode.position;

  const portOffset = 40;
  const xPadding = 10, yPadding = 40;

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
      topX: subflowPos.x + node.position.x - (hasInputs ? portOffset : 0),
      topY: subflowPos.y + node.position.y,
      bottomX: subflowPos.x + node.position.x + width + (hasOutputs ? portOffset : 0),
      bottomY: subflowPos.y + node.position.y + height,
      hasInputs,
      hasOutputs
    };
  });
  
  const minTopX = Math.min(...absPositions.map(p => p.topX));
  const maxBottomX = Math.max(...absPositions.map(p => p.bottomX));

  const minTopY = Math.min(...absPositions.map(p => p.topY));
  const maxBottomY = Math.max(...absPositions.map(p => p.bottomY));
  
  const newSubflowPos = { x: minTopX-xPadding, y: minTopY-yPadding };

  const newWidth = maxBottomX - minTopX + xPadding * 2;
  const newHeight = maxBottomY - minTopY + yPadding;

  // Update all child nodes' positions to be relative to the new subflow position
  const updatedNodes = nodes.map(node => {
    if (node.id === subflowId) {
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
        position: newSubflowPos
      };
    }
    if (childNodes.some(child => child.id === node.id)) {
      // Update child position to be relative to new subflow position
      const absX = subflowPos.x + node.position.x;
      const absY = subflowPos.y + node.position.y;
      return {
        ...node,
        position: {
          x: absX - newSubflowPos.x,
          y: absY - newSubflowPos.y
        }
      };
    }
    return node;
  });

  setNodes(updatedNodes);
};

// 創建子流程
export const createSubflow = (
  nodes: Node[], 
  edges: Edge[], 
  selectedNodeIds: string[],
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void
): string | null => {
  if (selectedNodeIds.length === 0) return null;

  const selectedNodes = nodes.filter(node => selectedNodeIds.includes(node.id));
  if (selectedNodes.length === 0) return null;

  // 計算子流程的位置和大小
  const positions = selectedNodes.map(node => {
    let width = 150;
    let height = 100;
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

  const padding = 40;
  const subflowWidth = maxX - minX + padding * 2;
  const subflowHeight = maxY - minY + padding * 2;
  const subflowX = minX - padding;
  const subflowY = minY - padding;

  const subflowId = `subflow-${Date.now()}`;

  // 創建子流程節點
  const subflowNode: SubflowNode = {
    id: subflowId,
    type: 'subflow',
    position: { x: subflowX, y: subflowY },
    draggable: true,
    selectable: true,
    data: {
      label: `子流程 ${selectedNodes.length}`,
      width: subflowWidth,
      height: subflowHeight,
      backgroundColor: 'rgba(255, 193, 7, 0.1)',
      childCount: selectedNodes.length,
      onUngroup: () => ungroupSubflow(nodes, edges, subflowId, setNodes, setEdges),
      onAutoResize: () => autoResizeSubflow(nodes, subflowId, setNodes)
    },
    style: { width: subflowWidth, height: subflowHeight }
  };

  // 為選中的節點添加 parentId 和 extent 限制
  const nodesWithParent = nodes.map(node => {
    if (selectedNodeIds.includes(node.id)) {
      return {
        ...node,
        parentId: subflowId,
        extent: 'parent' as const // 限制節點只能在父容器內移動
      };
    }
    return node;
  });

  // 添加子流程節點
  const newNodes = [...nodesWithParent, subflowNode];
  setNodes(newNodes);

  return subflowId;
}; 
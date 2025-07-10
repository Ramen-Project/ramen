import { useCallback, MouseEvent, useState, useEffect } from 'react';
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
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';

import { ConnectionLine, DefaultEdge } from '../Edges';
import { nodeTypes } from '../Node';
import { 
  ungroupSubflow, 
  autoResizeSubflow, 
  createSubflow
} from './subflowUtils';

import * as Constants from '../../constants';

const edgeTypes = {
  default: DefaultEdge
}

const initialNodes: Node<any>[] = [
  // 示例子流程節點
  {
    id: 'subflow-1',
    type: 'subflow',
    position: { x: 50, y: 50 },
    draggable: true,
    selectable: true,
    data: {
      label: '數據處理子流程',
      width: 400,
      height: 250,
      backgroundColor: 'rgba(255, 193, 7, 0.1)',
      childCount: 2,
      isExpanded: true,
      onUngroup: () => console.log('Ungroup subflow-1'),
      onAutoResize: () => console.log('Auto resize subflow-1')
    },
    style: { width: 400, height: 250 }
  },
  {
    id: '1',
    type: 'operator',
    position: { x: 100, y: 100 },
    parentId: 'subflow-1',
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
    parentId: 'subflow-1',
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
  { id: 'e1-2', source: '1', target: '2', sourceHandle: 'tables', targetHandle: 'leftTable' },
  { id: 'e2-3', source: '2', target: '3', sourceHandle: 'joinedTable', targetHandle: 'table' },
  { id: 'e3-4', source: '3', target: '4', sourceHandle: 'groupedTable', targetHandle: 'table' },
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

export default function Graph() {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const { getNodes, getEdges } = useReactFlow();

  const onConnect = useCallback(
    (connection: any) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

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
      if (selectedIds.length){
        console.log(`Selected ${selectedIds}`)
      }else{
        console.log(`Unselected`)
      }
    }
  });

  // Enhanced onNodesChange to resize subflow when nodes are dragged
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
      const affectedSubflowIds = new Set<string>();
      
      updatedNodes.forEach(node => {
        const prevParent = prevParentMap[node.id];
        const currParent = node.parentId;
        const prevPos = prevPositionMap[node.id];
        
        // Check if node left a subflow
        if (
          prevParent &&
          prevParent.startsWith('subflow-') &&
          prevParent !== currParent
        ) {
          affectedSubflowIds.add(prevParent);
        }
        
        // Check if node is being dragged within a subflow
        if (
          currParent &&
          currParent.startsWith('subflow-') &&
          prevPos &&
          (node.position.x !== prevPos.x || node.position.y !== prevPos.y)
        ) {
          affectedSubflowIds.add(currParent);
        }
      });
      
      // Step 4: Resize all affected subflows
      if (affectedSubflowIds.size > 0) {
        const nodesNow = getNodes();
        affectedSubflowIds.forEach(subflowId => {
          autoResizeSubflow(nodesNow, subflowId, setNodes);
        });
      }
    }, 0);
  }, [onNodesChangeBase, getNodes, setNodes]);

  // 工具欄回調函數
  const handleCreateSubflow = useCallback(() => {
    if (selectedNodeIds.length > 1) {
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      createSubflow(currentNodes, currentEdges, selectedNodeIds, setNodes, setEdges);
    }
  }, [selectedNodeIds, getNodes, getEdges, setNodes, setEdges]);

  const handleUngroupSubflow = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    selectedNodeIds.forEach(nodeId => {
      const node = currentNodes.find(n => n.id === nodeId);
      if (node?.type === 'subflow') {
        ungroupSubflow(currentNodes, currentEdges, nodeId, setNodes, setEdges);
      }
    });
  }, [selectedNodeIds, getNodes, getEdges, setNodes, setEdges]);

  const handleAutoResizeSubflow = useCallback(() => {
    const currentNodes = getNodes();
    selectedNodeIds.forEach(nodeId => {
      const node = currentNodes.find(n => n.id === nodeId);
      if (node?.type === 'subflow') {
        autoResizeSubflow(currentNodes, nodeId, setNodes);
      }
    });
  }, [selectedNodeIds, getNodes, setNodes]);

  // 鍵盤快捷鍵處理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+G: 創建子流程
      if (event.ctrlKey && event.key === 'g') {
        event.preventDefault();
        handleCreateSubflow();
      }
      
      // Ctrl+U: 解散選中的子流程
      if (event.ctrlKey && event.key === 'u') {
        event.preventDefault();
        handleUngroupSubflow();
      }
      
      // Ctrl+R: 自動調整選中子流程大小
      if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        handleAutoResizeSubflow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateSubflow, handleUngroupSubflow, handleAutoResizeSubflow]);

  // 更新子流程節點的回調函數
  const updateSubflowCallbacks = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    
    const updatedNodes = currentNodes.map(node => {
      if (node.type === 'subflow') {
        return {
          ...node,
          data: {
            ...node.data,
            onUngroup: () => ungroupSubflow(currentNodes, currentEdges, node.id, setNodes, setEdges),
            onAutoResize: () => autoResizeSubflow(currentNodes, node.id, setNodes)
          }
        };
      }
      return node;
    });
    
    setNodes(updatedNodes);
  }, [getNodes, getEdges, setNodes, setEdges]);

  // 當節點或邊變化時更新回調函數
  useEffect(() => {
    updateSubflowCallbacks();
  }, [nodes.length, edges.length, updateSubflowCallbacks]);

  // Initial resize of all subflows when component mounts
  useEffect(() => {
    const currentNodes = getNodes();
    const subflowNodes = currentNodes.filter(node => node.type === 'subflow');
    
    if (subflowNodes.length > 0) {
      subflowNodes.forEach(subflowNode => {
        autoResizeSubflow(currentNodes, subflowNode.id, setNodes);
      });
    }
  }, []); // Empty dependency array means this runs only once on mount

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}

        // Behavior settings
        fitView
        zoomOnDoubleClick={false}
        selectionOnDrag
        minZoom={Constants.GraphMinZoom}
        maxZoom={Constants.GraphMaxZoom}
        // translateExtent={Constants.GraphBoundary}
        nodeExtent={Constants.GraphBoundary}
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
      >
        <Background color='#c7c7c7' variant={BackgroundVariant.Dots} size={5} gap={Constants.DotsGap} />
      </ReactFlow>
    </div>
  );
}

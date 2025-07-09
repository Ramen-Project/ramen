import { useCallback, MouseEvent } from 'react';
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
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';

import { ConnectionLine, DefaultEdge } from '../Edges';

import { nodeTypes } from '../Node';
import { OpNodeProps } from '../Node/OperationNode';

import * as Constants from '../../constants';

const edgeTypes = {
  default: DefaultEdge
}

const initialNodes: Node<OpNodeProps>[] = [
  {
    id: '1',
    type: 'operator',
    position: { x: 0, y: 130 },
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
    position: { x: 350, y: 130 },
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

export default function Graph() {
  const [nodes, _, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
      if (args.nodes.length){
        console.log(`Selected ${args.nodes}`)
      }else{
        console.log(`Unselected`)
      }
    }
  });

  return (
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
      onNodesChange={(value) => onNodesChange(value)}
      onEdgesChange={onEdgesChange}
      onEdgeMouseEnter={onMouseEnterEdge}
      onEdgeMouseLeave={onMouseLeaveEdge}
      onConnect={onConnect}
    >
      <Background color='#c7c7c7' variant={BackgroundVariant.Dots} size={5} gap={Constants.DotsGap} />
    </ReactFlow>)
}

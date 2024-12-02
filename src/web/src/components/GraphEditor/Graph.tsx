import { useCallback, useState, MouseEvent } from 'react';
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

import { ConnectionLine, DefaultEdge } from './Edges';

import { nodeTypes } from './Nodes';
import { OpNodeProps } from './Nodes/OperationNode';

import * as Constants from '../../constants';

const edgeTypes = {
  default: DefaultEdge
}

const initialNodes: Node<OpNodeProps>[] = [
  {
    id: '4',
    type: 'operator',
    position: { x: 0, y: 130 },
    data: {
      name: 'SampleNode221asd',
      namespace: 'SampleNS',
      brief: 'Sample Desc.',
      inputs: [
        { name: "int", typeId: "int" },
        { name: "str", typeId: "str" },
        { name: "bool", typeId: "bool" },
        { name: "float", typeId: "float" },
        { name: "double", typeId: "double" },
        { name: "tuple", typeId: "tuple" },
        { name: "list", typeId: "list" }
      ],
      outputs: [
        { name: "unknown", typeId: "unknown" },
        { name: "int", typeId: "int" },
        { name: "str", typeId: "str" },
        { name: "bool", typeId: "bool" },
        { name: "float", typeId: "float" },
        { name: "double", typeId: "double" },
        { name: "exception", typeId: "exception" }
      ]
    },
  },
  {
    id: '5',
    type: 'operator',
    position: { x: 0, y: 130 },
    data: {
      name: 'SampleNode221asd',
      namespace: 'SampleNS',
      brief: 'Sample Desc.',
      inputs: [
        { name: "int", typeId: "int" },
        { name: "str", typeId: "str" },
        { name: "bool", typeId: "bool" },
        { name: "float", typeId: "float" },
        { name: "double", typeId: "double" },
        { name: "tuple", typeId: "tuple" },
        { name: "list", typeId: "list" }
      ],
      outputs: [
        { name: "unknown", typeId: "unknown" },
        { name: "int", typeId: "int" },
        { name: "str", typeId: "str" },
        { name: "bool", typeId: "bool" },
        { name: "float", typeId: "float" },
        { name: "double", typeId: "double" },
        { name: "exception", typeId: "exception" }
      ]
    },
  },
];

const initialEdges: Edge[] = [];

function connectionCheck(connection: Connection): boolean {
  // TODO: Prevent any variables getter and setter connect directly
  // TODO: Return if there's a caster, after that onConnectEnd should insert the caster in between
  return true;
  // return connection.sourceHandle === connection.targetHandle && connection.source != connection.target;
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
        edge.data = true;
        return edge;
      }));
    }, [setEdges]
  );

  const onMouseLeaveEdge = useCallback(
    (_: MouseEvent, edge: Edge) => {
      setEdges((eds) => eds.map((value) => {
        if (value.id !== edge.id) return value;
        edge.data = false;
        return edge;
      }))
    }, [setEdges]
  );

  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);

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

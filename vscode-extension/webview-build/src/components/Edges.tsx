import { 
    ConnectionLineComponentProps, 
    getBezierPath, 
    Position, 
    EdgeProps,
    BaseEdge,
    EdgeLabelRenderer,
    useReactFlow,
} from '@xyflow/react';
import styled from 'styled-components';

import { useTypeStore } from '../stores';
import chroma from 'chroma-js';
import { OpNodeProps } from './Node/OperationNode';

//TODO: get color with sourceHandleId from typeStore

const EdgeLabel = styled.div.attrs<{$posX: number, $posY: number, $color: string, $isSource?: boolean}>(({ $posX, $posY, $color }) => ({
  style: {
    transform: `translate(-50%, -100%) translate(${$posX}px,${$posY}px)`,
    backgroundColor: $color,
    borderColor: $color,
  }
}))`
  font-size: .8rem;
  color: white;
  position: absolute;
  border: solid 1px;
  border-radius: 3px;
  z-index: 1000;
  padding: 0 6px;
`;

export function DefaultEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    sourceHandleId,
  }: EdgeProps) {
    const typeReg = useTypeStore()
    const { getEdge, getNode } = useReactFlow()
    
    // Get the typeId from the source node data based on the sourceHandleId
    let typeId = 'unknown'
    const edge = getEdge(id);
    if (edge?.source && sourceHandleId) {
        const sourceNode = getNode(edge.source)
        if (sourceNode?.data) {
            const nodeData = sourceNode.data as OpNodeProps
            
            // Check if it's an input port
            if (sourceHandleId.startsWith('input')) {
                const inputIndex = parseInt(sourceHandleId.replace('input', ''))
                if (nodeData.inputs[inputIndex]) {
                    typeId = nodeData.inputs[inputIndex].typeId
                }
            }
            // Check if it's an output port
            else if (sourceHandleId.startsWith('output')) {
                const outputIndex = parseInt(sourceHandleId.replace('output', ''))
                if (nodeData.outputs[outputIndex]) {
                    typeId = nodeData.outputs[outputIndex].typeId
                }
            }
        }
    }
    
    const type = typeReg?.typesRegistries?.[typeId] || typeReg?.typesRegistries?.['unknown'] || { name: 'Unknown', color: '#888888' }
    const [d, labelX, labelY] = getBezierPath({
      sourceX: sourceX+4,
      sourceY: sourceY+3,
      sourcePosition,
      targetX: targetX+4,
      targetY: targetY+3,
      targetPosition,
    });
    const hovering = edge?.data?.highlighted
    return (
      <>
        <BaseEdge
          id={id}
          path={d} 
          style={{ stroke: edge?.selected ? chroma(type.color).brighten(.3).hex() : type.color, strokeWidth: 5 }}
        />
        <EdgeLabelRenderer>
          {/* TODO: Make label always shown on viewport */}
          {/* TODO: Only show when hover */}
          {/* TODO: Take start and end point for calculate rotate angle */}
          {edge?.selected || hovering ? <EdgeLabel className='nodrag nopan' $isSource $posX={labelX} $posY={labelY+10} $color={type.color} >{type.name}</EdgeLabel> : null}
        </EdgeLabelRenderer>
      </>
    )
  }

export function ConnectionLine({ fromX, fromY, toX, toY, fromPosition, toPosition, fromHandle }: ConnectionLineComponentProps) {
    const typeReg = useTypeStore()
    const { getNode } = useReactFlow()
    
    // Get the typeId from the node data based on the portId
    let typeId = 'unknown'
    if (fromHandle?.id) {
        const node = getNode(fromHandle.nodeId)
        if (node?.data) {
            const nodeData = node.data as OpNodeProps
            const portId = fromHandle.id
            
            // Check if it's an input port
            if (portId.startsWith('input')) {
                const inputIndex = parseInt(portId.replace('input', ''))
                if (nodeData.inputs[inputIndex]) {
                    typeId = nodeData.inputs[inputIndex].typeId
                }
            }
            // Check if it's an output port
            else if (portId.startsWith('output')) {
                const outputIndex = parseInt(portId.replace('output', ''))
                if (nodeData.outputs[outputIndex]) {
                    typeId = nodeData.outputs[outputIndex].typeId
                }
            }
        }
    }
    
    const type = typeReg?.typesRegistries?.[typeId] || typeReg?.typesRegistries?.['unknown'] || { name: 'Unknown', color: '#888888' }
    const dragFromInput = fromHandle?.position == Position.Left
    const [d] = getBezierPath({
      // align connection line to edge
      sourceX: dragFromInput ? fromX-4 : fromX+12, 
      sourceY: fromY+3,
      targetX: dragFromInput ? toX+12 : toX-4, 
      targetY: toY+3,
      sourcePosition: fromPosition, targetPosition: toPosition
    });
    return (
        <BaseEdge 
          path={d} 
          style={{ stroke: type.color, strokeWidth: 5 }}
        />
    );
}
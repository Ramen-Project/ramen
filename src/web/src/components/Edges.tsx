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

//TODO: get color with sourceHandleId from typeStore

const EdgeLabel = styled.div<{$posX: number, $posY: number, $color: string, $isSource?: boolean}>`
  transform: translate(-50%, -100%) translate(${props => props.$posX}px,${props => props.$posY}px);
  font-size: .8rem;
  color: white;
  background-color: ${props => props.$color};
  position: absolute;
  border: solid 1px;
  border-radius: 3px;
  border-color: ${props => props.$color};
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
    const type = typeReg.typesRegistries[sourceHandleId || 'unknown'];
    const [d, labelX, labelY] = getBezierPath({
      sourceX: sourceX+4,
      sourceY: sourceY+3,
      sourcePosition,
      targetX: targetX+4,
      targetY: targetY+3,
      targetPosition,
    });
    const {getEdge} = useReactFlow()
    const edge = getEdge(id);
    const hovering = edge?.data
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
    const type = typeReg.typesRegistries[fromHandle?.id || 'unknown'];
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
};
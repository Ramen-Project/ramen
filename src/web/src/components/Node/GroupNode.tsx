import React from 'react';
import { NodeProps } from '@xyflow/react';
import { GroupNodeData } from './types';
import styled from 'styled-components';
import './GroupNode.css';
import chroma from 'chroma-js';

interface GroupNodeProps extends NodeProps {
  dragOverGroupId?: string | null;
}

// Styled components with attrs for dynamic styles
const GroupNodeContainer = styled.div.attrs<{
  $width?: number;
  $height?: number;
  $backgroundColor: string;
  $borderColor: string;
  $isDragOver: boolean;
  $selected: boolean;
  $isVisible: boolean;
}>(({ $width, $height, $backgroundColor, $borderColor, $isDragOver, $selected, $isVisible }) => ({
  style: {
    width: $width || 300,
    height: $height || 200,
    backgroundColor: $backgroundColor,
    border: `2px solid ${$borderColor}`,
    boxShadow: $isDragOver ? `0 0 20px ${chroma($borderColor).alpha(0.6).hex()}` : 'none',
    transform: $isDragOver ? 'scale(1.02)' : 'scale(1)',
    cursor: 'pointer',
    opacity: $isVisible ? 1 : 0,
    transition: 'none',
  }
}))`
  border-radius: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 8px;
  transition: none;
  pointer-events: none;
  z-index: 1;
  
  /* Ensure the container can receive clicks */
  user-select: none;
  
  /* Make sure the border is visible when selected */
  &:hover {
    border-color: ${props => chroma(props.$borderColor).brighten(0.3).hex()};
  }
`;

const ClickableBorder = styled.div.attrs<{ $selected: boolean }>(({ $selected }) => ({
  style: {
    zIndex: $selected ? 10 : 1
  }
}))`
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border-radius: 12px;
  pointer-events: auto;
  cursor: pointer;
  
  /* Invisible but clickable area */
  background: transparent;
  
  /* Optional: add a subtle visual indicator when hovering */
  &:hover::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px dashed rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    pointer-events: none;
  }
`;

const WatermarkTitle = styled.div.attrs<{ $color: string }>(({ $color }) => ({
  style: { color: $color }
}))`
  position: absolute;
  top: 12px;
  left: 16px;
  font-size: 2.5rem;
  font-weight: bold;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  z-index: 1;
`;

const GroupContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 14px;
  font-style: italic;
  margin-top: 8px;
  z-index: 2;
  pointer-events: none;
`;

const DragOverIndicator = styled.div.attrs<{ $color: string }>(({ $color }) => ({
  style: { 
    background: chroma($color).alpha(0.2).hex(),
    color: chroma($color).luminance() > 0.5 ? '#000' : '#fff'
  }
}))`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  z-index: 10;
  pointer-events: none;
`;

const GroupNode: React.FC<GroupNodeProps> = ({ data, selected, id, dragOverGroupId }) => {
  const groupData = data as GroupNodeData;
  const nodeColor = chroma(groupData.backgroundColor || 'rgb(0, 0, 0)');
  const unfocusedColor = nodeColor.brighten(0.9);
  const isDragOver = dragOverGroupId === id;
  
  const currentColor = selected ? nodeColor : unfocusedColor;
  const backgroundColor = currentColor.alpha(0.1).hex();
  const borderColor = currentColor.hex();
  const watermarkColor = nodeColor.alpha(0.6).css();
  
  // Check if group is properly sized (has width and height) AND has been resized at least once
  const isVisible = !!(groupData.width && groupData.height && groupData.hasBeenResized);
  
  // Show only after first resize
  const shouldShow = isVisible;

  return (
    <GroupNodeContainer
      className={`group-node ${selected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
      $width={groupData.width}
      $height={groupData.height}
      $backgroundColor={backgroundColor}
      $borderColor={borderColor}
      $isDragOver={isDragOver}
      $selected={!!selected}
      $isVisible={shouldShow}
    >
      <ClickableBorder $selected={!!selected} />
      <WatermarkTitle $color={watermarkColor}>
        {groupData.label || 'Group'}
      </WatermarkTitle>

      <GroupContent className="group-content-area group-content" />
      
      {isDragOver && (
        <DragOverIndicator $color={borderColor}>
          Drop to join group
        </DragOverIndicator>
      )}
    </GroupNodeContainer>
  );
};

export default GroupNode; 
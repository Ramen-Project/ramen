import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';

// Constants
const HANDLE_HEIGHT = 4;
const HANDLE_HOVER_HEIGHT = 6;
const HANDLE_HITBOX_HEIGHT = 16;
const HANDLE_HITBOX_OFFSET = 8;
const TRANSITION_DURATION = '0.2s';
const DEFAULT_OPACITY = 0;
const HOVER_OPACITY = 1;
const DRAG_OPACITY = 0.8;

const Handle = styled.div<{ $isDragging: boolean }>`
  position: absolute;
  top: -${HANDLE_HEIGHT / 2}px;
  left: 0;
  right: 0;
  height: ${props => props.$isDragging ? HANDLE_HOVER_HEIGHT : HANDLE_HEIGHT}px;
  background: var(--blue-9);
  cursor: ns-resize;
  opacity: ${props => props.$isDragging ? DRAG_OPACITY : DEFAULT_OPACITY};
  transition: opacity ${TRANSITION_DURATION} ease, height ${TRANSITION_DURATION} ease;
  z-index: 10;
  
  &:hover {
    opacity: ${HOVER_OPACITY};
    height: ${HANDLE_HOVER_HEIGHT}px;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: -${HANDLE_HITBOX_OFFSET}px;
    left: 0;
    right: 0;
    height: ${HANDLE_HITBOX_HEIGHT}px;
    background: transparent;
  }
`;

export interface ResizeHandleProps {
  height: number;
  minHeight: number;
  maxHeight: number;
  defaultHeight?: number;
  onHeightChange: (height: number) => void;
}

export default function ResizeHandle({
  height,
  minHeight,
  maxHeight,
  defaultHeight,
  onHeightChange
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);

  // Clamp height to constraints
  const clampHeight = useCallback((newHeight: number) => {
    return Math.max(minHeight, Math.min(maxHeight, newHeight));
  }, [minHeight, maxHeight]);

  // Handle mouse move - resize
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (dragStartY.current === 0) return;
    
    const deltaY = dragStartY.current - event.clientY; // Inverted: up = positive, down = negative
    const newHeight = dragStartHeight.current + deltaY;
    const clampedHeight = clampHeight(newHeight);
    
    onHeightChange(clampedHeight);
  }, [clampHeight, onHeightChange]);

  // Handle mouse up - stop dragging
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartY.current = 0;
    dragStartHeight.current = 0;
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Handle mouse down - start dragging
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    dragStartY.current = event.clientY;
    dragStartHeight.current = height;
    
    // Add global event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [height, handleMouseMove, handleMouseUp]);

  // Handle double click - reset to default height
  const handleDoubleClick = useCallback(() => {
    if (defaultHeight !== undefined) {
      const clampedDefault = clampHeight(defaultHeight);
      onHeightChange(clampedDefault);
    }
  }, [defaultHeight, clampHeight, onHeightChange]);

  return (
    <Handle
      data-testid="resize-handle"
      $isDragging={isDragging}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    />
  );
}
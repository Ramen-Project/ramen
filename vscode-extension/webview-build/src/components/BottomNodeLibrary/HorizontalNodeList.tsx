import React, { useCallback, useRef } from 'react';
import styled from 'styled-components';
import StandaloneNodePreview from '../Node/StandaloneNodePreview';
import { useResponsiveScale } from '../../hooks/useResponsiveScale';

// Constants
const NODE_GAP = 12;  // Reduced gap for more compact layout
const CONTAINER_PADDING = 12;  // Reduced padding to save space
const SCROLLBAR_HEIGHT = 6;  // Smaller scrollbar
const SCROLLBAR_RADIUS = 4;
const BASE_NODE_WIDTH = 300; // 3 * DotsGap from constants

const Container = styled.div`
  display: flex;
  gap: ${NODE_GAP}px;
  padding: ${CONTAINER_PADDING}px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  height: 90%;
  
  &::-webkit-scrollbar {
    height: ${SCROLLBAR_HEIGHT}px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--gray-3);
    border-radius: ${SCROLLBAR_RADIUS}px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--gray-7);
    border-radius: ${SCROLLBAR_RADIUS}px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: var(--gray-8);
  }
`;

export interface NodeItem {
  name: string;
}

export interface NodeDefinition {
  name: string;
  namespace: string;
  description: string;
  inputs: Array<{ name: string; typeId: string }>;
  outputs: Array<{ name: string; typeId: string }>;
}

export interface HorizontalNodeListProps {
  nodes: NodeItem[];
  getNodeDefinition: (name: string) => NodeDefinition | null;
  onNodeDragStart?: (event: React.DragEvent, nodeType: string) => void;
}

export default function HorizontalNodeList({ 
  nodes, 
  getNodeDefinition, 
  onNodeDragStart 
}: HorizontalNodeListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive scaling hook - balanced scale for readable nodes
  const { scale } = useResponsiveScale({
    baseNodeWidth: BASE_NODE_WIDTH,
    nodeGap: NODE_GAP,
    containerPadding: CONTAINER_PADDING,
    minScale: 0.6,  // Minimum scale for readability
    maxScale: 0.9,  // Slightly reduced from full size
    minNodesVisible: 2  // Show at least 2 nodes
  });

  // Handle mouse wheel scrolling
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (containerRef.current) {
      event.preventDefault();
      const container = containerRef.current;
      const scrollAmount = event.deltaY || event.deltaX;
      container.scrollLeft += scrollAmount;
    }
  }, []);

  // Memoized drag handler for better performance
  const handleDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    if (onNodeDragStart) {
      onNodeDragStart(event, nodeType);
    } else {
      // Default drag behavior - fallback to global handler
      console.log('Drag started for:', nodeType);
      if ((window as Record<string, unknown>).graphOnDragStart) {
        ((window as Record<string, unknown>).graphOnDragStart as (event: React.DragEvent, nodeType: string) => void)(event, nodeType);
      }
    }
  }, [onNodeDragStart]);

  // Transform node definition to preview data format
  const transformToPreviewData = useCallback((nodeDefinition: NodeDefinition) => ({
    name: nodeDefinition.name,
    namespace: nodeDefinition.namespace,
    brief: nodeDefinition.description,
    inputs: nodeDefinition.inputs,
    outputs: nodeDefinition.outputs
  }), []);

  return (
    <Container 
      data-testid="horizontal-node-list"
      ref={containerRef}
      onWheel={handleWheel}
    >
      {nodes.map((node) => {
        const nodeDefinition = getNodeDefinition(node.name);
        if (!nodeDefinition) return null;
        
        const previewData = transformToPreviewData(nodeDefinition);
        
        return (
          <StandaloneNodePreview
            key={node.name}
            nodeData={previewData} 
            scale={scale * 0.85} 
            draggable={true}
            onDragStart={(e) => handleDragStart(e, node.name)}
          />
        );
      })}
    </Container>
  );
}
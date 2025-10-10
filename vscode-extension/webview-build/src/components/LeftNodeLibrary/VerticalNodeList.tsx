import React, { useCallback, useRef } from 'react';
import styled from 'styled-components';
import StandaloneNodePreview from '../Node/StandaloneNodePreview';

// Constants
const NODE_GAP = 6;
const CONTAINER_PADDING = 12;
const SCROLLBAR_WIDTH = 6;
const SCROLLBAR_RADIUS = 4;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${NODE_GAP}px;
  padding: ${CONTAINER_PADDING}px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  height: 100%;
  background: var(--gray-1);
  
  &::-webkit-scrollbar {
    width: ${SCROLLBAR_WIDTH}px;
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

export interface VerticalNodeListProps {
  nodes: any[];
  onNodeDragStart?: (event: React.DragEvent, nodeType: string) => void;
}

export default function VerticalNodeList({ 
  nodes, 
  onNodeDragStart 
}: VerticalNodeListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
  const transformToPreviewData = useCallback((node: any) => ({
    name: node.displayName || node.name,
    namespace: node.namespace,
    brief: node.description,
    inputs: node.inputs || [],
    outputs: node.outputs || [],
    color: node.color,  // Pass through the color from backend
    nodeType: node.type,  // 傳遞節點類型用於判斷特殊渲染
    nodeTemplate: node.nodeTemplate  // 傳遞 nodeTemplate
  }), []);

  return (
    <Container 
      data-testid="vertical-node-list"
      ref={containerRef}
    >
      {nodes.map((node) => {
        const previewData = transformToPreviewData(node);
        
        return (
          <StandaloneNodePreview
            key={node.type || node.displayName || node.name}
            nodeData={previewData} 
            scale={0.9}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, node.type || node.displayName || node.name)}
          />
        );
      })}
    </Container>
  );
}
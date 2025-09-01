import React, { useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Text, Box } from '@radix-ui/themes';
import StandaloneNodePreview from '../Node/StandaloneNodePreview';

// Constants
const NODE_GAP = 6;
const CONTAINER_PADDING = 12;
const SCROLLBAR_WIDTH = 6;
const SCROLLBAR_RADIUS = 4;
const CATEGORY_HEADER_HEIGHT = 40;
const CATEGORY_MARGIN_BOTTOM = 12;

const Container = styled.div`
  display: flex;
  flex-direction: column;
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

const CategorySection = styled.div`
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const CategoryHeader = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: ${CATEGORY_MARGIN_BOTTOM}px;
  height: ${CATEGORY_HEADER_HEIGHT}px;
  background: var(--gray-3);
  border-radius: 6px;
  border-left: 3px solid ${props => props.$color};
`;

const IconWrapper = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
  font-size: 16px;
`;

const NodesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${NODE_GAP}px;
`;

export interface Category {
  name: string;
  icon: React.ComponentType;
  color: string;
  nodes: any[];
}

export interface AllCategoriesNodeListProps {
  categories: Category[];
  activeTabIndex?: number;
  onCategoryInView?: (categoryIndex: number) => void;
  onNodeDragStart?: (event: React.DragEvent, nodeType: string) => void;
}

export default function AllCategoriesNodeList({ 
  categories, 
  activeTabIndex,
  onCategoryInView,
  onNodeDragStart 
}: AllCategoriesNodeListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Set up intersection observer for auto-tab switching
  useEffect(() => {
    if (!containerRef.current || !onCategoryInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the category that is most visible
        let mostVisibleEntry = null;
        let maxRatio = 0;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisibleEntry = entry;
          }
        });

        if (mostVisibleEntry) {
          const categoryIndex = categoryRefs.current.findIndex(
            ref => ref === mostVisibleEntry.target
          );
          if (categoryIndex !== -1) {
            onCategoryInView(categoryIndex);
          }
        }
      },
      {
        root: containerRef.current,
        rootMargin: '-20% 0px -70% 0px', // Trigger when category header is in the top 30% of viewport
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
      }
    );

    categoryRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [categories, onCategoryInView]);

  // Auto-scroll to category when tab is manually selected
  useEffect(() => {
    if (activeTabIndex !== undefined && categoryRefs.current[activeTabIndex]) {
      const categoryElement = categoryRefs.current[activeTabIndex];
      if (categoryElement && containerRef.current) {
        categoryElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  }, [activeTabIndex]);

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
    outputs: node.outputs || []
  }), []);

  return (
    <Container 
      data-testid="all-categories-node-list"
      ref={containerRef}
    >
      {categories.map((category, categoryIndex) => {
        const Icon = category.icon;
        
        return (
          <CategorySection
            key={category.name}
            ref={(el) => {
              categoryRefs.current[categoryIndex] = el;
            }}
          >
            <CategoryHeader $color={category.color}>
              <IconWrapper $color={category.color}>
                <Icon />
              </IconWrapper>
              <Text size="3" weight="medium">
                {category.name}
              </Text>
              <Box style={{ marginLeft: 'auto' }}>
                <Text size="2" color="gray">
                  {category.nodes.length}
                </Text>
              </Box>
            </CategoryHeader>
            
            <NodesGrid>
              {category.nodes.map((node) => {
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
            </NodesGrid>
          </CategorySection>
        );
      })}
    </Container>
  );
}
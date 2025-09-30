import React, { useState, useMemo, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Text, Box, ScrollArea, Badge } from '@radix-ui/themes';
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from '@radix-ui/react-icons';

import StandaloneNodePreview from '../Node/StandaloneNodePreview';

// Constants
const CONTAINER_PADDING = 12;
const SCROLLBAR_WIDTH = 6;
const SCROLLBAR_RADIUS = 4;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--gray-1);
`;

const ControlsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--gray-2);
  border-bottom: 1px solid var(--gray-6);
  flex-shrink: 0;
`;

const ExpandCollapseButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid var(--gray-6);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--gray-11);
  transition: all 0.2s ease;

  &:hover {
    background: var(--gray-3);
    color: var(--gray-12);
  }
`;

const ScrollContainer = styled(ScrollArea)`
  flex: 1;
  padding: ${CONTAINER_PADDING}px;
`;

const NodeCategory = styled.div`
  margin-bottom: 16px;
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 6px;
  background: var(--gray-3);
  border-left: 3px solid transparent;

  &:hover {
    background: var(--gray-4);
  }
`;

const CategoryHeaderWithColor = styled(CategoryHeader)<{ $color: string; $isExpanded: boolean; $isSearchResult?: boolean }>`
  border-left-color: ${props => props.$color};
  background: ${props => props.$isExpanded ? 'var(--gray-4)' : 'var(--gray-3)'};
  
  ${props => props.$isSearchResult && `
    box-shadow: 0 0 0 1px ${props.$color}40;
    background: ${props.$isExpanded ? 'var(--gray-4)' : 'var(--gray-3)'};
  `}
`;

const CategoryName = styled(Text)`
  transition: color 0.2s ease;
  flex: 1;

  ${CategoryHeader}:hover & {
    color: var(--gray-12);
  }
`;

const CollapseIcon = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--gray-10);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: ${props => props.$isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};
`;

const IconWrapper = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
  font-size: 16px;
`;

const NodesContainer = styled.div<{ $isExpanded: boolean; $contentHeight?: number }>`
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: ${props => props.$isExpanded ? `${props.$contentHeight || 2000}px` : '0px'};
  opacity: ${props => props.$isExpanded ? '1' : '0'};
  transform: ${props => props.$isExpanded ? 'translateY(0)' : 'translateY(-10px)'};
`;

const NodesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 16px;
  padding-top: 8px;
  padding-bottom: 8px;
`;

export interface Category {
  name: string;
  icon: React.ComponentType;
  color: string;
  nodes: any[];
}

export interface CollapsibleCategoriesNodeListProps {
  categories: Category[];
  isSearching?: boolean;
  searchQuery?: string;
  onNodeDragStart?: (event: React.DragEvent, nodeType: string) => void;
}

export default function CollapsibleCategoriesNodeList({ 
  categories, 
  isSearching = false,
  searchQuery = '',
  onNodeDragStart 
}: CollapsibleCategoriesNodeListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(cat => cat.name)) // Start with all categories expanded
  );
  const [contentHeights, setContentHeights] = useState<Record<string, number>>({});
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-expand categories with search results
  useEffect(() => {
    if (isSearching) {
      // When searching, expand all categories that have results
      setExpandedCategories(new Set(categories.map(cat => cat.name)));
    }
  }, [isSearching, categories]);

  // Memoized drag handler for better performance
  const handleDragStart = React.useCallback((event: React.DragEvent, nodeType: string) => {
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
  const transformToPreviewData = React.useCallback((node: any) => ({
    name: node.displayName || node.name,
    namespace: node.namespace,
    brief: node.description,
    inputs: node.inputs || [],
    outputs: node.outputs || [],
    color: node.color  // Pass through the color from backend
  }), []);

  // Measure content height for smooth animation
  useEffect(() => {
    const heights: Record<string, number> = {};
    Object.keys(nodeRefs.current).forEach((categoryName) => {
      const element = nodeRefs.current[categoryName];
      if (element) {
        const height = element.scrollHeight;
        heights[categoryName] = height;
      }
    });
    setContentHeights(heights);
  }, [categories]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(categories.map(cat => cat.name)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const allExpanded = expandedCategories.size === categories.length;
  const allCollapsed = expandedCategories.size === 0;

  return (
    <Container data-testid="collapsible-categories-node-list">
      <ControlsBar>
        <Text size="1" color="gray">
          {isSearching ? (
            <>
              {categories.length} categories found
              {searchQuery && (
                <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>
                  for "{searchQuery}"
                </span>
              )}
            </>
          ) : (
            `${categories.length} categories`
          )}
        </Text>
        <div style={{ display: 'flex', gap: '4px' }}>
          {!allExpanded && (
            <ExpandCollapseButton onClick={expandAll} title="Expand all categories">
              <ChevronDownIcon size={12} />
              <span>Expand All</span>
            </ExpandCollapseButton>
          )}
          {!allCollapsed && (
            <ExpandCollapseButton onClick={collapseAll} title="Collapse all categories">
              <ChevronUpIcon size={12} />
              <span>Collapse All</span>
            </ExpandCollapseButton>
          )}
        </div>
      </ControlsBar>
      
      <ScrollContainer>
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.name);
          const Icon = category.icon;
          
          return (
            <NodeCategory key={category.name}>
              <CategoryHeaderWithColor 
                onClick={() => toggleCategory(category.name)}
                $color={category.color}
                $isExpanded={isExpanded}
                $isSearchResult={isSearching}
              >
                <CollapseIcon $isExpanded={isExpanded}>
                  <ChevronRightIcon />
                </CollapseIcon>
                <IconWrapper $color={category.color}>
                  <Icon />
                </IconWrapper>
                <CategoryName size="2" weight="medium" color="gray">
                  {category.name}
                </CategoryName>
                <Badge color="gray" variant="soft" size="1">
                  {category.nodes.length}
                </Badge>
              </CategoryHeaderWithColor>
              
              <NodesContainer 
                $isExpanded={isExpanded}
                $contentHeight={contentHeights[category.name]}
              >
                <NodesGrid
                  ref={(el) => {
                    if (el) nodeRefs.current[category.name] = el;
                  }}
                >
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
              </NodesContainer>
            </NodeCategory>
          );
        })}
      </ScrollContainer>
    </Container>
  );
}
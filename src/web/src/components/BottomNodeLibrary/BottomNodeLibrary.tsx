import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { TextField } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useNodeDefinitionStore } from '../../stores/NodeDefinitionStore';
import CategoryTabs from './CategoryTabs';
import HorizontalNodeList from './HorizontalNodeList';
import ResizeHandle from './ResizeHandle';

// Constants
const DEFAULT_HEIGHT = 300;
const MIN_HEIGHT = 100;
const MAX_HEIGHT = 800;
const ANIMATION_DURATION = '0.3s';

const Container = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  background: var(--gray-2);
  border-top: 1px solid var(--gray-6);
  z-index: 100;
`;

const SearchContainer = styled.div`
  padding: 12px 16px;
  background: var(--gray-2);
  border-bottom: 1px solid var(--gray-6);
`;

const ContentArea = styled.div<{ $isExpanded: boolean, $height: number }>`
  height: ${props => props.$isExpanded ? `${props.$height}px` : '0px'};
  overflow: hidden;
  transition: height ${ANIMATION_DURATION} ease;
`;

export default function BottomNodeLibrary() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [searchQuery, setSearchQuery] = useState('');
  const { getAllCategories, getNodeDefinition } = useNodeDefinitionStore();
  const allCategories = getAllCategories();

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      if (event.code === 'Space' && event.target === document.body) {
        event.preventDefault();
        toggleExpanded();
      }
      
      // Handle ESC to clear search (when search input is focused)
      if (event.key === 'Escape' && searchQuery) {
        event.preventDefault();
        setSearchQuery('');
        // Blur the search input if it's focused
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).placeholder.includes('Search')) {
          (target as HTMLInputElement).blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleExpanded, searchQuery]);

  // Search nodes helper function
  const searchNodes = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    const matchingNodes: Array<{ name: string }> = [];

    allCategories.forEach(category => {
      category.nodes.forEach(node => {
        const nodeDefinition = getNodeDefinition(node.name);
        if (!nodeDefinition) return;

        // Search in name, description, namespace, inputs, outputs
        const searchableText = [
          nodeDefinition.name,
          nodeDefinition.description,
          nodeDefinition.namespace,
          ...nodeDefinition.inputs.map(i => `${i.name} ${i.typeId}`),
          ...nodeDefinition.outputs.map(o => `${o.name} ${o.typeId}`)
        ].join(' ').toLowerCase();

        if (searchableText.includes(lowerQuery)) {
          matchingNodes.push(node);
        }
      });
    });

    return matchingNodes;
  }, [allCategories, getNodeDefinition]);

  // Filter results based on search query
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { categories: allCategories, isSearching: false };
    }

    const matchingNodes = searchNodes(searchQuery);
    
    // Create virtual "All Results" category
    const searchCategory = {
      name: 'All Results',
      icon: MagnifyingGlassIcon,
      color: '#6b7280',
      nodes: matchingNodes
    };

    return { 
      categories: [searchCategory], 
      isSearching: true 
    };
  }, [searchQuery, allCategories, searchNodes]);

  const displayCategories = filteredResults.categories;
  const isSearching = filteredResults.isSearching;
  
  // Reset active tab when switching between search and normal mode
  useEffect(() => {
    setActiveTab(0);
  }, [isSearching]);

  const activeCategory = displayCategories[activeTab];

  return (
    <Container data-testid="bottom-node-library">
      <ResizeHandle 
        height={height}
        minHeight={MIN_HEIGHT}
        maxHeight={MAX_HEIGHT}
        defaultHeight={DEFAULT_HEIGHT}
        onHeightChange={setHeight}
      />
      
      {isExpanded && (
        <SearchContainer>
          <TextField.Root
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="2"
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
          </TextField.Root>
        </SearchContainer>
      )}

      <CategoryTabs
        categories={displayCategories}
        activeTabIndex={activeTab}
        onTabChange={setActiveTab}
      />

      <ContentArea $isExpanded={isExpanded} $height={height}>
        {isExpanded && activeCategory && (
          <HorizontalNodeList
            nodes={activeCategory.nodes}
            getNodeDefinition={getNodeDefinition}
          />
        )}
      </ContentArea>
    </Container>
  );
}
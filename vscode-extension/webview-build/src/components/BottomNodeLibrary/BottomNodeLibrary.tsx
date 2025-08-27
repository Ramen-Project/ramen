import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { TextField } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useNodeDefinitionStore } from '../../stores/NodeDefinitionStore';
import CategoryTabs from './CategoryTabs';
import HorizontalNodeList from './HorizontalNodeList';

// Constants
const ANIMATION_DURATION = '0.3s';

// Responsive height calculation based on viewport
const getResponsiveHeight = () => {
  const vh = window.innerHeight;
  console.log('🍜 Node Library - Viewport height:', vh);
  
  let calculatedHeight;
  // Balanced heights for usability and space efficiency
  if (vh < 400) {
    calculatedHeight = Math.min(140, vh * 0.3); // Very small screens: 30% max, 140px max
    console.log('🍜 Node Library - Very small screen, height:', calculatedHeight);
  } else if (vh < 600) {
    calculatedHeight = Math.min(180, vh * 0.3); // Small screens: 30% max, 180px max  
    console.log('🍜 Node Library - Small screen, height:', calculatedHeight);
  } else if (vh < 800) {
    calculatedHeight = Math.min(220, vh * 0.3); // Medium screens: 30% max, 220px max
    console.log('🍜 Node Library - Medium screen, height:', calculatedHeight);
  } else {
    calculatedHeight = Math.min(260, vh * 0.3); // Large screens: 30% max, 260px max
    console.log('🍜 Node Library - Large screen, height:', calculatedHeight);
  }
  
  return calculatedHeight;
};

const Container = styled.div`
  position: relative;
  width: 100%;
  background: var(--gray-2);
  border-top: 1px solid var(--gray-6);
  display: flex;
  flex-direction: column;
`;

const SearchContainer = styled.div`
  padding: 6px 8px;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentHeight, setCurrentHeight] = useState(() => getResponsiveHeight());
  const { getAllCategories, getNodeDefinition } = useNodeDefinitionStore();
  const allCategories = getAllCategories();

  // Update height on window resize and container changes
  useEffect(() => {
    const updateHeight = () => {
      console.log('🍜 Node Library - Resize event triggered');
      const newHeight = getResponsiveHeight();
      console.log('🍜 Node Library - Setting new height:', newHeight);
      setCurrentHeight(newHeight);
    };

    console.log('🍜 Node Library - Setting up resize listener');
    
    // Listen to window resize
    window.addEventListener('resize', updateHeight);
    
    // Also use ResizeObserver to detect parent container changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        console.log('🍜 Node Library - ResizeObserver triggered');
        updateHeight();
      });
      
      // Observe the body element for VSCode webview changes
      resizeObserver.observe(document.body);
    }
    
    // Trigger initial update after mount
    const timer = setTimeout(updateHeight, 100);
    
    return () => {
      console.log('🍜 Node Library - Cleaning up resize listeners');
      window.removeEventListener('resize', updateHeight);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      clearTimeout(timer);
    };
  }, []);

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
      {/* Debug info - temporary for troubleshooting */}
      {(
        <div style={{
          position: 'absolute',
          top: '-30px',
          right: '10px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '2px 8px',
          fontSize: '10px',
          borderRadius: '3px',
          zIndex: 1000
        }}>
          Height: {Math.round(currentHeight)}px (VH: {window.innerHeight}px)
        </div>
      )}
      
      {isExpanded && (
        <CategoryTabs
          categories={displayCategories}
          activeTabIndex={activeTab}
          onTabChange={setActiveTab}
          isBottom={false}
        />
      )}

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

      <ContentArea $isExpanded={isExpanded} $height={currentHeight}>
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
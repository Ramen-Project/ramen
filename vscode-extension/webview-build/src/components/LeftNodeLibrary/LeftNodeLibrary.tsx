import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { TextField } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useNodeDefinitionStore } from '../../stores/NodeDefinitionStore';
import VerticalNodeList from './VerticalNodeList';
import CollapsibleCategoriesNodeList from './CollapsibleCategoriesNodeList';

// Constants
const MIN_WIDTH = 360;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 360;
const ANIMATION_DURATION = '0.3s';

const Container = styled.div<{ $width: number }>`
  position: relative;
  width: ${props => props.$width}px;
  height: 100vh;
  background: var(--gray-2);
  border-right: 1px solid var(--gray-6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
`;

const ResizeHandle = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: transparent;
  cursor: col-resize;
  z-index: 10;
  
  &:hover {
    background: var(--blue-8);
  }
  
  &:active {
    background: var(--blue-9);
  }
`;

const SearchContainer = styled.div`
  padding: 8px;
  background: var(--gray-2);
  border-bottom: 1px solid var(--gray-6);
  flex-shrink: 0;
`;

const NodeListContainer = styled.div`
  flex: 1;
  overflow: hidden;
`;

export interface LeftNodeLibraryProps {
  onWidthChange?: (width: number) => void;
  initialWidth?: number;
}

export default function LeftNodeLibrary({ 
  onWidthChange, 
  initialWidth = DEFAULT_WIDTH 
}: LeftNodeLibraryProps) {
  const [width, setWidth] = useState(initialWidth);
  const [searchQuery, setSearchQuery] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const { getAllCategories, fetchNodes, isLoading, error } = useNodeDefinitionStore();
  const allCategories = getAllCategories();

  // Fetch nodes on mount if not already loaded
  useEffect(() => {
    if (allCategories.length === 0 && !isLoading) {
      console.log('🍜 Left Node Library - Fetching nodes from API');
      fetchNodes();
    }
  }, []);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = width;
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + deltaX));
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [width]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // Handle ESC to clear search
      if (event.key === 'Escape' && searchQuery) {
        event.preventDefault();
        setSearchQuery('');
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).placeholder.includes('Search')) {
          (target as HTMLInputElement).blur();
        }
      }
      
      // Handle letter keys to focus search bar
      // Only if we're not already in an input and not the space key
      if (event.key.length === 1 && event.key.match(/[a-zA-Z]/) && event.key !== ' ') {
        if (target.tagName === 'INPUT' || 
            target.tagName === 'TEXTAREA' || 
            target.isContentEditable ||
            target.closest('[role="textbox"]') ||
            target.closest('input')) {
          return;
        }
        
        const searchInput = document.querySelector('.left-node-library-search input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);


  // Filter results based on search query
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return { categories: allCategories, isSearching: false };
    }

    const query = searchQuery.toLowerCase();
    
    // Filter categories to only include those with matching nodes
    const filteredCategories = allCategories.map(category => {
      const filteredNodes = category.nodes.filter(node => {
        if (!node || !node.displayName) return false;
        
        const searchableText = [
          node.displayName,
          node.description || '',
          node.namespace || '',
          node.type || '',
          ...(node.inputs && Array.isArray(node.inputs) ? node.inputs.map(i => `${i.name || ''} ${i.type || ''}`) : []),
          ...(node.outputs && Array.isArray(node.outputs) ? node.outputs.map(o => `${o.name || ''} ${o.type || ''}`) : [])
        ].join(' ').toLowerCase();

        return searchableText.includes(query);
      });

      return {
        ...category,
        nodes: filteredNodes
      };
    }).filter(category => category.nodes.length > 0);

    return { 
      categories: filteredCategories, 
      isSearching: true 
    };
  }, [searchQuery, allCategories]);

  const displayCategories = filteredResults.categories;
  const isSearching = filteredResults.isSearching;

  return (
    <Container 
      data-testid="left-node-library"
      $width={width}
      style={{ cursor: isResizing ? 'col-resize' : 'default' }}
    >
      <ResizeHandle 
        onMouseDown={handleMouseDown}
        data-testid="resize-handle"
      />
      
      <SearchContainer className="left-node-library-search">
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
      
      <NodeListContainer>
        <CollapsibleCategoriesNodeList
          categories={displayCategories}
          isSearching={isSearching}
          searchQuery={searchQuery}
        />
      </NodeListContainer>
    </Container>
  );
}
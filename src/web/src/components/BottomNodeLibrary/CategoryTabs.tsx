import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Badge, Text } from '@radix-ui/themes';

// Constants
const TAB_PADDING = '12px 16px';
const BORDER_WIDTH = '2px';
const ICON_SIZE = 16;
const TRANSITION_DURATION = '0.2s';
const TAB_GAP = '8px';

const TabContainer = styled.div`
  display: flex;
  background: var(--gray-3);
  border-bottom: 1px solid var(--gray-6);
  overflow-x: auto;
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button<{ $active: boolean; $color: string }>`
  display: flex;
  align-items: center;
  gap: ${TAB_GAP};
  padding: ${TAB_PADDING};
  background: ${props => props.$active ? 'var(--gray-2)' : 'transparent'};
  border: none;
  border-bottom: ${BORDER_WIDTH} solid ${props => props.$active ? props.$color : 'transparent'};
  cursor: pointer;
  transition: all ${TRANSITION_DURATION} ease;
  white-space: nowrap;
  min-width: fit-content;
  
  &:hover {
    background: var(--gray-4);
  }
  
  &:focus-visible {
    outline: 2px solid var(--blue-8);
    outline-offset: -2px;
  }
`;

const IconWrapper = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
  font-size: ${ICON_SIZE}px;
`;

export interface CategoryNode {
  name: string;
}

export interface Category {
  name: string;
  icon: React.ComponentType;
  color: string;
  nodes: CategoryNode[];
}

export interface CategoryTabsProps {
  categories: Category[];
  activeTabIndex: number;
  onTabChange: (index: number) => void;
}

export default function CategoryTabs({ 
  categories, 
  activeTabIndex, 
  onTabChange 
}: CategoryTabsProps) {
  
  // Memoized tab click handler
  const handleTabClick = useCallback((index: number) => {
    onTabChange(index);
  }, [onTabChange]);

  // Memoized keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    const { key } = event;
    const maxIndex = categories.length - 1;
    
    switch (key) {
      case 'ArrowRight':
        event.preventDefault();
        onTabChange(Math.min(index + 1, maxIndex));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        onTabChange(Math.max(index - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        onTabChange(0);
        break;
      case 'End':
        event.preventDefault();
        onTabChange(maxIndex);
        break;
    }
  }, [categories.length, onTabChange]);

  // Render individual tab
  const renderTab = useCallback((category: Category, index: number) => {
    const isActive = index === activeTabIndex;
    const Icon = category.icon;
    
    return (
      <Tab
        key={category.name}
        role="tab"
        aria-selected={isActive}
        aria-controls={`tabpanel-${index}`}
        tabIndex={isActive ? 0 : -1}
        $active={isActive}
        $color={category.color}
        onClick={() => handleTabClick(index)}
        onKeyDown={(e) => handleKeyDown(e, index)}
      >
        <IconWrapper $color={category.color}>
          <Icon />
        </IconWrapper>
        
        <Text size="2" weight="medium">
          {category.name}
        </Text>
        
        <Badge variant="soft" color="gray" size="1">
          {category.nodes.length}
        </Badge>
      </Tab>
    );
  }, [activeTabIndex, handleTabClick, handleKeyDown]);

  return (
    <TabContainer role="tablist">
      {categories.map(renderTab)}
    </TabContainer>
  );
}
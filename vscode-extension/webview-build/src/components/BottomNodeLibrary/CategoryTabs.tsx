import React, { useCallback, useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Badge, Text } from '@radix-ui/themes';

// Constants
const TAB_PADDING = '12px 16px';
const BORDER_WIDTH = '2px';
const ICON_SIZE = 16;
const TRANSITION_DURATION = '0.2s';
const TAB_GAP = '8px';

const TabContainer = styled.div<{ $isCompact: boolean; $isBottom?: boolean }>`
  display: flex;
  background: var(--gray-3);
  border-bottom: ${props => props.$isBottom ? 'none' : '1px solid var(--gray-6)'};
  border-top: ${props => props.$isBottom ? '1px solid var(--gray-6)' : 'none'};
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  scroll-behavior: smooth;
  
  &::-webkit-scrollbar {
    display: none;
  }
  
  ${props => props.$isCompact && `
    flex-wrap: wrap;
    max-height: 120px;
    overflow-y: auto;
    scrollbar-width: none;
    
    &::-webkit-scrollbar {
      display: none;
    }
  `}
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
  isBottom?: boolean;
}

export default function CategoryTabs({ 
  categories, 
  activeTabIndex, 
  onTabChange,
  isBottom = false
}: CategoryTabsProps) {
  const [isCompact, setIsCompact] = useState(false);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Check if tabs should be compact based on window width  
  useEffect(() => {
    function checkCompactMode() {
      const shouldBeCompact = window.innerWidth < 768; // Mobile breakpoint
      setIsCompact(shouldBeCompact);
    }

    checkCompactMode();
    window.addEventListener('resize', checkCompactMode);
    
    return () => window.removeEventListener('resize', checkCompactMode);
  }, []);

  // Auto-scroll to active tab when it changes
  useEffect(() => {
    if (activeTabRef.current && tabContainerRef.current && !isCompact) {
      const container = tabContainerRef.current;
      const activeTab = activeTabRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      
      if (tabRect.left < containerRect.left) {
        // Tab is to the left of visible area
        container.scrollLeft -= containerRect.left - tabRect.left + 20;
      } else if (tabRect.right > containerRect.right) {
        // Tab is to the right of visible area
        container.scrollLeft += tabRect.right - containerRect.right + 20;
      }
    }
  }, [activeTabIndex, isCompact]);

  // Handle mouse wheel scrolling
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (tabContainerRef.current && !isCompact) {
      event.preventDefault();
      const container = tabContainerRef.current;
      const scrollAmount = event.deltaY || event.deltaX;
      container.scrollLeft += scrollAmount;
    }
  }, [isCompact]);
  
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
        ref={isActive ? activeTabRef : null}
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
    <TabContainer 
      role="tablist" 
      $isCompact={isCompact}
      $isBottom={isBottom}
      ref={tabContainerRef}
      onWheel={handleWheel}
    >
      {categories.map(renderTab)}
    </TabContainer>
  );
}
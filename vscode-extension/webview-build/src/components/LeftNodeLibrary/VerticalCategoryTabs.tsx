import React, { useCallback, useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Badge, Text } from '@radix-ui/themes';

// Constants
const TAB_PADDING = '8px 12px';
const BORDER_WIDTH = '2px';
const ICON_SIZE = 16;
const TRANSITION_DURATION = '0.2s';
const TAB_GAP = '4px';

const TabContainer = styled.div<{ $isCompact: boolean }>`
  display: flex;
  flex-direction: column;
  background: var(--gray-3);
  border-right: 1px solid var(--gray-6);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;
  min-width: 48px;
  max-width: 140px;
  width: 100px;
  
  &::-webkit-scrollbar {
    display: none;
  }
  
  ${props => props.$isCompact && `
    width: 48px;
    min-width: 48px;
  `}
`;

const Tab = styled.button<{ $active: boolean; $color: string; $isCompact: boolean }>`
  display: flex;
  align-items: center;
  gap: ${TAB_GAP};
  padding: ${TAB_PADDING};
  background: ${props => props.$active ? 'var(--gray-2)' : 'transparent'};
  border: none;
  border-right: ${BORDER_WIDTH} solid ${props => props.$active ? props.$color : 'transparent'};
  cursor: pointer;
  transition: all ${TRANSITION_DURATION} ease;
  white-space: nowrap;
  min-height: 40px;
  justify-content: ${props => props.$isCompact ? 'center' : 'flex-start'};
  
  &:hover {
    background: var(--gray-4);
  }
  
  &:focus-visible {
    outline: 2px solid var(--blue-8);
    outline-offset: -2px;
  }
  
  ${props => props.$isCompact && `
    padding: 8px;
    flex-direction: column;
    gap: 2px;
  `}
`;

const IconWrapper = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color};
  font-size: ${ICON_SIZE}px;
  flex-shrink: 0;
`;

const TextWrapper = styled.div<{ $isCompact: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  
  ${props => props.$isCompact && `
    align-items: center;
  `}
`;

const CompactBadge = styled(Badge)<{ $isCompact: boolean }>`
  ${props => props.$isCompact && `
    font-size: 10px;
    min-width: 16px;
    height: 16px;
  `}
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

export interface VerticalCategoryTabsProps {
  categories: Category[];
  activeTabIndex: number;
  onTabChange: (index: number) => void;
  isCompact?: boolean;
}

export default function VerticalCategoryTabs({ 
  categories, 
  activeTabIndex, 
  onTabChange,
  isCompact = false
}: VerticalCategoryTabsProps) {
  const [internalCompact, setInternalCompact] = useState(isCompact);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Check if tabs should be compact based on window width  
  useEffect(() => {
    function checkCompactMode() {
      const shouldBeCompact = window.innerWidth < 768 || isCompact;
      setInternalCompact(shouldBeCompact);
    }

    checkCompactMode();
    window.addEventListener('resize', checkCompactMode);
    
    return () => window.removeEventListener('resize', checkCompactMode);
  }, [isCompact]);

  // Auto-scroll to active tab when it changes
  useEffect(() => {
    if (activeTabRef.current && tabContainerRef.current) {
      const container = tabContainerRef.current;
      const activeTab = activeTabRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      
      if (tabRect.top < containerRect.top) {
        // Tab is above visible area
        container.scrollTop -= containerRect.top - tabRect.top + 20;
      } else if (tabRect.bottom > containerRect.bottom) {
        // Tab is below visible area
        container.scrollTop += tabRect.bottom - containerRect.bottom + 20;
      }
    }
  }, [activeTabIndex]);

  // Memoized tab click handler
  const handleTabClick = useCallback((index: number) => {
    onTabChange(index);
  }, [onTabChange]);

  // Memoized keyboard navigation handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    const { key } = event;
    const maxIndex = categories.length - 1;
    
    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        onTabChange(Math.min(index + 1, maxIndex));
        break;
      case 'ArrowUp':
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
        $isCompact={internalCompact}
        onClick={() => handleTabClick(index)}
        onKeyDown={(e) => handleKeyDown(e, index)}
        title={internalCompact ? category.name : undefined}
      >
        <IconWrapper $color={category.color}>
          <Icon />
        </IconWrapper>
        
        {!internalCompact && (
          <TextWrapper $isCompact={internalCompact}>
            <Text size="2" weight="medium">
              {category.name}
            </Text>
            <CompactBadge variant="soft" color="gray" size="1" $isCompact={internalCompact}>
              {category.nodes.length}
            </CompactBadge>
          </TextWrapper>
        )}
        
        {internalCompact && (
          <CompactBadge variant="soft" color="gray" size="1" $isCompact={internalCompact}>
            {category.nodes.length}
          </CompactBadge>
        )}
      </Tab>
    );
  }, [activeTabIndex, handleTabClick, handleKeyDown, internalCompact]);

  return (
    <TabContainer 
      role="tablist" 
      $isCompact={internalCompact}
      ref={tabContainerRef}
    >
      {categories.map(renderTab)}
    </TabContainer>
  );
}
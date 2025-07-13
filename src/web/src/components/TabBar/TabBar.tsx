import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';

interface Tab {
  id: string;
  name: string;
  isActive: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
  onTabReorder: (fromIndex: number, toIndex: number) => void;
}

interface DraggedTab {
  id: string;
  index: number;
}

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabAdd,
  onTabReorder
}) => {
  // Add CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: scaleX(0);
          opacity: 0;
        }
        to {
          transform: scaleX(1);
          opacity: 1;
        }
      }
      
      @keyframes tabEnter {
        from {
          opacity: 0;
          transform: translateY(-10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes tabExit {
        from {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateY(-10px) scale(0.95);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [draggedTab, setDraggedTab] = useState<DraggedTab | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when no input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const activeIndex = tabs.findIndex(tab => tab.id === activeTabId);
      
      // Ctrl+Tab: Next tab
      if (event.ctrlKey && event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        if (tabs.length > 0) {
          const nextIndex = (activeIndex + 1) % tabs.length;
          onTabSelect(tabs[nextIndex].id);
        }
      }
      
      // Ctrl+Shift+Tab: Previous tab
      if (event.ctrlKey && event.key === 'Tab' && event.shiftKey) {
        event.preventDefault();
        if (tabs.length > 0) {
          const prevIndex = activeIndex <= 0 ? tabs.length - 1 : activeIndex - 1;
          onTabSelect(tabs[prevIndex].id);
        }
      }
      
      // Ctrl+W: Close active tab
      if (event.ctrlKey && event.key === 'w') {
        event.preventDefault();
        if (activeTabId) {
          onTabClose(activeTabId);
        }
      }
      
      // Ctrl+T: New tab
      if (event.ctrlKey && event.key === 't') {
        event.preventDefault();
        onTabAdd();
      }
      
      // Alt+1-9: Switch to tab by number
      if (event.altKey && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const tabIndex = parseInt(event.key) - 1;
        if (tabIndex < tabs.length) {
          onTabSelect(tabs[tabIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, onTabSelect, onTabClose, onTabAdd]);

  const handleDragStart = useCallback((e: React.DragEvent, tabId: string, index: number) => {
    setDraggedTab({ id: tabId, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
    
    // Add dragging class to the dragged element
    const element = tabRefs.current.get(tabId);
    if (element) {
      element.style.opacity = '0.5';
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    // Reset all tab styles
    tabRefs.current.forEach((element) => {
      element.style.opacity = '1';
      element.style.transform = '';
    });
    
    setDraggedTab(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedTab && draggedTab.index !== index) {
      setDragOverIndex(index);
    }
  }, [draggedTab]);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedTab && draggedTab.index !== dropIndex) {
      onTabReorder(draggedTab.index, dropIndex);
    }
    
    setDraggedTab(null);
    setDragOverIndex(null);
  }, [draggedTab, onTabReorder]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const getTabStyle = useCallback((tabId: string, index: number) => {
    const isDragging = draggedTab?.id === tabId;
    const isDragOver = dragOverIndex === index;
    
    let transform = '';
    if (isDragging) {
      transform = 'rotate(5deg) scale(1.05)';
    } else if (isDragOver) {
      transform = 'translateX(4px)';
    }
    
    return {
      opacity: isDragging ? 0.5 : 1,
      transform,
      transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  }, [draggedTab, dragOverIndex]);

  return (
    <div 
      ref={containerRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 36,
        background: 'var(--gray-3)',
        borderBottom: '1px solid var(--gray-6)',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          ref={(el) => {
            if (el) tabRefs.current.set(tab.id, el);
            else tabRefs.current.delete(tab.id);
          }}
          draggable
          onDragStart={(e) => handleDragStart(e, tab.id, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragLeave={handleDragLeave}
          onClick={() => {
            if (!tab.isActive) {
              onTabSelect(tab.id);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            height: 36,
            border: 'none',
            background: tab.isActive ? 'var(--gray-2)' : 'transparent',
            cursor: 'pointer',
            position: 'relative',
            fontWeight: tab.isActive ? 600 : 400,
            color: tab.isActive ? 'var(--accent-11, #1570ef)' : 'var(--gray-11)',
            borderBottom: '2px solid transparent',
            outline: 'none',
            minWidth: 120,
            maxWidth: 200,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateZ(0)', // Force hardware acceleration
            animation: 'tabEnter 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            ...getTabStyle(tab.id, index)
          }}
          onMouseEnter={(e) => {
            if (!tab.isActive) {
              e.currentTarget.style.background = 'var(--gray-4)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!tab.isActive) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {/* Active tab indicator */}
          {tab.isActive && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'var(--accent-9, #2563eb)',
                animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          )}
          <span style={{ 
            flex: 1, 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            fontSize: '13px'
          }}>
            {tab.name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            style={{
              marginLeft: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--gray-10)',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: 3,
              fontSize: '12px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
              opacity: 0.7
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gray-5)';
              e.currentTarget.style.color = 'var(--gray-12)';
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--gray-10)';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.opacity = '0.7';
            }}
            title="Close tab (Ctrl+W)"
          >
            <Cross2Icon />
          </button>
        </div>
      ))}
      
      <button
        onClick={onTabAdd}
        style={{
          marginLeft: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--accent-10)',
          display: 'flex',
          alignItems: 'center',
          padding: 8,
          borderRadius: 3,
          fontSize: '14px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: 'scale(1)',
          opacity: 0.8
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--gray-5)';
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.opacity = '0.8';
        }}
        title="New tab (Ctrl+T)"
      >
        <PlusIcon />
      </button>
    </div>
  );
};

export default TabBar; 
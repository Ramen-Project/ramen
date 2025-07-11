
import { useState, useRef } from 'react';
import GraphEditor from './components/GraphEditor';
import EditorMenubar from './components/GraphEditor/Menubar';
import './Global.css'

import { Theme } from "@radix-ui/themes";
import * as Tabs from '@radix-ui/react-tabs';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import Sidebar from './components/Sidebar';
import { NodeLibrary, Properties, History } from './components/Sidebar/Panels';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const TabItem = ({ graph, index, moveTab }) => {
  const ref = useRef(null);
  const [{ isDragging }, drag] = useDrag({
    type: 'tab',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'tab',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveTab(item.index, index);
        item.index = index;
      }
    },
  });

  drag(drop(ref));

  return (
    <Tabs.Trigger
      ref={ref}
      key={graph.id}
      value={graph.id}
      style={{
        opacity: isDragging ? 0.5 : 1,
        display: 'flex', alignItems: 'center', padding: '0 16px', height: 36, border: 'none', background: 'none', cursor: 'pointer', position: 'relative', fontWeight: activeGraphId === graph.id ? 600 : 400, color: activeGraphId === graph.id ? 'var(--accent-11, #1570ef)' : 'var(--gray-11)', borderBottom: activeGraphId === graph.id ? '2px solid var(--accent-9, #2563eb)' : '2px solid transparent', outline: 'none',
      }}
    >
      {graph.name}
      <button onClick={e => { e.stopPropagation(); handleCloseGraph(graph.id); }} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-10)', display: 'flex', alignItems: 'center', padding: 0 }} title="Close tab">
        <Cross2Icon />
      </button>
    </Tabs.Trigger>
  );
};

export default function App() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  // Tabs state for graphs
  const [graphs, setGraphs] = useState([
    { id: 'graph-1', name: 'Graph 1', nodes: undefined, edges: undefined },
  ]);
  const [activeGraphId, setActiveGraphId] = useState('graph-1');

  // Add new graph tab
  const handleAddGraph = () => {
    const newId = `graph-${Date.now()}`;
    setGraphs((gs) => [...gs, { id: newId, name: `Graph ${gs.length + 1}`, nodes: undefined, edges: undefined }]);
    setActiveGraphId(newId);
  };
  // Close a graph tab
  const handleCloseGraph = (id: string) => {
    setGraphs((gs) => {
      const idx = gs.findIndex(g => g.id === id);
      const newGraphs = gs.filter(g => g.id !== id);
      // If closing the active tab, switch to another
      if (id === activeGraphId && newGraphs.length > 0) {
        const newIdx = idx === 0 ? 0 : idx - 1;
        setActiveGraphId(newGraphs[newIdx].id);
      } else if (newGraphs.length === 0) {
        // Always keep at least one tab open
        const fallbackId = `graph-${Date.now()}`;
        setActiveGraphId(fallbackId);
        return [{ id: fallbackId, name: 'Graph', nodes: undefined, edges: undefined }];
      }
      return newGraphs;
    });
  };

  const moveTab = (fromIndex, toIndex) => {
    setGraphs(prev => {
      const newGraphs = [...prev];
      const [movedTab] = newGraphs.splice(fromIndex, 1);
      newGraphs.splice(toIndex, 0, movedTab);
      return newGraphs;
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Theme accentColor='blue' appearance='dark' grayColor='mauve'>
        <div style={{ 
          position: 'relative',
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Menubar at the top */}
          <div style={{ flex: '0 0 40px', minHeight: 40, maxHeight: 40 }}>
            <EditorMenubar 
              sidebarVisible={sidebarVisible}
              onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
            />
          </div>
          {/* Main area: sidebar (left) and main content (right) */}
          <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'row' }}>
            {/* Sidebar on the left */}
            {sidebarVisible && (
              <div style={{ width: 320, minWidth: 320, height: '100%', zIndex: 10 }}>
                {/* Sidebar is visually separate, not covered by tabs */}
                <Sidebar width={320}>
                  <NodeLibrary />
                  <Properties 
                    selectedNode={null}
                    onUpdateNode={() => {}}
                  />
                  <History 
                    onUndo={() => {}}
                    onRedo={() => {}}
                    canUndo={false}
                    canRedo={false}
                    onGoToHistory={() => {}}
                    onClearHistory={() => {}}
                  />
                </Sidebar>
              </div>
            )}
            {/* Main content: tabs bar above graph editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
              {/* Tabs bar only above the graph editor */}
              <div style={{ height: 36, minHeight: 36, maxHeight: 36, zIndex: 20, background: 'var(--gray-3)', borderBottom: '1px solid var(--gray-6)' }}>
                <Tabs.Root value={activeGraphId} onValueChange={setActiveGraphId} style={{ display: 'flex', alignItems: 'center', height: 36 }}>
                  <Tabs.List style={{ display: 'flex', alignItems: 'center', height: 36 }}>
                    {graphs.map((graph, index) => (
                      <TabItem key={graph.id} graph={graph} index={index} moveTab={moveTab} />
                    ))}
                    <button onClick={handleAddGraph} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-10)', display: 'flex', alignItems: 'center', padding: 0, height: 36 }} title="New tab">
                      <PlusIcon />
                    </button>
                  </Tabs.List>
                </Tabs.Root>
              </div>
              {/* Graph editor below tabs bar */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <GraphEditor sidebarVisible={false} />
              </div>
            </div>
          </div>
        </div>
      </Theme>
    </DndProvider>
  )
}

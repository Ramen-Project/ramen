
import { useState, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import GraphEditor from './components/GraphEditor';
import EditorMenubar from './components/GraphEditor/Menubar';
import './Global.css'

import { Theme } from "@radix-ui/themes";
import * as Tabs from '@radix-ui/react-tabs';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import Sidebar from './components/Sidebar';
import { NodeLibrary } from './components/Sidebar/Panels';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AboutModal from './components/AboutModal';
import { useGraphStore } from './stores/GraphStore';

export default function App() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  // Use GraphStore for graph management
  const {
    graphs,
    activeGraphId,
    addGraph,
    removeGraph,
    setActiveGraph,
    updateGraphData
  } = useGraphStore();
  
  // Handle graph data changes from GraphEditor
  const handleGraphDataChange = (nodes: Node[], edges: Edge[]) => {
    if (activeGraphId) {
      updateGraphData(activeGraphId, nodes, edges);
    }
  };

  // Handle selection changes from GraphEditor (kept for backward compatibility)
  const handleSelectionChange = (selection: { node?: Node; edge?: Edge } | null) => {
    // Selection is now handled by SelectionStore, but keeping this for compatibility
  };

  // Add new graph tab
  const handleAddGraph = () => {
    const newId = `graph-${Date.now()}`;
    addGraph(newId, `Graph ${graphs.length + 1}`);
  };
  
  // Close a graph tab
  const handleCloseGraph = (id: string) => {
    removeGraph(id);
  };

  const moveTab = (_fromIndex: number, _toIndex: number) => {
    // Note: Tab reordering would require additional store functionality
    // For now, we'll keep the current implementation
    console.log('Tab reordering not yet implemented');
  };

  type TabItemProps = {
    graph: { id: string; name: string };
    index: number;
    moveTab: (fromIndex: number, toIndex: number) => void;
  };

  const TabItem = ({ graph, index, moveTab }: TabItemProps) => {
    const ref = useRef<HTMLButtonElement | null>(null);
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
        <span onClick={e => { e.stopPropagation(); handleCloseGraph(graph.id); }} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-10)', display: 'flex', alignItems: 'center', padding: 0 }} title="Close tab">
          <Cross2Icon />
        </span>
      </Tabs.Trigger>
    );
  };

  // Get current graph data for the active tab
  const activeGraph = graphs.find(g => g.id === activeGraphId);
  const currentNodes = activeGraph?.nodes || [];
  const currentEdges = activeGraph?.edges || [];

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor" element={
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
                    onOpenAbout={() => setAboutModalOpen(true)}
                  />
                </div>
                {/* Main area: sidebar (left) and main content (right) */}
                <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'row' }}>
                  {/* Sidebar on the left */}
                  {sidebarVisible && (
                    <div style={{ width: 400, minWidth: 400, height: '100%', zIndex: 10 }}>
                      {/* Sidebar is visually separate, not covered by tabs */}
                      <Sidebar 
                        width={400}
                        nodes={currentNodes}
                        edges={currentEdges}
                      >
                        <NodeLibrary />
                      </Sidebar>
                    </div>
                  )}
                  {/* Main content: tabs bar above graph editor */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                    {/* Tabs bar only above the graph editor */}
                    <div style={{ height: 36, minHeight: 36, maxHeight: 36, zIndex: 20, background: 'var(--gray-3)', borderBottom: '1px solid var(--gray-6)' }}>
                      <Tabs.Root value={activeGraphId || ''} onValueChange={setActiveGraph} style={{ display: 'flex', alignItems: 'center', height: 36 }}>
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
                      <GraphEditor 
                        sidebarVisible={false} 
                        onGraphDataChange={handleGraphDataChange}
                        onSelectionChange={handleSelectionChange}
                        initialNodes={currentNodes}
                        initialEdges={currentEdges}
                        graphId={activeGraphId || undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Theme>
            <AboutModal 
              open={aboutModalOpen} 
              onOpenChange={setAboutModalOpen}
            />
          </DndProvider>
        } />
      </Routes>
    </Router>
  );
}

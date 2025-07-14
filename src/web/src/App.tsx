
import { useState, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import GraphEditor from './components/GraphEditor';
import './Global.css'

import { Theme } from "@radix-ui/themes";
import Sidebar from './components/Sidebar';
import { NodeLibrary } from './components/Sidebar/Panels';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AboutModal from './components/AboutModal';
import { useGraphStore } from './stores/GraphStore';
import { nanoid } from 'nanoid';
import { useHotkey, useCtrlHotkey, useHotkeys } from './hooks/useHotkeys';

export default function App() {
  const [sidebarVisible] = useState(false);
  const [nodeLibraryVisible, setNodeLibraryVisible] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  // Use GraphStore for graph management
  const {
    graphs,
    activeGraphId,
    addGraph,
    removeGraph,
    setActiveGraph,
    reorderGraphs,
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
    const newId = `graph-${nanoid()}`;
    addGraph(newId, `Graph ${graphs.length + 1}`);
  };
  
  // Close a graph tab
  const handleCloseGraph = (id: string) => {
    removeGraph(id);
  };

  const handleTabReorder = (fromIndex: number, toIndex: number) => {
    reorderGraphs(fromIndex, toIndex);
  };

  // Keyboard shortcuts
  useHotkeys({ key: 'q', preventDefault: true }, () => {
    console.log('Q pressed, toggling NodeLibrary from', nodeLibraryVisible, 'to', !nodeLibraryVisible);
    setNodeLibraryVisible(!nodeLibraryVisible);
  }, [nodeLibraryVisible]);

  useHotkey('Escape', () => {
    if (nodeLibraryVisible) {
      console.log('ESC pressed, closing NodeLibrary');
      setNodeLibraryVisible(false);
    }
  }, [nodeLibraryVisible]);

  useCtrlHotkey('n', () => {
    console.log('Ctrl+N pressed, creating new graph');
    handleAddGraph();
  });

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
                {/* Main area: sidebar (left) and main content (right) */}
                <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'row' }}>
                  {/* NodeLibrary sidebar */}
                  {nodeLibraryVisible && (
                    <div style={{ width: 374, minWidth: 374, height: '100%', zIndex: 10 }}>
                      <Sidebar 
                        width={374}
                        nodes={currentNodes}
                        edges={currentEdges}
                      >
                        <NodeLibrary />
                      </Sidebar>
                    </div>
                  )}
                  {/* Main content: graph editor */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                    {/* Graph editor */}
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


import { useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import GraphEditor from './components/GraphEditor';
import './Global.css'

import { Theme } from "@radix-ui/themes";
import BottomNodeLibrary from './components/BottomNodeLibrary/BottomNodeLibrary';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AboutModal from './components/AboutModal';
import { useGraphStore } from './stores/GraphStore';
import { nanoid } from 'nanoid';
import { useCtrlHotkey } from './hooks/useHotkeys';

export default function App() {
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  // Use GraphStore for graph management
  const {
    graphs,
    activeGraphId,
    addGraph,
    updateGraphData
  } = useGraphStore();
  
  // Handle graph data changes from GraphEditor
  const handleGraphDataChange = (nodes: Node[], edges: Edge[]) => {
    if (activeGraphId) {
      updateGraphData(activeGraphId, nodes, edges);
    }
  };

  // Handle selection changes from GraphEditor (kept for backward compatibility)
  const handleSelectionChange = () => {
    // Selection is now handled by SelectionStore, but keeping this for compatibility
  };

  // Add new graph tab
  const handleAddGraph = () => {
    const newId = `graph-${nanoid()}`;
    addGraph(newId, `Graph ${graphs.length + 1}`);
  };

  // Keyboard shortcuts

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
                {/* Main content: graph editor with bottom node library */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, position: 'relative' }}>
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
                    {/* Bottom Node Library */}
                    <BottomNodeLibrary />
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

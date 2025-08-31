import { useEffect, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import GraphEditor from './components/GraphEditor';
import './Global.css';

import { Theme } from '@radix-ui/themes';
import LeftNodeLibrary from './components/LeftNodeLibrary/LeftNodeLibrary';
import { DndProvider } from 'react-dnd';
import styled from 'styled-components';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Constants
const ANIMATION_DURATION = '0.3s';
const DEFAULT_NODE_LIBRARY_WIDTH = 360;

// Animated container for the node library
const AnimatedNodeLibraryContainer = styled.div<{ $isVisible: boolean; $width: number }>`
  width: ${props => props.$isVisible ? `${props.$width}px` : '0px'};
  overflow: hidden;
  transition: width ${ANIMATION_DURATION} ease;
  flex-shrink: 0;
  height: 100vh;
  background: var(--gray-2);
`;
import { useGraphStore } from './stores/GraphStore';
import { nanoid } from 'nanoid';
import { useCtrlHotkey } from './hooks/useHotkeys';
import { getApiClient, RamenApiClient } from './services/apiClient';

// VSCode webview API - use global variable set by the host HTML
const vscode = (window as any).vscode;

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiClient, setApiClient] = useState<RamenApiClient | null>(null);
  const [isServerHealthy, setIsServerHealthy] = useState(false);
  const [isNodeLibraryVisible, setIsNodeLibraryVisible] = useState(true);
  const [nodeLibraryWidth, setNodeLibraryWidth] = useState(DEFAULT_NODE_LIBRARY_WIDTH);
  const [shouldRenderNodeLibrary, setShouldRenderNodeLibrary] = useState(true);
  
  console.log('🍜 App render - isLoading:', isLoading, 'error:', error);
  
  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('🍜 Loading timeout reached, forcing loading to stop');
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timeout);
  }, [isLoading]);
  
  // Use GraphStore for graph management
  const {
    graphs,
    activeGraphId,
    addGraph,
    updateGraphData,
    setActiveGraph
  } = useGraphStore();

  useEffect(() => {
    // Initialize API client only once
    const initApiClient = async () => {
      if (window.ramenConfig?.serverPort && !apiClient) {
        const client = getApiClient(window.ramenConfig.serverPort);
        setApiClient(client);
        
        // Check server health only if VSCode config allows it
        if (!window.ramenConfig.disableServiceWorker) {
          const healthy = await client.healthCheck();
          setIsServerHealthy(healthy);
          
          if (!healthy) {
            console.warn('Ramen server is not healthy, some features may not work');
          }
        } else {
          // In VSCode mode, assume server is healthy to reduce requests
          setIsServerHealthy(true);
        }
      }
    };
    
    // Only run if we don't have an API client yet
    if (!apiClient) {
      initApiClient();
    }
    
    // Initialize VSCode communication
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('Received message from VSCode:', message);
      
      switch (message.command || message.type) {
        case 'graphUpdate':
          try {
            const parsed = typeof message.data === 'string' 
              ? JSON.parse(message.data) 
              : message.data;
            
            // Update graph data in store
            if (activeGraphId && parsed.nodes && parsed.edges) {
              updateGraphData(activeGraphId, parsed.nodes, parsed.edges);
            }
            setIsLoading(false);
          } catch (err) {
            setError(`Failed to parse graph data: ${err}`);
            setIsLoading(false);
          }
          break;
        case 'error':
          setError(message.message);
          setIsLoading(false);
          break;
        case 'updateTheme':
          document.body.dataset.theme = message.theme;
          break;
        case 'serverRestarted':
          // Re-initialize API client when server restarts
          initApiClient();
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Run only once on mount

  // Separate effect for graph initialization
  useEffect(() => {
    console.log('🍜 Graph init effect - ramenConfig:', !!window.ramenConfig, 'graphData:', !!window.ramenConfig?.graphData, 'graphs.length:', graphs.length);
    
    // Only initialize graph data once when we have the config
    if (window.ramenConfig?.graphData && graphs.length === 0) {
      console.log('🍜 Initializing with graph data');
      try {
        const parsed = typeof window.ramenConfig.graphData === 'string' 
          ? JSON.parse(window.ramenConfig.graphData) 
          : window.ramenConfig.graphData;
        
        // Create initial graph from VSCode data
        const graphId = `vscode-graph-${nanoid()}`;
        const graphName = window.ramenConfig.graphPath?.split(/[\\\\/]/).pop() || 'Untitled';
        
        addGraph(graphId, graphName);
        setActiveGraph(graphId);
        
        if (parsed.nodes && parsed.edges) {
          updateGraphData(graphId, parsed.nodes, parsed.edges);
        }
        
        console.log('🍜 Graph initialized successfully');
        setIsLoading(false);
      } catch (err) {
        console.error('🍜 Failed to parse graph data:', err);
        setError(`Failed to parse initial graph data: ${err}`);
        setIsLoading(false);
      }
    } else if (!window.ramenConfig?.graphData && graphs.length === 0) {
      console.log('🍜 Creating empty graph');
      // Create empty graph if no data
      const graphId = `vscode-graph-${nanoid()}`;
      addGraph(graphId, 'Untitled');
      setActiveGraph(graphId);
      console.log('🍜 Empty graph created');
      setIsLoading(false);
    } else {
      console.log('🍜 Skipping graph init - condition not met');
      // Force stop loading if we have graphs already
      if (graphs.length > 0) {
        console.log('🍜 Graphs exist, stopping loading state');
        setIsLoading(false);
      }
    }
  }, [addGraph, setActiveGraph, updateGraphData, graphs.length]);

  // Handle graph data changes from GraphEditor
  const handleGraphDataChange = (nodes: Node[], edges: Edge[]) => {
    if (activeGraphId) {
      updateGraphData(activeGraphId, nodes, edges);
      
      // Save to VSCode
      if (vscode) {
        vscode.postMessage({
          type: 'saveGraph',
          data: JSON.stringify({ nodes, edges }, null, 2)
        });
      }
    }
  };

  // Handle selection changes from GraphEditor
  const handleSelectionChange = () => {
    // Selection is now handled by SelectionStore
  };

  // Handle rendering state based on visibility
  useEffect(() => {
    if (isNodeLibraryVisible) {
      // Show immediately when becoming visible
      setShouldRenderNodeLibrary(true);
    } else {
      // Hide after animation completes when becoming invisible
      const timer = setTimeout(() => {
        setShouldRenderNodeLibrary(false);
      }, 300); // Match ANIMATION_DURATION
      
      return () => clearTimeout(timer);
    }
  }, [isNodeLibraryVisible]);

  // Handle space key to toggle node library
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      if (event.code === 'Space' && (event.target === document.body || !target.tagName || target.tagName === 'BODY' || target.tagName === 'HTML')) {
        event.preventDefault();
        setIsNodeLibraryVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard shortcuts
  useCtrlHotkey('s', (e) => {
    e.preventDefault();
    handleSave();
  });

  useCtrlHotkey('r', (e) => {
    e.preventDefault();
    handleExecute();
  });

  const handleSave = async () => {
    if (!activeGraphId) return;
    
    const activeGraph = graphs.find(g => g.id === activeGraphId);
    if (!activeGraph) return;

    const graphData = {
      nodes: activeGraph.nodes,
      edges: activeGraph.edges,
      version: "1.0"
    };

    // Save via VSCode
    if (vscode) {
      vscode.postMessage({
        type: 'saveGraph',
        data: JSON.stringify(graphData, null, 2)
      });
    }

    // Also save via API if server is available
    if (apiClient && isServerHealthy && window.ramenConfig?.graphPath) {
      try {
        const result = await apiClient.saveGraph(window.ramenConfig.graphPath, graphData);
        if (result.success) {
          console.log('Graph saved successfully via API');
        } else {
          console.warn('API save failed:', result.message);
        }
      } catch (error) {
        console.error('Failed to save via API:', error);
      }
    }
  };

  const handleExecute = async () => {
    if (!activeGraphId) return;
    
    const activeGraph = graphs.find(g => g.id === activeGraphId);
    if (!activeGraph) return;

    const graphData = {
      nodes: activeGraph.nodes,
      edges: activeGraph.edges,
      version: "1.0"
    };

    // Execute via VSCode
    if (vscode) {
      vscode.postMessage({
        type: 'executeGraph'
      });
    }

    // Also execute via API if server is available
    if (apiClient && isServerHealthy) {
      try {
        const result = await apiClient.executeGraph(graphData);
        if (result.success) {
          console.log('Graph executed successfully via API');
          // Show success message or result in UI
        } else {
          console.error('API execution failed:', result.message);
          setError(`Execution failed: ${result.message}`);
        }
      } catch (error) {
        console.error('Failed to execute via API:', error);
        setError(`Execution error: ${error}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'var(--vscode-foreground, #cccccc)',
        backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
        fontSize: '18px'
      }}>
        Loading Ramen Graph Editor...
        <br />
        <small>Server Port: {window.ramenConfig?.serverPort || 'Unknown'}</small>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px',
        color: 'var(--vscode-errorForeground, #f44336)',
        backgroundColor: 'var(--vscode-inputValidation-errorBackground, rgba(244, 67, 54, 0.1))',
        border: '1px solid var(--vscode-inputValidation-errorBorder, #f44336)',
        borderRadius: '4px',
        margin: '20px'
      }}>
        Error: {error}
      </div>
    );
  }

  // Get current graph data for the active tab
  const activeGraph = graphs.find(g => g.id === activeGraphId);
  const currentNodes = activeGraph?.nodes || [];
  const currentEdges = activeGraph?.edges || [];

  return (
    <DndProvider backend={HTML5Backend}>
      <Theme accentColor="blue" appearance="dark" grayColor="mauve">
        <div style={{ 
          position: 'relative',
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
          minWidth: 320, // Minimum width for usability
          boxSizing: 'border-box'
        }}>
          {/* Animated Left Node Library */}
          <AnimatedNodeLibraryContainer 
            $isVisible={isNodeLibraryVisible} 
            $width={nodeLibraryWidth}
          >
            {shouldRenderNodeLibrary && (
              <LeftNodeLibrary 
                onWidthChange={setNodeLibraryWidth}
                initialWidth={nodeLibraryWidth}
              />
            )}
          </AnimatedNodeLibraryContainer>
          
          {/* Main content: graph editor */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            minWidth: 0, 
            minHeight: 0, 
            position: 'relative' 
          }}>
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
      </Theme>
    </DndProvider>
  );
}
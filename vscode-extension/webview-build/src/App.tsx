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
import { useNodeDefinitionStore } from './stores/NodeDefinitionStore';
import { nanoid } from 'nanoid';
import { useCtrlHotkey } from './hooks/useHotkeys';
import { getApiClient, RamenApiClient } from './services/apiClient';
import { getExtensionClient, ExtensionMessageType, disposeExtensionClient } from './api/ExtensionClient';

// VSCode webview API - use global variable set by the host HTML
const vscode = (window as any).vscode;

/**
 * Convert .ramen file node format to ReactFlow Node format
 */
function convertRamenNodeToReactFlowNode(ramenNode: any): Node {
  // Determine ReactFlow node type based on metadata or original type field
  // Most Ramen nodes are 'operator' type in ReactFlow
  let reactFlowType = 'operator';

  // Get node type from metadata (check both 'type' and 'nodeTemplate' fields)
  const nodeType = ramenNode.metadata?.type || ramenNode.metadata?.nodeTemplate;

  // Also check the original 'type' field for namespace.nodeTemplate format (e.g., "graph.import")
  const originalType = ramenNode.type || '';
  const nodeTypeFromOriginal = originalType.includes('.') ? originalType.split('.').pop() : null;

  // Special cases for other ReactFlow node types
  // Priority: metadata type > original type field
  const effectiveNodeType = nodeType || nodeTypeFromOriginal;

  if (effectiveNodeType === 'reference') {
    reactFlowType = 'reference';
  } else if (effectiveNodeType === 'group') {
    reactFlowType = 'group';
  } else if (effectiveNodeType === 'contextManager') {
    reactFlowType = 'contextManager';
  } else if (effectiveNodeType === 'import') {
    reactFlowType = 'import';
  } else if (effectiveNodeType === 'export') {
    reactFlowType = 'export';
  } else if (effectiveNodeType === 'toType') {
    reactFlowType = 'toType';
  }

  // Convert inputs/outputs to the format expected by OperatorNode
  // Server format: {id, name, type_id, ...}
  // Expected format: {name, type}
  const inputs = (ramenNode.inputs || []).map((input: any) => ({
    name: input.name,
    type: input.type_id || input.type || 'any'
  }));

  const outputs = (ramenNode.outputs || []).map((output: any) => ({
    name: output.name,
    type: output.type_id || output.type || 'any'
  }));

  return {
    id: ramenNode.id,
    type: reactFlowType,  // ReactFlow node type
    position: ramenNode.position || { x: 0, y: 0 },
    data: {
      // OpNodeProps structure expected by OperatorNode
      name: ramenNode.metadata?.name || ramenNode.id,
      namespace: ramenNode.metadata?.namespace || 'builtin',
      brief: ramenNode.metadata?.description || '',
      inputs: inputs,
      outputs: outputs,
      color: ramenNode.metadata?.color,
      // Keep original data for compatibility
      ...ramenNode.data,
      metadata: ramenNode.metadata,
    },
  };
}

/**
 * Convert .ramen file edge format to ReactFlow Edge format
 */
function convertRamenEdgeToReactFlowEdge(ramenEdge: any): Edge {
  return {
    id: ramenEdge.id,
    source: ramenEdge.source_node_id || ramenEdge.source,
    target: ramenEdge.target_node_id || ramenEdge.target,
    sourceHandle: ramenEdge.source_port_id || ramenEdge.sourceHandle,
    targetHandle: ramenEdge.target_port_id || ramenEdge.targetHandle,
    type: ramenEdge.type || 'default',
    data: ramenEdge.data || {},
  };
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiClient, setApiClient] = useState<RamenApiClient | null>(null);
  const [isServerHealthy, setIsServerHealthy] = useState(false);
  const [isNodeLibraryVisible, setIsNodeLibraryVisible] = useState(true);
  const [nodeLibraryWidth, setNodeLibraryWidth] = useState(DEFAULT_NODE_LIBRARY_WIDTH);
  const [shouldRenderNodeLibrary, setShouldRenderNodeLibrary] = useState(true);
  const [debugMode, setDebugMode] = useState<boolean>(window.ramenConfig?.debugMode ?? false);

  console.log('🍜 [DEBUG] App component rendering');
  console.log('🍜 [DEBUG] window.ramenConfig:', window.ramenConfig);
  console.log('🍜 [DEBUG] isLoading:', isLoading, 'error:', error);
  
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

            // Extract nodes and edges from graph structure
            // Support both formats: {nodes, edges} and {graph: {nodes, edges}}
            const graphData = parsed.graph || parsed;
            let nodes = graphData.nodes || [];
            let edges = graphData.edges || [];

            // Enrich nodes with metadata from node definitions
            const { getNodeDefinition } = useNodeDefinitionStore.getState();
            nodes = nodes.map((node: any) => {
              // If node already has metadata, use conversion
              if (node.metadata) {
                return convertRamenNodeToReactFlowNode(node);
              }

              // Otherwise, get metadata from node definition store
              const nodeType = node.type; // e.g., "io.import"
              const nodeDef = getNodeDefinition(nodeType);

              console.log(`[App] Loading node ${node.id}, type: ${nodeType}, found def:`, nodeDef ? 'YES' : 'NO');

              if (nodeDef) {
                console.log(`[App] Node def for ${nodeType}:`, { nodeTemplate: nodeDef.nodeTemplate, type: nodeDef.type });
                // Build metadata from node definition
                const enrichedNode = {
                  ...node,
                  metadata: {
                    type: nodeDef.type,
                    nodeTemplate: nodeDef.nodeTemplate,
                    name: nodeDef.displayName,
                    namespace: nodeDef.namespace,
                    description: nodeDef.description,
                    color: nodeDef.color,
                  },
                  inputs: nodeDef.inputs || [],
                  outputs: nodeDef.outputs || [],
                };
                return convertRamenNodeToReactFlowNode(enrichedNode);
              }

              // Fallback: return as operator node
              console.warn(`[App] No node definition found for ${nodeType}, using fallback`);
              return node;
            });

            edges = edges.map(convertRamenEdgeToReactFlowEdge);

            // Update graph data in store
            if (activeGraphId && nodes && edges) {
              updateGraphData(activeGraphId, nodes, edges);
            }
            setIsLoading(false);
          } catch (err) {
            setError(`Failed to parse graph data: ${err}`);
            setIsLoading(false);
          }
          break;

        case 'websocket-response':
          // Handle WebSocket response from extension
          if (message.id && message.id.startsWith('save-')) {
            console.log('🍜 Save operation completed successfully');
            setError(null);
          } else if (message.id && message.id.startsWith('init-session-')) {
            console.log('🍜 [Session] Session created:', message.data);
            // Session created, we'll wait for load_graph response
          } else if (message.id && message.id.startsWith('load-graph-')) {
            console.log('🍜 [Session] Graph loaded from server:', message.data);
            handleServerGraphData(message.data);
          }
          break;

        case 'websocket-error':
          // Handle WebSocket errors from extension
          if (message.id && message.id.startsWith('save-')) {
            console.error('🍜 Save operation failed:', message.error);
            setError(`Failed to save: ${message.error}`);
          } else if (message.id && message.id.startsWith('load-graph-')) {
            console.error('🍜 Graph loading failed:', message.error);
            setError(`Failed to load graph: ${message.error}`);
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

        case 'toggleDebugMode':
          console.log('🍜 Debug mode toggled:', message.debugMode);
          setDebugMode(message.debugMode);
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
      // Note: ExtensionClient 是全域單例，不應在組件卸載時 dispose
      // 它會在整個 Webview 關閉時由瀏覽器自動清理
      console.log('🍜 [App] Component unmounting, message listener removed');
    };
  }, []); // Run only once on mount

  // NEW: Session-based initialization (defined before useEffect)
  const initializeSessionBasedGraph = async () => {
    try {
      const graphPath = window.ramenConfig!.graphPath!;
      const graphName = graphPath.split(/[\\\\/]/).pop() || 'Untitled';
      const graphId = `vscode-graph-${nanoid()}`;

      console.log('🍜 [Session] Step 1: Creating graph entry');
      addGraph(graphId, graphName);
      setActiveGraph(graphId);

      console.log('🍜 [Session] Step 2: Requesting session from server');
      console.log('🍜 [Session] Graph path:', graphPath);

      // Request session creation + graph loading from server using ExtensionClient
      if (vscode) {
        const extensionClient = getExtensionClient();

        try {
          // Create session
          await extensionClient.request(
            ExtensionMessageType.WEBSOCKET_REQUEST,
            {
              type: 'create_session',
              data: {
                graph_id: graphId,
                user_id: 'vscode-user'
              }
            }
          );
          console.log('🍜 [Session] Session created successfully');

          // Load the graph
          const graphData = await extensionClient.request(
            ExtensionMessageType.WEBSOCKET_REQUEST,
            {
              type: 'load_graph',
              data: {
                path: graphPath
              }
            }
          );
          console.log('🍜 [Session] Graph loaded from server:', graphData);
          handleServerGraphData(graphData);
        } catch (error) {
          console.error('🍜 [Session] Failed to load graph:', error);
          setError(`Failed to load graph: ${error}`);
          setIsLoading(false);
        }
      }

      // Loading state will be cleared when we receive the graph data
      console.log('🍜 [Session] Waiting for server response...');
    } catch (err) {
      console.error('🍜 [Session] Failed to initialize session:', err);
      setError(`Failed to initialize session: ${err}`);
      setIsLoading(false);
    }
  };

  // Handle graph data from server (session-based loading)
  const handleServerGraphData = (serverData: any) => {
    try {
      console.log('🍜 [Session] Processing server graph data');

      // Server response format: { message, graph: {...}, dependencies }
      const graphData = serverData.graph || serverData;

      let rawNodes: any[] = [];
      let rawEdges: any[] = [];

      // Extract nodes and edges from server response
      if (graphData.nodes && graphData.edges) {
        rawNodes = graphData.nodes;
        rawEdges = graphData.edges;
      } else {
        console.error('🍜 [Session] Invalid graph data structure:', graphData);
        setError('Invalid graph data received from server');
        setIsLoading(false);
        return;
      }

      // Convert to ReactFlow format
      const nodes: Node[] = rawNodes.map(convertRamenNodeToReactFlowNode);
      const edges: Edge[] = rawEdges.map(convertRamenEdgeToReactFlowEdge);

      console.log(`🍜 [Session] Loaded ${nodes.length} nodes, ${edges.length} edges`);
      console.log('🍜 [Session] Converted nodes:', nodes);
      console.log('🍜 [Session] First node data:', nodes[0]?.data);
      console.log('🍜 [Session] First node inputs:', nodes[0]?.data?.inputs);
      console.log('🍜 [Session] First node outputs:', nodes[0]?.data?.outputs);
      console.log('🍜 [Session] Converted edges:', edges);

      // Update the active graph - use the current activeGraphId from store
      const currentActiveId = useGraphStore.getState().activeGraphId;
      console.log('🍜 [Session] Updating graph:', currentActiveId);

      if (currentActiveId) {
        updateGraphData(currentActiveId, nodes, edges);
      } else {
        console.error('🍜 [Session] No active graph ID found!');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('🍜 [Session] Failed to process server graph data:', err);
      setError(`Failed to process graph data: ${err}`);
      setIsLoading(false);
    }
  };

  // LEGACY: Direct graph data initialization
  const initializeLegacyGraph = () => {
    try {
      const parsed = typeof window.ramenConfig!.graphData === 'string'
        ? JSON.parse(window.ramenConfig!.graphData)
        : window.ramenConfig!.graphData;

      console.log('🍜 [Legacy] Parsed data structure:', Object.keys(parsed));

      const graphId = `vscode-graph-${nanoid()}`;
      const graphName = window.ramenConfig?.graphPath?.split(/[\\\\/]/).pop() || 'Untitled';

      addGraph(graphId, graphName);
      setActiveGraph(graphId);

      // Handle .ramen file format
      let rawNodes: any[] = [];
      let rawEdges: any[] = [];

      if (parsed.graph) {
        rawNodes = parsed.graph.nodes || [];
        rawEdges = parsed.graph.edges || [];
        console.log('🍜 [Legacy] Loaded from new format (.ramen file)');
      } else if (parsed.nodes && parsed.edges) {
        rawNodes = parsed.nodes;
        rawEdges = parsed.edges;
        console.log('🍜 [Legacy] Loaded from legacy format');
      }

      // Convert .ramen format to ReactFlow format
      const nodes: Node[] = rawNodes.map(convertRamenNodeToReactFlowNode);
      const edges: Edge[] = rawEdges.map(convertRamenEdgeToReactFlowEdge);

      console.log('🍜 [Legacy] Converted:', nodes.length, 'nodes,', edges.length, 'edges');

      if (nodes.length > 0 || edges.length > 0) {
        updateGraphData(graphId, nodes, edges);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('🍜 [Legacy] Failed to parse graph data:', err);
      setError(`Failed to parse initial graph data: ${err}`);
      setIsLoading(false);
    }
  };

  // Graph initialization effect (runs after functions are defined)
  useEffect(() => {
    console.log('🍜 [DEBUG] ========== useEffect RUNNING ==========');
    console.log('🍜 [DEBUG] graphs.length:', graphs.length);
    console.log('🍜 [DEBUG] window.ramenConfig exists:', !!window.ramenConfig);
    console.log('🍜 [DEBUG] window.ramenConfig:', window.ramenConfig);
    console.log('🍜 [DEBUG] useSessionBasedLoading:', window.ramenConfig?.useSessionBasedLoading);
    console.log('🍜 [DEBUG] graphPath:', window.ramenConfig?.graphPath);
    console.log('🍜 [DEBUG] graphData exists:', !!window.ramenConfig?.graphData);

    // Only initialize once
    if (graphs.length > 0) {
      console.log('🍜 [DEBUG] Graph already initialized, skipping');
      setIsLoading(false);
      return;
    }

    // Check if we should use session-based loading
    if (window.ramenConfig?.useSessionBasedLoading && window.ramenConfig?.graphPath) {
      // NEW APPROACH: Session-based loading
      console.log('🍜 [DEBUG] ====> Entering session-based initialization');
      console.log('🍜 [Session-based] Initializing session for:', window.ramenConfig.graphPath);
      initializeSessionBasedGraph();
    } else if (window.ramenConfig?.graphData) {
      // LEGACY APPROACH: Direct graph data (for backward compatibility)
      console.log('🍜 [DEBUG] ====> Entering legacy initialization');
      console.log('🍜 [Legacy] Initializing with embedded graph data');
      initializeLegacyGraph();
    } else {
      // Empty graph
      console.log('🍜 [DEBUG] ====> Creating empty graph');
      console.log('🍜 Creating empty graph');
      const graphId = `vscode-graph-${nanoid()}`;
      addGraph(graphId, 'Untitled');
      setActiveGraph(graphId);
      setIsLoading(false);
    }
  }, [graphs.length, activeGraphId, addGraph, setActiveGraph, updateGraphData, setError, setIsLoading]);

  // Handle graph data changes from GraphEditor
  const handleGraphDataChange = (nodes: Node[], edges: Edge[]) => {
    if (activeGraphId) {
      updateGraphData(activeGraphId, nodes, edges);

      // Note: Auto-save is disabled to prevent excessive saves
      // Users should use Ctrl+S to save manually
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

    // Build complete RamenGraph object matching backend schema
    const ramenGraph = {
      id: activeGraphId,
      metadata: {
        name: activeGraph.name,
        description: '',
        version: '1.0.0'
      },
      nodes: activeGraph.nodes,
      edges: activeGraph.edges,
      variables: []
    };

    // Save via VSCode using WebSocket through message passing
    if (vscode && window.ramenConfig?.graphPath) {
      try {
        // Use the VSCode webview message passing to trigger WebSocket save
        vscode.postMessage({
          command: 'websocket-request',
          type: 'save_graph',
          id: `save-${Date.now()}`,
          data: {
            path: window.ramenConfig.graphPath,
            graph: ramenGraph
          }
        });

        console.log('🍜 Save request sent via VSCode WebSocket');
      } catch (error) {
        console.error('🍜 Failed to send save request:', error);
        setError(`Failed to save: ${error}`);
      }
    } else if (apiClient && isServerHealthy && window.ramenConfig?.graphPath) {
      // Fallback: Direct API save if not in VSCode environment
      try {
        const result = await apiClient.saveGraph(window.ramenConfig.graphPath, ramenGraph);
        if (result.success) {
          console.log('🍜 Graph saved successfully via API');
        } else {
          console.warn('🍜 API save failed:', result.message);
          setError(`Save failed: ${result.message}`);
        }
      } catch (error) {
        console.error('🍜 Failed to save via API:', error);
        setError(`Failed to save: ${error}`);
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
                debugMode={debugMode}
              />
            </div>
          </div>
        </div>
      </Theme>
    </DndProvider>
  );
}
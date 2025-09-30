/**
 * API Client for connecting to Ramen backend
 * Uses VSCode message passing when in VSCode environment, WebSocket otherwise
 */

import { initializeWebSocketClient, MessageType } from '../api/WebSocketClient';

export interface RamenGraph {
  nodes: any[];
  edges: any[];
  version?: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  graphs: RamenGraph[];
  created_at: string;
  last_modified: string;
  version: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// Check if we're in VSCode webview environment
function isVSCodeEnvironment(): boolean {
  return typeof window !== 'undefined' && !!(window as any).vscode;
}

// Send WebSocket request through VSCode message passing
async function sendVSCodeWebSocketRequest<T = any>(
  messageType: string,
  data?: any,
  timeout: number = 10000
): Promise<T> {
  if (!isVSCodeEnvironment()) {
    throw new Error('Not in VSCode environment');
  }

  const vscode = (window as any).vscode;
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return new Promise((resolve, reject) => {
    let timeoutId: number;

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'websocket-response' && message.id === requestId) {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeoutId);
        resolve(message.data as T);
      } else if (message.type === 'websocket-error' && message.id === requestId) {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeoutId);
        reject(new Error(message.error || 'WebSocket request failed'));
      }
    };

    window.addEventListener('message', handleMessage);

    // Send request to extension
    vscode.postMessage({
      command: 'websocket-request',
      id: requestId,
      type: messageType,
      data
    });

    // Timeout handling
    timeoutId = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error(`Request timeout for ${messageType}`));
    }, timeout);
  });
}

export class RamenApiClient {
  private port: number;

  constructor(port: number) {
    this.port = port;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (isVSCodeEnvironment()) {
        const response = await sendVSCodeWebSocketRequest(MessageType.SYSTEM_HEALTH);
        return response.health_status === 'healthy';
      } else {
        const wsClient = await initializeWebSocketClient(`ws://localhost:${this.port}/ws`);
        const response = await wsClient.systemHealth();
        return response.health_status === 'healthy';
      }
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async executeGraph(graphData: RamenGraph): Promise<ApiResponse> {
    try {
      if (isVSCodeEnvironment()) {
        const response = await sendVSCodeWebSocketRequest(MessageType.EXECUTE_GRAPH, {
          graph: graphData
        });
        return {
          success: true,
          message: 'Graph execution started',
          data: response,
        };
      } else {
        const wsClient = await initializeWebSocketClient(`ws://localhost:${this.port}/ws`);
        const response = await wsClient.executeGraph({ graph: graphData });
        return {
          success: true,
          message: 'Graph execution started',
          data: response,
        };
      }
    } catch (error) {
      console.error('Execute graph failed:', error);
      return {
        success: false,
        message: `Failed to execute graph: ${error}`,
      };
    }
  }

  async saveGraph(filePath: string, graphData: RamenGraph): Promise<ApiResponse> {
    try {
      if (isVSCodeEnvironment()) {
        const response = await sendVSCodeWebSocketRequest(MessageType.SAVE_GRAPH, {
          path: filePath,
          graph: graphData,
        });
        return {
          success: true,
          message: response.message || 'Graph saved successfully',
          data: response,
        };
      } else {
        const wsClient = await initializeWebSocketClient(`ws://localhost:${this.port}/ws`);
        const response = await wsClient.saveGraph({
          path: filePath,
          graph: graphData,
        });
        return {
          success: true,
          message: response.message || 'Graph saved successfully',
          data: response,
        };
      }
    } catch (error) {
      console.error('Save graph failed:', error);
      return {
        success: false,
        message: `Failed to save graph: ${error}`,
      };
    }
  }

  async loadGraph(filePath: string): Promise<ApiResponse<RamenGraph>> {
    try {
      if (isVSCodeEnvironment()) {
        const response = await sendVSCodeWebSocketRequest(MessageType.LOAD_GRAPH, {
          path: filePath
        });
        return {
          success: true,
          message: response.message || 'Graph loaded successfully',
          data: response.graph,
        };
      } else {
        const wsClient = await initializeWebSocketClient(`ws://localhost:${this.port}/ws`);
        const response = await wsClient.loadGraph(filePath);
        return {
          success: true,
          message: response.message || 'Graph loaded successfully',
          data: response.graph,
        };
      }
    } catch (error) {
      console.error('Load graph failed:', error);
      return {
        success: false,
        message: `Failed to load graph: ${error}`,
      };
    }
  }

  async validateGraph(graphData: RamenGraph): Promise<ApiResponse> {
    try {
      if (isVSCodeEnvironment()) {
        const response = await sendVSCodeWebSocketRequest(MessageType.GIT_VALIDATE, {
          graph: graphData
        });
        return {
          success: response.valid,
          message: response.valid ? 'Graph is valid' : 'Graph validation failed',
          data: response,
        };
      } else {
        const wsClient = await initializeWebSocketClient(`ws://localhost:${this.port}/ws`);
        const response = await wsClient.gitValidate(graphData);
        return {
          success: response.valid,
          message: response.valid ? 'Graph is valid' : 'Graph validation failed',
          data: response,
        };
      }
    } catch (error) {
      console.error('Validate graph failed:', error);
      return {
        success: false,
        message: `Failed to validate graph: ${error}`,
      };
    }
  }

  // Project management
  // Note: These APIs are currently not implemented in the backend WebSocket API
  // They will be added in a future update
  async createProject(name: string, description?: string, location?: string): Promise<ApiResponse<ProjectInfo>> {
    console.warn('Project management APIs are not yet implemented via WebSocket');
    return {
      success: false,
      message: 'Project management APIs are not yet available',
    };
  }

  async loadProject(path: string): Promise<ApiResponse<ProjectInfo>> {
    console.warn('Project management APIs are not yet implemented via WebSocket');
    return {
      success: false,
      message: 'Project management APIs are not yet available',
    };
  }

  async saveProject(filePath: string, project: ProjectInfo): Promise<ApiResponse> {
    console.warn('Project management APIs are not yet implemented via WebSocket');
    return {
      success: false,
      message: 'Project management APIs are not yet available',
    };
  }

  async syncProject(projectPath: string): Promise<ApiResponse> {
    console.warn('Project management APIs are not yet implemented via WebSocket');
    return {
      success: false,
      message: 'Project management APIs are not yet available',
    };
  }

  async listRecentProjects(): Promise<ApiResponse<ProjectInfo[]>> {
    console.warn('Project management APIs are not yet implemented via WebSocket');
    return {
      success: false,
      message: 'Project management APIs are not yet available',
    };
  }
}

// Singleton instance
let apiClient: RamenApiClient | null = null;

export function getApiClient(port?: number): RamenApiClient {
  if (!apiClient || (port && port !== getPortFromClient(apiClient))) {
    apiClient = new RamenApiClient(port || 8000);
  }
  return apiClient;
}

function getPortFromClient(client: RamenApiClient): number {
  // Get port from client
  return (client as any).port || 8000;
}
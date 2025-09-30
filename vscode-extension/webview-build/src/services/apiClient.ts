/**
 * API Client for connecting to Ramen backend via WebSocket
 */

import { getWebSocketClient, initializeWebSocketClient } from '../api/WebSocketClient';

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

export class RamenApiClient {
  private port: number;

  constructor(port: number) {
    this.port = port;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const wsClient = await initializeWebSocketClient(`ws://localhost:${this.port}/ws`);
      const response = await wsClient.systemHealth();
      return response.health_status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async executeGraph(graphData: RamenGraph): Promise<ApiResponse> {
    try {
      const wsClient = await initializeWebSocketClient(`ws://localhost:${this.port}/ws`);
      const response = await wsClient.executeGraph({ graph: graphData });

      return {
        success: true,
        message: 'Graph execution started',
        data: response,
      };
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
      const wsClient = await initializeWebSocketClient(`ws://localhost:${this.port}/ws`);
      const response = await wsClient.loadGraph(filePath);

      return {
        success: true,
        message: response.message || 'Graph loaded successfully',
        data: response.graph,
      };
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
      const wsClient = await initializeWebSocketClient(`ws://localhost:${this.port}/ws`);
      const response = await wsClient.gitValidate(graphData);

      return {
        success: response.valid,
        message: response.valid ? 'Graph is valid' : 'Graph validation failed',
        data: response,
      };
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
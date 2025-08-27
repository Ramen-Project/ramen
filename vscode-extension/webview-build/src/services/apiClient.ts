/**
 * API Client for connecting to Ramen backend
 */

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
  private baseUrl: string;
  
  constructor(port: number) {
    this.baseUrl = `http://localhost:${port}/api`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async executeGraph(graphData: RamenGraph): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/graphs/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphData),
      });
      
      return await response.json();
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
      const response = await fetch(`${this.baseUrl}/graphs/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          graph: graphData,
        }),
      });
      
      return await response.json();
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
      const response = await fetch(`${this.baseUrl}/graphs/load?path=${encodeURIComponent(filePath)}`);
      return await response.json();
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
      const response = await fetch(`${this.baseUrl}/graphs/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphData),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Validate graph failed:', error);
      return {
        success: false,
        message: `Failed to validate graph: ${error}`,
      };
    }
  }

  // Project management
  async createProject(name: string, description?: string, location?: string): Promise<ApiResponse<ProjectInfo>> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          location,
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Create project failed:', error);
      return {
        success: false,
        message: `Failed to create project: ${error}`,
      };
    }
  }

  async loadProject(path: string): Promise<ApiResponse<ProjectInfo>> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/load?path=${encodeURIComponent(path)}`);
      return await response.json();
    } catch (error) {
      console.error('Load project failed:', error);
      return {
        success: false,
        message: `Failed to load project: ${error}`,
      };
    }
  }

  async saveProject(filePath: string, project: ProjectInfo): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          project,
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Save project failed:', error);
      return {
        success: false,
        message: `Failed to save project: ${error}`,
      };
    }
  }

  async syncProject(projectPath: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectPath,
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Sync project failed:', error);
      return {
        success: false,
        message: `Failed to sync project: ${error}`,
      };
    }
  }

  async listRecentProjects(): Promise<ApiResponse<ProjectInfo[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/list`);
      const data = await response.json();
      
      return {
        success: data.success,
        message: data.success ? 'Projects loaded' : 'Failed to load projects',
        data: data.projects,
      };
    } catch (error) {
      console.error('List projects failed:', error);
      return {
        success: false,
        message: `Failed to list projects: ${error}`,
      };
    }
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
  // Extract port from baseUrl
  const match = (client as any).baseUrl.match(/:(\d+)\//);
  return match ? parseInt(match[1]) : 8000;
}
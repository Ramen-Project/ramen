/**
 * 圖形序列化和反序列化工具
 * 處理 Ramen 圖形和專案的 JSON 序列化/反序列化
 */

import { 
  RamenGraph, 
  RamenProject, 
  RamenGraphFile, 
  RamenProjectFile, 
  RamenFileHeader,
  GRAPH_FORMAT_VERSION 
} from '../types/graph';

/**
 * 圖形序列化器
 */
export class GraphSerializer {
  
  /**
   * 將圖形轉換為 JSON 字符串
   */
  static toJSON(graph: RamenGraph, pretty: boolean = true): string {
    return JSON.stringify(graph, null, pretty ? 2 : 0);
  }

  /**
   * 將專案轉換為 JSON 字符串
   */
  static projectToJSON(project: RamenProject, pretty: boolean = true): string {
    return JSON.stringify(project, null, pretty ? 2 : 0);
  }

  /**
   * 創建圖形檔案格式 (.ramen)
   */
  static createGraphFile(graph: RamenGraph): RamenGraphFile {
    const header: RamenFileHeader = {
      format: 'ramen-graph',
      version: GRAPH_FORMAT_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: process.env.REACT_APP_VERSION
    };

    return {
      header,
      graph
    };
  }

  /**
   * 創建專案檔案格式 (.ramen-project)
   */
  static createProjectFile(project: RamenProject): RamenProjectFile {
    const header: RamenFileHeader = {
      format: 'ramen-project',
      version: GRAPH_FORMAT_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: process.env.REACT_APP_VERSION
    };

    return {
      header,
      project
    };
  }

  /**
   * 保存圖形為 .ramen 檔案
   */
  static saveGraph(graph: RamenGraph, filename?: string): void {
    const graphFile = this.createGraphFile(graph);
    const json = JSON.stringify(graphFile, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${graph.metadata.name}.ramen`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 保存專案為 .ramen-project 檔案
   */
  static saveProject(project: RamenProject, filename?: string): void {
    const projectFile = this.createProjectFile(project);
    const json = JSON.stringify(projectFile, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${project.name}.ramen-project`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * 圖形反序列化器
 */
export class GraphDeserializer {

  /**
   * 從 JSON 字符串解析圖形
   */
  static fromJSON(json: string): RamenGraph {
    try {
      const data = JSON.parse(json);
      return this.validateAndParseGraph(data);
    } catch (error) {
      throw new Error(`Failed to parse graph JSON: ${error.message}`);
    }
  }

  /**
   * 從 JSON 字符串解析專案
   */
  static projectFromJSON(json: string): RamenProject {
    try {
      const data = JSON.parse(json);
      return this.validateAndParseProject(data);
    } catch (error) {
      throw new Error(`Failed to parse project JSON: ${error.message}`);
    }
  }

  /**
   * 從檔案載入圖形
   */
  static async loadGraphFromFile(file: File): Promise<RamenGraph> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const fileData = JSON.parse(json) as RamenGraphFile;
          
          // 驗證檔案格式
          if (!fileData.header || fileData.header.format !== 'ramen-graph') {
            throw new Error('Invalid graph file format');
          }
          
          // 檢查版本兼容性
          if (!this.isVersionCompatible(fileData.header.version)) {
            console.warn(`Graph file version ${fileData.header.version} may not be fully compatible with current version ${GRAPH_FORMAT_VERSION}`);
          }
          
          const graph = this.validateAndParseGraph(fileData.graph);
          resolve(graph);
        } catch (error) {
          reject(new Error(`Failed to load graph file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * 從檔案載入專案
   */
  static async loadProjectFromFile(file: File): Promise<RamenProject> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          const fileData = JSON.parse(json) as RamenProjectFile;
          
          // 驗證檔案格式
          if (!fileData.header || fileData.header.format !== 'ramen-project') {
            throw new Error('Invalid project file format');
          }
          
          // 檢查版本兼容性
          if (!this.isVersionCompatible(fileData.header.version)) {
            console.warn(`Project file version ${fileData.header.version} may not be fully compatible with current version ${GRAPH_FORMAT_VERSION}`);
          }
          
          const project = this.validateAndParseProject(fileData.project);
          resolve(project);
        } catch (error) {
          reject(new Error(`Failed to load project file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * 驗證和解析圖形數據
   */
  private static validateAndParseGraph(data: any): RamenGraph {
    // 基本結構驗證
    if (!data.id || !data.metadata || !data.nodes || !data.edges) {
      throw new Error('Invalid graph structure: missing required fields');
    }

    // 驗證元數據
    if (!data.metadata.name || !data.metadata.version) {
      throw new Error('Invalid graph metadata: missing name or version');
    }

    // 驗證節點
    if (!Array.isArray(data.nodes)) {
      throw new Error('Invalid graph structure: nodes must be an array');
    }

    // 驗證邊
    if (!Array.isArray(data.edges)) {
      throw new Error('Invalid graph structure: edges must be an array');
    }

    // 設定預設值
    const graph: RamenGraph = {
      id: data.id,
      metadata: {
        name: data.metadata.name,
        description: data.metadata.description || '',
        createdAt: data.metadata.createdAt || new Date().toISOString(),
        lastModified: data.metadata.lastModified || new Date().toISOString(),
        version: data.metadata.version || '1.0.0',
        author: data.metadata.author,
        tags: data.metadata.tags || []
      },
      nodes: data.nodes || [],
      edges: data.edges || [],
      variables: data.variables || [],
      viewport: data.viewport,
      config: data.config
    };

    return graph;
  }

  /**
   * 驗證和解析專案數據
   */
  private static validateAndParseProject(data: any): RamenProject {
    // 基本結構驗證
    if (!data.id || !data.name || !data.graphs) {
      throw new Error('Invalid project structure: missing required fields');
    }

    // 驗證圖形列表
    if (!Array.isArray(data.graphs)) {
      throw new Error('Invalid project structure: graphs must be an array');
    }

    // 驗證每個圖形
    const graphs = data.graphs.map((graphData: any) => this.validateAndParseGraph(graphData));

    const project: RamenProject = {
      id: data.id,
      name: data.name,
      description: data.description || '',
      graphs,
      config: data.config,
      createdAt: data.createdAt || new Date().toISOString(),
      lastModified: data.lastModified || new Date().toISOString(),
      version: data.version || '1.0.0'
    };

    return project;
  }

  /**
   * 檢查版本兼容性
   */
  private static isVersionCompatible(fileVersion: string): boolean {
    const [fileMajor] = fileVersion.split('.').map(Number);
    const [currentMajor] = GRAPH_FORMAT_VERSION.split('.').map(Number);
    
    // 主版本號相同就認為兼容
    return fileMajor === currentMajor;
  }
}

/**
 * 格式驗證器
 */
export class FormatValidator {

  /**
   * 驗證檔案是否為有效的 Ramen 格式
   */
  static isValidRamenFile(file: File): boolean {
    return file.name.endsWith('.ramen') || file.name.endsWith('.ramen-project');
  }

  /**
   * 驗證 JSON 是否為有效的圖形格式
   */
  static isValidGraphJSON(json: string): boolean {
    try {
      const data = JSON.parse(json);
      return !!(data.id && data.metadata && data.nodes && data.edges);
    } catch {
      return false;
    }
  }

  /**
   * 驗證 JSON 是否為有效的專案格式
   */
  static isValidProjectJSON(json: string): boolean {
    try {
      const data = JSON.parse(json);
      return !!(data.id && data.name && data.graphs && Array.isArray(data.graphs));
    } catch {
      return false;
    }
  }

  /**
   * 檢測檔案類型
   */
  static detectFileType(file: File): 'graph' | 'project' | 'unknown' {
    if (file.name.endsWith('.ramen')) {
      return 'graph';
    } else if (file.name.endsWith('.ramen-project')) {
      return 'project';
    } else {
      return 'unknown';
    }
  }
}

/**
 * 圖形轉換工具
 * 用於在新舊格式之間轉換
 */
export class GraphConverter {

  /**
   * 從 ReactFlow 格式轉換為 Ramen 格式
   */
  static fromReactFlow(nodes: any[], edges: any[], metadata: any): RamenGraph {
    const ramenNodes = nodes.map(node => ({
      id: node.id,
      metadata: {
        type: node.type || 'operator',
        name: node.data?.name || node.id,
        namespace: node.data?.namespace || 'default',
        description: node.data?.brief || node.data?.description
      },
      position: node.position,
      size: node.measured || node.style,
      inputs: node.data?.inputs || [],
      outputs: node.data?.outputs || [],
      parentId: node.parentId,
      config: node.data?.config,
      selected: node.selected,
      visible: !node.hidden,
      data: node.data
    }));

    const ramenEdges = edges.map(edge => ({
      id: edge.id,
      sourceNodeId: edge.source,
      sourcePortId: edge.sourceHandle || 'output0',
      targetNodeId: edge.target,
      targetPortId: edge.targetHandle || 'input0',
      label: edge.label,
      selected: edge.selected,
      visible: !edge.hidden,
      style: edge.style,
      data: edge.data
    }));

    return {
      id: metadata.id || `graph-${Date.now()}`,
      metadata: {
        name: metadata.name || 'Untitled Graph',
        description: metadata.description || '',
        createdAt: metadata.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: metadata.version || '1.0.0',
        author: metadata.author,
        tags: metadata.tags || []
      },
      nodes: ramenNodes,
      edges: ramenEdges,
      variables: metadata.variables || [],
      viewport: metadata.viewport,
      config: metadata.config
    };
  }

  /**
   * 轉換為 ReactFlow 格式
   */
  static toReactFlow(graph: RamenGraph): { nodes: any[], edges: any[] } {
    const nodes = graph.nodes.map(node => ({
      id: node.id,
      type: node.metadata.type,
      position: node.position,
      measured: node.size,
      parentId: node.parentId,
      selected: node.selected,
      hidden: !node.visible,
      data: {
        name: node.metadata.name,
        namespace: node.metadata.namespace,
        brief: node.metadata.description,
        inputs: node.inputs,
        outputs: node.outputs,
        config: node.config,
        ...node.data
      },
      style: node.size ? { width: node.size.width, height: node.size.height } : undefined
    }));

    const edges = graph.edges.map(edge => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      sourceHandle: edge.sourcePortId,
      targetHandle: edge.targetPortId,
      label: edge.label,
      selected: edge.selected,
      hidden: !edge.visible,
      style: edge.style,
      data: edge.data
    }));

    return { nodes, edges };
  }
}
/**
 * WebSocket 客戶端 (Node.js 版本)
 * 用於 VSCode Extension 與 Ramen API WebSocket 端點通訊
 */

import WebSocket from 'ws';

export enum MessageType {
  // 連接管理
  CONNECTED = 'connected',
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error',

  // Nodes API
  GET_NODES = 'get_nodes',
  GET_NODE_METADATA = 'get_node_metadata',
  GET_TOPPINGS = 'get_toppings',
  NODES_RESPONSE = 'nodes_response',
  NODE_METADATA_RESPONSE = 'node_metadata_response',
  TOPPINGS_RESPONSE = 'toppings_response',

  // Registry API
  REGISTRY_GET_NODES = 'registry_get_nodes',
  REGISTRY_GET_NODE = 'registry_get_node',
  REGISTRY_GET_CATEGORIES = 'registry_get_categories',
  REGISTRY_GET_NAMESPACES = 'registry_get_namespaces',
  REGISTRY_GET_STATS = 'registry_get_stats',
  REGISTRY_RELOAD = 'registry_reload',
  REGISTRY_RESPONSE = 'registry_response',

  // Execution API
  EXECUTE_GRAPH = 'execute_graph',
  GET_EXECUTION_STATUS = 'get_execution_status',
  GET_EXECUTION_RESULTS = 'get_execution_results',
  CANCEL_EXECUTION = 'cancel_execution',
  EXECUTION_STARTED = 'execution_started',
  EXECUTION_COMPLETED = 'execution_completed',
  EXECUTION_STATUS_RESPONSE = 'execution_status_response',
  EXECUTION_RESULTS_RESPONSE = 'execution_results_response',
  EXECUTION_CANCELLED = 'execution_cancelled',

  // Session Management
  CREATE_SESSION = 'create_session',
  GET_SESSION = 'get_session',
  CLOSE_SESSION = 'close_session',
  LIST_SESSIONS = 'list_sessions',
  SESSION_RESPONSE = 'session_response',
  SESSIONS_RESPONSE = 'sessions_response',

  // Graph API
  LOAD_GRAPH = 'load_graph',
  SAVE_GRAPH = 'save_graph',
  CHECK_DEPENDENCIES = 'check_dependencies',
  LIST_GRAPHS = 'list_graphs',
  GRAPH_RESPONSE = 'graph_response',
  GRAPHS_RESPONSE = 'graphs_response',

  // System API
  GET_SYSTEM_STATS = 'get_system_stats',
  SYSTEM_CLEANUP = 'system_cleanup',
  SYSTEM_HEALTH = 'system_health',
  SYSTEM_RESPONSE = 'system_response',

  // Git API
  GIT_DIFF = 'git_diff',
  GIT_MERGE = 'git_merge',
  GIT_VALIDATE = 'git_validate',
  GIT_HISTORY = 'git_history',
  GIT_BRANCHES = 'git_branches',
  GIT_RESOLVE_CONFLICT = 'git_resolve_conflict',
  GIT_RESPONSE = 'git_response',

  // Frontend Components API
  GET_COMPONENT_MANIFEST = 'get_component_manifest',
  DISCOVER_COMPONENTS = 'discover_components',
  GET_COMPONENT_FOR_NODE = 'get_component_for_node',
  FRONTEND_RESPONSE = 'frontend_response',
}

export interface WebSocketMessage {
  type: MessageType | string;
  request_id?: string;
  timestamp?: string;
  data?: any;
}

export interface WebSocketResponse {
  type: MessageType | string;
  request_id?: string;
  success: boolean;
  timestamp: string;
  data?: any;
  error?: string;
}

type MessageHandler = (response: WebSocketResponse) => void;

export class NodeWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pendingRequests: Map<string, MessageHandler> = new Map();
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private isConnected = false;
  private shouldReconnect = true;
  private requestIdCounter = 0;
  private connectPromise: Promise<void> | null = null;

  constructor(url: string = 'ws://localhost:8000/ws', private clientId?: string) {
    this.url = url;
    this.clientId = clientId || `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 連接到 WebSocket 伺服器
   */
  async connect(): Promise<void> {
    // 如果已經在連接中，返回現有的 promise
    if (this.connectPromise) {
      return this.connectPromise;
    }

    // 如果已經連接，直接返回
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    this.connectPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        const connectTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.terminate();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.on('open', () => {
          console.log(`🍜 [WebSocket:${this.clientId}] Connected to server at ${this.url}`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          clearTimeout(connectTimeout);
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message: WebSocketResponse = JSON.parse(data.toString());
            this.handleMessage(message);

            // 連接成功後 resolve
            if (message.type === MessageType.CONNECTED) {
              this.connectPromise = null;
              resolve();
            }
          } catch (error) {
            console.error(`🍜 [WebSocket:${this.clientId}] Failed to parse message:`, error);
          }
        });

        this.ws.on('error', (error) => {
          console.error(`🍜 [WebSocket:${this.clientId}] Error:`, error);
          clearTimeout(connectTimeout);
          this.connectPromise = null;
          if (!this.isConnected) {
            reject(error);
          }
        });

        this.ws.on('close', () => {
          console.log(`🍜 [WebSocket:${this.clientId}] Connection closed`);
          this.isConnected = false;
          this.connectPromise = null;

          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`🍜 [WebSocket:${this.clientId}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
          }
        });
      } catch (error) {
        this.connectPromise = null;
        reject(error);
      }
    });

    return this.connectPromise;
  }

  /**
   * 斷開連接
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.connectPromise = null;
  }

  /**
   * 發送訊息並等待回應
   */
  async sendRequest<T = any>(type: MessageType | string, data?: any, timeout: number = 10000): Promise<T> {
    // 確保已連接
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const requestId = this.generateRequestId();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout for ${type}`));
      }, timeout);

      const handler: MessageHandler = (response) => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(requestId);

        if (response.success) {
          resolve(response.data as T);
        } else {
          reject(new Error(response.error || 'Request failed'));
        }
      };

      this.pendingRequests.set(requestId, handler);

      const message: WebSocketMessage = {
        type,
        request_id: requestId,
        timestamp: new Date().toISOString(),
        data
      };

      this.ws!.send(JSON.stringify(message));
    });
  }

  /**
   * 處理收到的訊息
   */
  private handleMessage(message: WebSocketResponse): void {
    // 處理有 request_id 的回應
    if (message.request_id) {
      const handler = this.pendingRequests.get(message.request_id);
      if (handler) {
        handler(message);
        return;
      }
    }

    // 處理訂閱的訊息
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  /**
   * 生成請求 ID
   */
  private generateRequestId(): string {
    return `req-${++this.requestIdCounter}-${Date.now()}`;
  }

  /**
   * 檢查連接狀態
   */
  isConnectedToServer(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Ping 伺服器
   */
  async ping(): Promise<void> {
    await this.sendRequest(MessageType.PING);
  }

  // ===== Nodes API =====

  async getNodes(): Promise<any> {
    return this.sendRequest(MessageType.GET_NODES);
  }

  async getNodeMetadata(nodeType: string): Promise<any> {
    return this.sendRequest(MessageType.GET_NODE_METADATA, { node_type: nodeType });
  }

  async getToppings(): Promise<any> {
    return this.sendRequest(MessageType.GET_TOPPINGS);
  }

  // ===== Registry API =====

  async registryGetNodes(filters?: { category?: string; namespace?: string; search?: string }): Promise<any> {
    return this.sendRequest(MessageType.REGISTRY_GET_NODES, filters);
  }

  async registryGetNode(nodeId: string): Promise<any> {
    return this.sendRequest(MessageType.REGISTRY_GET_NODE, { node_id: nodeId });
  }

  async registryGetCategories(): Promise<any> {
    return this.sendRequest(MessageType.REGISTRY_GET_CATEGORIES);
  }

  async registryGetNamespaces(): Promise<any> {
    return this.sendRequest(MessageType.REGISTRY_GET_NAMESPACES);
  }

  async registryGetStats(): Promise<any> {
    return this.sendRequest(MessageType.REGISTRY_GET_STATS);
  }

  // ===== Execution API =====

  async executeGraph(data: { graph: any; inputs?: any; session_id?: string; force_takeover?: boolean; compile_mode?: string }): Promise<any> {
    return this.sendRequest(MessageType.EXECUTE_GRAPH, data);
  }

  async getExecutionStatus(sessionId: string): Promise<any> {
    return this.sendRequest(MessageType.GET_EXECUTION_STATUS, { session_id: sessionId });
  }

  async getExecutionResults(sessionId: string): Promise<any> {
    return this.sendRequest(MessageType.GET_EXECUTION_RESULTS, { session_id: sessionId });
  }

  async cancelExecution(sessionId: string): Promise<any> {
    return this.sendRequest(MessageType.CANCEL_EXECUTION, { session_id: sessionId });
  }

  // ===== Session Management =====

  async createSession(data?: { graph_id?: string; user_id?: string; force_takeover?: boolean }): Promise<any> {
    return this.sendRequest(MessageType.CREATE_SESSION, data);
  }

  async getSession(sessionId: string): Promise<any> {
    return this.sendRequest(MessageType.GET_SESSION, { session_id: sessionId });
  }

  async closeSession(sessionId: string): Promise<any> {
    return this.sendRequest(MessageType.CLOSE_SESSION, { session_id: sessionId });
  }

  async listSessions(data?: { user_id?: string; active_only?: boolean }): Promise<any> {
    return this.sendRequest(MessageType.LIST_SESSIONS, data);
  }

  // ===== Graph API =====

  async loadGraph(path: string): Promise<any> {
    return this.sendRequest(MessageType.LOAD_GRAPH, { path });
  }

  async saveGraph(data: { path: string; graph: any; dependencies?: any }): Promise<any> {
    return this.sendRequest(MessageType.SAVE_GRAPH, data);
  }

  async checkDependencies(graphPath: string): Promise<any> {
    return this.sendRequest(MessageType.CHECK_DEPENDENCIES, { graph_path: graphPath });
  }

  async listGraphs(directory: string = '.'): Promise<any> {
    return this.sendRequest(MessageType.LIST_GRAPHS, { directory });
  }

  // ===== System API =====

  async getSystemStats(): Promise<any> {
    return this.sendRequest(MessageType.GET_SYSTEM_STATS);
  }

  async systemCleanup(): Promise<any> {
    return this.sendRequest(MessageType.SYSTEM_CLEANUP);
  }

  async systemHealth(): Promise<any> {
    return this.sendRequest(MessageType.SYSTEM_HEALTH);
  }

  // ===== Git API =====

  async gitDiff(data: { old_graph: any; new_graph: any; from_version?: string; to_version?: string }): Promise<any> {
    return this.sendRequest(MessageType.GIT_DIFF, data);
  }

  async gitMerge(data: { base_graph: any; left_graph: any; right_graph: any; base_version?: string; left_version?: string; right_version?: string }): Promise<any> {
    return this.sendRequest(MessageType.GIT_MERGE, data);
  }

  async gitValidate(graph: any): Promise<any> {
    return this.sendRequest(MessageType.GIT_VALIDATE, { graph });
  }

  async gitHistory(data: { graph_path: string; max_count?: number; since?: string; until?: string; author?: string }): Promise<any> {
    return this.sendRequest(MessageType.GIT_HISTORY, data);
  }

  async gitBranches(): Promise<any> {
    return this.sendRequest(MessageType.GIT_BRANCHES);
  }

  async gitResolveConflict(data: { conflict_id: string; resolution: string; custom_data?: any }): Promise<any> {
    return this.sendRequest(MessageType.GIT_RESOLVE_CONFLICT, data);
  }

  // ===== Frontend Components API =====

  async getComponentManifest(): Promise<any> {
    return this.sendRequest(MessageType.GET_COMPONENT_MANIFEST);
  }

  async discoverComponents(): Promise<any> {
    return this.sendRequest(MessageType.DISCOVER_COMPONENTS);
  }

  async getComponentForNode(nodeType: string): Promise<any> {
    return this.sendRequest(MessageType.GET_COMPONENT_FOR_NODE, { node_type: nodeType });
  }
}

/**
 * 建立並初始化新的 WebSocket 客戶端
 * 每次調用都會建立新的獨立連接
 */
export async function createWebSocketClient(url: string, clientId?: string): Promise<NodeWebSocketClient> {
  const client = new NodeWebSocketClient(url, clientId);
  await client.connect();
  return client;
}

/**
 * 獲取客戶端 ID
 */
export function getClientId(client: NodeWebSocketClient): string {
  return client['clientId'] || 'unknown';
}
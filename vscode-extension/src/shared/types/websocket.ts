/**
 * WebSocket 訊息協議定義
 * 定義所有 WebSocket 訊息類型和格式
 */

import { UUID, Timestamp } from './common';

/**
 * 訊息類型枚舉
 */
export enum MessageType {
    // Connection
    CONNECTED = 'connected',
    PING = 'ping',
    PONG = 'pong',

    // Nodes API
    GET_NODES = 'get_nodes',
    NODES_RESPONSE = 'nodes_response',
    GET_NODE_METADATA = 'get_node_metadata',
    NODE_METADATA_RESPONSE = 'node_metadata_response',
    GET_TOPPINGS = 'get_toppings',
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
    EXECUTION_STARTED = 'execution_started',
    EXECUTION_COMPLETED = 'execution_completed',
    EXECUTION_CANCELLED = 'execution_cancelled',
    GET_EXECUTION_STATUS = 'get_execution_status',
    EXECUTION_STATUS_RESPONSE = 'execution_status_response',
    GET_EXECUTION_RESULTS = 'get_execution_results',
    EXECUTION_RESULTS_RESPONSE = 'execution_results_response',
    CANCEL_EXECUTION = 'cancel_execution',

    // Session API
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

    // Type Converter API
    GET_TYPE_CONVERTERS = 'get_type_converters',
    TYPE_CONVERTERS_RESPONSE = 'type_converters_response',

    // Error
    ERROR = 'error',
}

/**
 * WebSocket 訊息基礎結構
 */
export interface WebSocketMessage<T = any> {
    type: MessageType | string;
    request_id?: UUID;
    data?: T;
    timestamp?: Timestamp;
}

/**
 * WebSocket 回應結構
 */
export interface WebSocketResponse<T = any> {
    type: MessageType | string;
    request_id?: UUID;
    success: boolean;
    data?: T;
    timestamp?: Timestamp;
}

/**
 * WebSocket 錯誤結構
 */
export interface WebSocketError {
    type: MessageType.ERROR;
    request_id?: UUID;
    success: false;
    error: string;
    error_code?: string;
    timestamp?: Timestamp;
}

/**
 * 特定訊息類型的 payload 定義
 */

// Nodes API
export interface GetNodesRequest {
    category?: string;
    namespace?: string;
    search?: string;
}

export interface NodesResponse {
    nodes: Record<string, any[]>;
    total_count: number;
}

// Graph API
export interface LoadGraphRequest {
    path: string;
}

export interface SaveGraphRequest {
    path: string;
    graph: any;
}

// Session API
export interface CreateSessionRequest {
    graph_id?: UUID;
    user_id?: string;
    force_takeover?: boolean;
}

export interface SessionInfo {
    session_id: UUID;
    graph_id?: UUID;
    user_id?: string;
    created_at: Timestamp;
    last_activity: Timestamp;
    is_active: boolean;
    current_state?: any;
}

// Execution API
export interface ExecuteGraphRequest {
    graph: any;
    inputs?: Record<string, any>;
    session_id?: UUID;
    force_takeover?: boolean;
    compile_mode?: string;
}

export interface ExecutionResult {
    session_id: UUID;
    execution_id?: UUID;
    outputs?: Record<string, any>;
    errors?: string[];
    execution_time?: number;
}

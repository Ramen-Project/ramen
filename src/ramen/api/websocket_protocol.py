"""
統一的 WebSocket 訊息協議
定義所有 API 端點的 WebSocket 訊息格式和處理邏輯
"""

from enum import Enum
from typing import Any, Dict, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class MessageType(str, Enum):
    """WebSocket 訊息類型"""
    # 連接管理
    CONNECT = "connect"
    CONNECTED = "connected"
    DISCONNECT = "disconnect"
    PING = "ping"
    PONG = "pong"
    ERROR = "error"

    # Nodes API
    GET_NODES = "get_nodes"
    GET_NODE_METADATA = "get_node_metadata"
    GET_TOPPINGS = "get_toppings"
    NODES_RESPONSE = "nodes_response"
    NODE_METADATA_RESPONSE = "node_metadata_response"
    TOPPINGS_RESPONSE = "toppings_response"

    # Registry API
    REGISTRY_GET_NODES = "registry_get_nodes"
    REGISTRY_GET_NODE = "registry_get_node"
    REGISTRY_GET_CATEGORIES = "registry_get_categories"
    REGISTRY_GET_NAMESPACES = "registry_get_namespaces"
    REGISTRY_GET_STATS = "registry_get_stats"
    REGISTRY_RELOAD = "registry_reload"
    REGISTRY_RESPONSE = "registry_response"

    # Execution API
    EXECUTE_GRAPH = "execute_graph"
    GET_EXECUTION_STATUS = "get_execution_status"
    GET_EXECUTION_RESULTS = "get_execution_results"
    CANCEL_EXECUTION = "cancel_execution"
    EXECUTION_STARTED = "execution_started"
    EXECUTION_COMPLETED = "execution_completed"
    EXECUTION_ERROR = "execution_error"
    EXECUTION_CANCELLED = "execution_cancelled"
    EXECUTION_STATUS_RESPONSE = "execution_status_response"
    EXECUTION_RESULTS_RESPONSE = "execution_results_response"

    # Session Management
    CREATE_SESSION = "create_session"
    GET_SESSION = "get_session"
    CLOSE_SESSION = "close_session"
    LIST_SESSIONS = "list_sessions"
    SESSION_RESPONSE = "session_response"
    SESSIONS_RESPONSE = "sessions_response"

    # Graph API
    LOAD_GRAPH = "load_graph"
    SAVE_GRAPH = "save_graph"
    CHECK_DEPENDENCIES = "check_dependencies"
    LIST_GRAPHS = "list_graphs"
    GRAPH_RESPONSE = "graph_response"
    GRAPHS_RESPONSE = "graphs_response"

    # System API
    GET_SYSTEM_STATS = "get_system_stats"
    SYSTEM_CLEANUP = "system_cleanup"
    SYSTEM_HEALTH = "system_health"
    SYSTEM_RESPONSE = "system_response"

    # Git API
    GIT_DIFF = "git_diff"
    GIT_MERGE = "git_merge"
    GIT_VALIDATE = "git_validate"
    GIT_HISTORY = "git_history"
    GIT_BRANCHES = "git_branches"
    GIT_RESOLVE_CONFLICT = "git_resolve_conflict"
    GIT_RESPONSE = "git_response"

    # Frontend Components API
    GET_COMPONENT_MANIFEST = "get_component_manifest"
    DISCOVER_COMPONENTS = "discover_components"
    GET_COMPONENT_FOR_NODE = "get_component_for_node"
    FRONTEND_RESPONSE = "frontend_response"

    # State Sync
    SUBSCRIBE_NODE = "subscribe_node"
    UNSUBSCRIBE_NODE = "unsubscribe_node"
    NODE_EVENT = "node_event"


class WebSocketMessage(BaseModel):
    """基礎 WebSocket 訊息格式"""
    type: MessageType
    request_id: Optional[str] = Field(None, description="請求 ID，用於匹配請求和回應")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class WebSocketResponse(BaseModel):
    """WebSocket 回應格式"""
    type: MessageType
    request_id: Optional[str] = None
    success: bool = True
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class WebSocketError(BaseModel):
    """WebSocket 錯誤格式"""
    type: MessageType = MessageType.ERROR
    request_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    error: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# ============= Nodes API 訊息格式 =============

class GetNodesRequest(BaseModel):
    """獲取節點列表請求"""
    type: MessageType = MessageType.GET_NODES


class GetNodeMetadataRequest(BaseModel):
    """獲取節點元數據請求"""
    type: MessageType = MessageType.GET_NODE_METADATA
    node_type: str


class GetToppingsRequest(BaseModel):
    """獲取 Toppings 請求"""
    type: MessageType = MessageType.GET_TOPPINGS


# ============= Registry API 訊息格式 =============

class RegistryGetNodesRequest(BaseModel):
    """從註冊表獲取節點請求"""
    type: MessageType = MessageType.REGISTRY_GET_NODES
    category: Optional[str] = None
    namespace: Optional[str] = None
    search: Optional[str] = None


class RegistryGetNodeRequest(BaseModel):
    """從註冊表獲取特定節點請求"""
    type: MessageType = MessageType.REGISTRY_GET_NODE
    node_id: str


class RegistryGetCategoriesRequest(BaseModel):
    """獲取所有分類請求"""
    type: MessageType = MessageType.REGISTRY_GET_CATEGORIES


class RegistryGetNamespacesRequest(BaseModel):
    """獲取所有命名空間請求"""
    type: MessageType = MessageType.REGISTRY_GET_NAMESPACES


class RegistryGetStatsRequest(BaseModel):
    """獲取註冊表統計請求"""
    type: MessageType = MessageType.REGISTRY_GET_STATS


class RegistryReloadRequest(BaseModel):
    """重新載入註冊表請求"""
    type: MessageType = MessageType.REGISTRY_RELOAD


# ============= Execution API 訊息格式 =============

class ExecuteGraphRequest(BaseModel):
    """執行圖形請求"""
    type: MessageType = MessageType.EXECUTE_GRAPH
    graph: Dict[str, Any]
    inputs: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    force_takeover: bool = False
    compile_mode: str = "JIT"


class GetExecutionStatusRequest(BaseModel):
    """獲取執行狀態請求"""
    type: MessageType = MessageType.GET_EXECUTION_STATUS
    session_id: str


class GetExecutionResultsRequest(BaseModel):
    """獲取執行結果請求"""
    type: MessageType = MessageType.GET_EXECUTION_RESULTS
    session_id: str


class CancelExecutionRequest(BaseModel):
    """取消執行請求"""
    type: MessageType = MessageType.CANCEL_EXECUTION
    session_id: str


# ============= Session Management 訊息格式 =============

class CreateSessionRequest(BaseModel):
    """建立會話請求"""
    type: MessageType = MessageType.CREATE_SESSION
    graph_id: Optional[str] = None
    user_id: Optional[str] = None
    force_takeover: bool = False


class GetSessionRequest(BaseModel):
    """獲取會話請求"""
    type: MessageType = MessageType.GET_SESSION
    session_id: str


class CloseSessionRequest(BaseModel):
    """關閉會話請求"""
    type: MessageType = MessageType.CLOSE_SESSION
    session_id: str


class ListSessionsRequest(BaseModel):
    """列出會話請求"""
    type: MessageType = MessageType.LIST_SESSIONS
    user_id: Optional[str] = None
    active_only: bool = True


# ============= Graph API 訊息格式 =============

class LoadGraphRequest(BaseModel):
    """載入圖形請求"""
    type: MessageType = MessageType.LOAD_GRAPH
    path: str


class SaveGraphRequest(BaseModel):
    """保存圖形請求"""
    type: MessageType = MessageType.SAVE_GRAPH
    path: str
    graph: Dict[str, Any]
    dependencies: Optional[Dict[str, Any]] = None


class CheckDependenciesRequest(BaseModel):
    """檢查依賴請求"""
    type: MessageType = MessageType.CHECK_DEPENDENCIES
    graph_path: str


class ListGraphsRequest(BaseModel):
    """列出圖形請求"""
    type: MessageType = MessageType.LIST_GRAPHS
    directory: str = "."


# ============= System API 訊息格式 =============

class GetSystemStatsRequest(BaseModel):
    """獲取系統統計請求"""
    type: MessageType = MessageType.GET_SYSTEM_STATS


class SystemCleanupRequest(BaseModel):
    """系統清理請求"""
    type: MessageType = MessageType.SYSTEM_CLEANUP


class SystemHealthRequest(BaseModel):
    """系統健康檢查請求"""
    type: MessageType = MessageType.SYSTEM_HEALTH


# ============= Git API 訊息格式 =============

class GitDiffRequest(BaseModel):
    """Git 差異請求"""
    type: MessageType = MessageType.GIT_DIFF
    old_graph: Dict[str, Any]
    new_graph: Dict[str, Any]
    from_version: Optional[str] = "old"
    to_version: Optional[str] = "new"


class GitMergeRequest(BaseModel):
    """Git 合併請求"""
    type: MessageType = MessageType.GIT_MERGE
    base_graph: Dict[str, Any]
    left_graph: Dict[str, Any]
    right_graph: Dict[str, Any]
    base_version: Optional[str] = "base"
    left_version: Optional[str] = "ours"
    right_version: Optional[str] = "theirs"


class GitValidateRequest(BaseModel):
    """Git 驗證請求"""
    type: MessageType = MessageType.GIT_VALIDATE
    graph: Dict[str, Any]


class GitHistoryRequest(BaseModel):
    """Git 歷史請求"""
    type: MessageType = MessageType.GIT_HISTORY
    graph_path: str
    max_count: Optional[int] = 10
    since: Optional[str] = None
    until: Optional[str] = None
    author: Optional[str] = None


class GitBranchesRequest(BaseModel):
    """Git 分支請求"""
    type: MessageType = MessageType.GIT_BRANCHES


class GitResolveConflictRequest(BaseModel):
    """Git 衝突解決請求"""
    type: MessageType = MessageType.GIT_RESOLVE_CONFLICT
    conflict_id: str
    resolution: str
    custom_data: Optional[Dict[str, Any]] = None


# ============= Frontend Components API 訊息格式 =============

class GetComponentManifestRequest(BaseModel):
    """獲取元件清單請求"""
    type: MessageType = MessageType.GET_COMPONENT_MANIFEST


class DiscoverComponentsRequest(BaseModel):
    """發現元件請求"""
    type: MessageType = MessageType.DISCOVER_COMPONENTS


class GetComponentForNodeRequest(BaseModel):
    """獲取節點元件請求"""
    type: MessageType = MessageType.GET_COMPONENT_FOR_NODE
    node_type: str
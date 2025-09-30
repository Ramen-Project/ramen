"""
統一的 WebSocket 訊息處理器
處理所有 API 端點的 WebSocket 訊息
"""

import logging
import json
from typing import Dict, Any, Optional
from fastapi import WebSocket
from datetime import datetime

from ramen.api.websocket_protocol import (
    MessageType, WebSocketMessage, WebSocketResponse, WebSocketError
)
from ramen.registry import get_global_registry
from ramen.core.models import RamenGraph, GraphDeserializer, GraphSerializer
from ramen.core.models import RamenGraphFile, RamenFileHeader, GRAPH_FORMAT_VERSION, GraphDependencies
from ramen.loader import GraphLoader
from ramen.engine import SessionManager, GraphCompiler
from ramen.topping.performance import get_system_stats, cleanup_memory
from ramen.topping.frontend_components import get_component_discovery
from ramen.git.diff import GraphDiffer, format_diff_summary
from ramen.git.merge import GraphMerger, ConflictResolution
from pathlib import Path

logger = logging.getLogger(__name__)


class WebSocketMessageHandler:
    """WebSocket 訊息處理器"""

    def __init__(self):
        self.session_manager = SessionManager()
        self.compiler = GraphCompiler()
        self.registry = get_global_registry()
        self.component_discovery = get_component_discovery()

    async def handle_message(
        self,
        websocket: WebSocket,
        message: Dict[str, Any]
    ) -> Optional[WebSocketResponse]:
        """處理 WebSocket 訊息"""
        try:
            # 解析訊息類型
            msg_type = message.get("type")
            request_id = message.get("request_id")
            data = message.get("data", {})

            # 記錄收到的訊息
            logger.info(f"📨 [WebSocket] Received: type={msg_type}, request_id={request_id}")
            if data and msg_type != MessageType.PING:  # Ping 訊息不記錄 data
                logger.debug(f"📨 [WebSocket] Data: {data}")

            if not msg_type:
                logger.warning("⚠️  [WebSocket] Missing message type")
                return self._error_response(
                    "Missing message type",
                    request_id=request_id
                )

            # 根據訊息類型分發處理
            handler_map = {
                # 連接管理
                MessageType.PING: self._handle_ping,

                # Nodes API
                MessageType.GET_NODES: self._handle_get_nodes,
                MessageType.GET_NODE_METADATA: self._handle_get_node_metadata,
                MessageType.GET_TOPPINGS: self._handle_get_toppings,

                # Registry API
                MessageType.REGISTRY_GET_NODES: self._handle_registry_get_nodes,
                MessageType.REGISTRY_GET_NODE: self._handle_registry_get_node,
                MessageType.REGISTRY_GET_CATEGORIES: self._handle_registry_get_categories,
                MessageType.REGISTRY_GET_NAMESPACES: self._handle_registry_get_namespaces,
                MessageType.REGISTRY_GET_STATS: self._handle_registry_get_stats,
                MessageType.REGISTRY_RELOAD: self._handle_registry_reload,

                # Execution API
                MessageType.EXECUTE_GRAPH: self._handle_execute_graph,
                MessageType.GET_EXECUTION_STATUS: self._handle_get_execution_status,
                MessageType.GET_EXECUTION_RESULTS: self._handle_get_execution_results,
                MessageType.CANCEL_EXECUTION: self._handle_cancel_execution,

                # Session Management
                MessageType.CREATE_SESSION: self._handle_create_session,
                MessageType.GET_SESSION: self._handle_get_session,
                MessageType.CLOSE_SESSION: self._handle_close_session,
                MessageType.LIST_SESSIONS: self._handle_list_sessions,

                # Graph API
                MessageType.LOAD_GRAPH: self._handle_load_graph,
                MessageType.SAVE_GRAPH: self._handle_save_graph,
                MessageType.CHECK_DEPENDENCIES: self._handle_check_dependencies,
                MessageType.LIST_GRAPHS: self._handle_list_graphs,

                # System API
                MessageType.GET_SYSTEM_STATS: self._handle_get_system_stats,
                MessageType.SYSTEM_CLEANUP: self._handle_system_cleanup,
                MessageType.SYSTEM_HEALTH: self._handle_system_health,

                # Git API
                MessageType.GIT_DIFF: self._handle_git_diff,
                MessageType.GIT_MERGE: self._handle_git_merge,
                MessageType.GIT_VALIDATE: self._handle_git_validate,
                MessageType.GIT_HISTORY: self._handle_git_history,
                MessageType.GIT_BRANCHES: self._handle_git_branches,
                MessageType.GIT_RESOLVE_CONFLICT: self._handle_git_resolve_conflict,

                # Frontend Components API
                MessageType.GET_COMPONENT_MANIFEST: self._handle_get_component_manifest,
                MessageType.DISCOVER_COMPONENTS: self._handle_discover_components,
                MessageType.GET_COMPONENT_FOR_NODE: self._handle_get_component_for_node,
            }

            handler = handler_map.get(msg_type)
            if handler:
                return await handler(data, request_id, websocket)
            else:
                return self._error_response(
                    f"Unknown message type: {msg_type}",
                    request_id=request_id
                )

        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)
            return self._error_response(
                str(e),
                request_id=message.get("request_id")
            )

    # ============= 工具方法 =============

    def _success_response(
        self,
        response_type: MessageType,
        data: Dict[str, Any],
        request_id: Optional[str] = None
    ) -> WebSocketResponse:
        """建立成功回應"""
        # 記錄發送的回應
        logger.info(f"📤 [WebSocket] Sending: type={response_type}, request_id={request_id}")
        if data and response_type != MessageType.PONG:  # Pong 訊息不記錄 data
            logger.debug(f"📤 [WebSocket] Response data keys: {list(data.keys())}")

        return WebSocketResponse(
            type=response_type,
            request_id=request_id,
            success=True,
            data=data
        )

    def _error_response(
        self,
        error: str,
        request_id: Optional[str] = None,
        error_code: Optional[str] = None
    ) -> WebSocketError:
        """建立錯誤回應"""
        # 記錄錯誤回應
        logger.warning(f"⚠️  [WebSocket] Error response: error={error}, request_id={request_id}, error_code={error_code}")

        return WebSocketError(
            request_id=request_id,
            error=error,
            error_code=error_code
        )

    # ============= 連接管理 =============

    async def _handle_ping(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理 ping"""
        return self._success_response(
            MessageType.PONG,
            {"timestamp": datetime.now().isoformat()},
            request_id
        )

    # ============= Nodes API =============

    async def _handle_get_nodes(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取節點列表"""
        try:
            all_nodes = self.registry.get_all()
            nodes_by_category = {}

            for node_id, node_def in all_nodes.items():
                category = node_def.category or "Uncategorized"
                if category not in nodes_by_category:
                    nodes_by_category[category] = []
                nodes_by_category[category].append(
                    node_def.to_dict(include_executor=False)
                )

            total_nodes = sum(len(nodes) for nodes in nodes_by_category.values())

            return self._success_response(
                MessageType.NODES_RESPONSE,
                {
                    "nodes": nodes_by_category,
                    "total_count": total_nodes
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_get_node_metadata(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取節點元數據"""
        try:
            node_type = data.get("node_type")
            if not node_type:
                return self._error_response("Missing node_type", request_id)

            node_def = self.registry.get(node_type)
            if not node_def:
                return self._error_response(
                    f"Node type {node_type} not found",
                    request_id
                )

            return self._success_response(
                MessageType.NODE_METADATA_RESPONSE,
                {"metadata": node_def.to_dict(include_executor=False)},
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_get_toppings(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取 toppings"""
        try:
            toppings = self.registry.list_toppings()
            topping_info = []

            for topping_name in toppings:
                nodes = self.registry.get_by_topping(topping_name)
                topping_info.append({
                    "name": topping_name,
                    "node_count": len(nodes)
                })

            return self._success_response(
                MessageType.TOPPINGS_RESPONSE,
                {
                    "toppings": topping_info,
                    "total_count": len(topping_info)
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    # ============= Registry API =============

    async def _handle_registry_get_nodes(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理從註冊表獲取節點"""
        try:
            category = data.get("category")
            namespace = data.get("namespace")
            search = data.get("search")

            if search:
                nodes = self.registry.search(
                    query=search,
                    category=category,
                    namespace=namespace
                )
            elif category:
                nodes = self.registry.get_by_category(category)
            elif namespace:
                nodes = self.registry.get_by_namespace(namespace)
            else:
                nodes = list(self.registry.get_all().values())

            nodes_by_category: Dict[str, list] = {}
            for node in nodes:
                cat = node.category
                if cat not in nodes_by_category:
                    nodes_by_category[cat] = []
                nodes_by_category[cat].append(node.to_dict(include_executor=False))

            return self._success_response(
                MessageType.REGISTRY_RESPONSE,
                {
                    "nodes": nodes_by_category,
                    "total_count": len(nodes),
                    "filters": {
                        "category": category,
                        "namespace": namespace,
                        "search": search
                    }
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_registry_get_node(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理從註冊表獲取特定節點"""
        try:
            node_id = data.get("node_id")
            if not node_id:
                return self._error_response("Missing node_id", request_id)

            node = self.registry.get(node_id)
            if not node:
                return self._error_response(
                    f"Node {node_id} not found",
                    request_id
                )

            return self._success_response(
                MessageType.REGISTRY_RESPONSE,
                {"node": node.to_dict(include_executor=False)},
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_registry_get_categories(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取所有分類"""
        try:
            categories = self.registry.list_categories()
            category_info = []

            for cat in categories:
                nodes = self.registry.get_by_category(cat)
                category_info.append({
                    "name": cat,
                    "node_count": len(nodes)
                })

            return self._success_response(
                MessageType.REGISTRY_RESPONSE,
                {
                    "categories": category_info,
                    "total_categories": len(categories)
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_registry_get_namespaces(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取所有命名空間"""
        try:
            namespaces = self.registry.list_namespaces()
            namespace_info = []

            for ns in namespaces:
                nodes = self.registry.get_by_namespace(ns)
                namespace_info.append({
                    "name": ns,
                    "node_count": len(nodes)
                })

            return self._success_response(
                MessageType.REGISTRY_RESPONSE,
                {
                    "namespaces": namespace_info,
                    "total_namespaces": len(namespaces)
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_registry_get_stats(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取註冊表統計"""
        try:
            stats = self.registry.stats()
            return self._success_response(
                MessageType.REGISTRY_RESPONSE,
                {"stats": stats},
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_registry_reload(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理重新載入註冊表"""
        try:
            return self._success_response(
                MessageType.REGISTRY_RESPONSE,
                {
                    "total_nodes": self.registry.count(),
                    "message": "Nodes are automatically registered on import"
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    # ============= Execution API =============

    async def _handle_execute_graph(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理執行圖形"""
        try:
            graph_data = data.get("graph")
            inputs = data.get("inputs")
            session_id = data.get("session_id")
            force_takeover = data.get("force_takeover", False)
            compile_mode = data.get("compile_mode", "JIT")

            if not graph_data:
                return self._error_response("Missing graph data", request_id)

            # 反序列化圖形
            graph = GraphDeserializer.from_dict(graph_data, RamenGraph)

            # 獲取或建立會話
            if session_id:
                session = self.session_manager.get_session(session_id)
                if not session:
                    return self._error_response(
                        f"Session {session_id} not found",
                        request_id
                    )
            else:
                session = self.session_manager.get_or_create_session(
                    graph_id=graph.id,
                    force_takeover=force_takeover
                )

            # 發送執行開始訊息
            await websocket.send_json({
                "type": MessageType.EXECUTION_STARTED,
                "request_id": request_id,
                "session_id": session.session_id,
                "graph_id": graph.id,
                "timestamp": datetime.now().isoformat()
            })

            # 執行圖形
            result = await session.execute_async(
                graph,
                inputs,
                self.compiler if compile_mode else None
            )

            # 發送執行完成訊息
            return self._success_response(
                MessageType.EXECUTION_COMPLETED,
                {
                    "session_id": session.session_id,
                    "execution_id": result.context.execution_id if result.context else "",
                    "outputs": result.outputs,
                    "errors": [str(e) for e in result.errors],
                    "execution_time": result.context.execution_time if result.context else None
                },
                request_id
            )

        except Exception as e:
            logger.error(f"Execution error: {e}", exc_info=True)
            return self._error_response(str(e), request_id)

    async def _handle_get_execution_status(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取執行狀態"""
        try:
            session_id = data.get("session_id")
            if not session_id:
                return self._error_response("Missing session_id", request_id)

            session = self.session_manager.get_session(session_id)
            if not session:
                return self._error_response(
                    f"Session {session_id} not found",
                    request_id
                )

            status = session.get_current_execution() or {
                "session_id": session_id,
                "state": "idle"
            }

            return self._success_response(
                MessageType.EXECUTION_STATUS_RESPONSE,
                status,
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_get_execution_results(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取執行結果"""
        try:
            session_id = data.get("session_id")
            if not session_id:
                return self._error_response("Missing session_id", request_id)

            session = self.session_manager.get_session(session_id)
            if not session:
                return self._error_response(
                    f"Session {session_id} not found",
                    request_id
                )

            if not session.execution_history:
                return self._error_response(
                    "No execution results available",
                    request_id
                )

            latest_result = session.execution_history[-1]

            return self._success_response(
                MessageType.EXECUTION_RESULTS_RESPONSE,
                latest_result.to_dict(),
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_cancel_execution(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理取消執行"""
        try:
            session_id = data.get("session_id")
            if not session_id:
                return self._error_response("Missing session_id", request_id)

            session = self.session_manager.get_session(session_id)
            if not session:
                return self._error_response(
                    f"Session {session_id} not found",
                    request_id
                )

            session.cancel()

            return self._success_response(
                MessageType.EXECUTION_CANCELLED,
                {
                    "message": "Execution cancelled",
                    "session_id": session_id
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    # ============= Session Management =============

    async def _handle_create_session(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理建立會話"""
        try:
            graph_id = data.get("graph_id")
            user_id = data.get("user_id")
            force_takeover = data.get("force_takeover", False)

            session = self.session_manager.create_session(
                graph_id=graph_id,
                user_id=user_id,
                force_takeover=force_takeover
            )

            return self._success_response(
                MessageType.SESSION_RESPONSE,
                {
                    "session_id": session.session_id,
                    "graph_id": session.graph_id,
                    "user_id": session.user_id,
                    "created_at": session.created_at.isoformat(),
                    "last_activity": session.last_activity.isoformat(),
                    "is_active": True,
                    "current_state": None
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_get_session(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取會話"""
        try:
            session_id = data.get("session_id")
            if not session_id:
                return self._error_response("Missing session_id", request_id)

            session = self.session_manager.get_session(session_id)
            if not session:
                return self._error_response(
                    f"Session {session_id} not found",
                    request_id
                )

            status = session.get_status()

            return self._success_response(
                MessageType.SESSION_RESPONSE,
                status,
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_close_session(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理關閉會話"""
        try:
            session_id = data.get("session_id")
            if not session_id:
                return self._error_response("Missing session_id", request_id)

            self.session_manager.close_session(session_id)

            return self._success_response(
                MessageType.SESSION_RESPONSE,
                {
                    "message": "Session closed",
                    "session_id": session_id
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_list_sessions(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理列出會話"""
        try:
            user_id = data.get("user_id")
            active_only = data.get("active_only", True)

            sessions = self.session_manager.list_sessions(
                user_id=user_id,
                active_only=active_only
            )

            return self._success_response(
                MessageType.SESSIONS_RESPONSE,
                {"sessions": sessions},
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    # ============= Graph API =============

    async def _handle_load_graph(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理載入圖形"""
        try:
            path = data.get("path")
            if not path:
                return self._error_response("Missing path", request_id)

            loader = GraphLoader()
            graph = loader.load_graph(path)

            graph_dict = GraphSerializer.to_dict(graph)

            dependencies = None
            if hasattr(graph, 'dependencies') and graph.dependencies:
                dependencies = GraphSerializer.to_dict(graph.dependencies)

            return self._success_response(
                MessageType.GRAPH_RESPONSE,
                {
                    "message": f"Successfully loaded graph: {graph.metadata.name}",
                    "graph": graph_dict,
                    "dependencies": dependencies
                },
                request_id
            )
        except FileNotFoundError as e:
            return self._error_response(f"File not found: {e}", request_id)
        except Exception as e:
            return self._error_response(f"Failed to load graph: {e}", request_id)

    async def _handle_save_graph(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理保存圖形"""
        try:
            path = data.get("path")
            graph_data = data.get("graph")
            dependencies_data = data.get("dependencies")

            if not path or not graph_data:
                return self._error_response("Missing path or graph data", request_id)

            # 反序列化圖形
            graph = GraphDeserializer.from_dict(graph_data, RamenGraph)

            # 處理依賴
            dependencies = None
            if dependencies_data:
                dependencies = GraphDeserializer.from_dict(
                    dependencies_data,
                    GraphDependencies
                )

            # 建立完整的檔案結構
            graph_file = RamenGraphFile(
                header=RamenFileHeader(
                    format="ramen-graph",
                    version=GRAPH_FORMAT_VERSION,
                ),
                graph=graph,
                metadata=graph.metadata,
                dependencies=dependencies
            )

            # 序列化並保存
            file_path = Path(path)
            file_path.parent.mkdir(parents=True, exist_ok=True)

            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(
                    GraphSerializer.to_dict(graph_file),
                    f,
                    indent=2,
                    ensure_ascii=False
                )

            return self._success_response(
                MessageType.GRAPH_RESPONSE,
                {"message": f"Successfully saved graph to {path}"},
                request_id
            )
        except Exception as e:
            return self._error_response(f"Failed to save graph: {e}", request_id)

    async def _handle_check_dependencies(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理檢查依賴"""
        try:
            graph_path = data.get("graph_path")
            if not graph_path:
                return self._error_response("Missing graph_path", request_id)

            loader = GraphLoader()
            missing, available = loader.check_dependencies(graph_path)

            return self._success_response(
                MessageType.GRAPH_RESPONSE,
                {
                    "missing": missing,
                    "available": available
                },
                request_id
            )
        except FileNotFoundError as e:
            return self._error_response(f"File not found: {e}", request_id)
        except Exception as e:
            return self._error_response(
                f"Failed to check dependencies: {e}",
                request_id
            )

    async def _handle_list_graphs(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理列出圖形"""
        try:
            directory = data.get("directory", ".")
            dir_path = Path(directory)

            if not dir_path.exists():
                return self._error_response(
                    f"Directory not found: {directory}",
                    request_id
                )

            graphs = []
            for file_path in dir_path.rglob("*.ramen"):
                try:
                    loader = GraphLoader()
                    graph = loader.load_graph(str(file_path))
                    graphs.append({
                        "path": str(file_path),
                        "id": graph.id,
                        "name": graph.metadata.name,
                        "description": graph.metadata.description
                    })
                except Exception:
                    continue

            return self._success_response(
                MessageType.GRAPHS_RESPONSE,
                {
                    "message": f"Found {len(graphs)} graphs",
                    "graphs": graphs
                },
                request_id
            )
        except Exception as e:
            return self._error_response(f"Failed to list graphs: {e}", request_id)

    # ============= System API =============

    async def _handle_get_system_stats(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取系統統計"""
        try:
            stats = get_system_stats()
            return self._success_response(
                MessageType.SYSTEM_RESPONSE,
                {"stats": stats},
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_system_cleanup(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理系統清理"""
        try:
            cleanup_stats = cleanup_memory()
            return self._success_response(
                MessageType.SYSTEM_RESPONSE,
                {
                    "message": "System cleanup completed",
                    "cleanup_stats": cleanup_stats
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_system_health(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理系統健康檢查"""
        try:
            stats = get_system_stats()

            health_status = "healthy"
            issues = []

            # 檢查性能問題
            perf_stats = stats.get("performance", {})
            for metric, metric_data in perf_stats.items():
                if metric_data.get("average", 0) > 1.0:
                    issues.append(f"Slow {metric}: {metric_data['average']:.3f}s avg")
                    health_status = "warning"

            # 檢查記憶體使用
            memory_stats = stats.get("memory", {})
            gc_objects = memory_stats.get("gc_objects", 0)
            if gc_objects > 10000:
                issues.append(f"High memory usage: {gc_objects} objects")
                health_status = "warning"

            return self._success_response(
                MessageType.SYSTEM_RESPONSE,
                {
                    "health_status": health_status,
                    "issues": issues,
                    "stats": stats
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    # ============= Git API =============

    async def _handle_git_diff(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理 Git 差異"""
        try:
            old_graph_data = data.get("old_graph")
            new_graph_data = data.get("new_graph")
            from_version = data.get("from_version", "old")
            to_version = data.get("to_version", "new")

            if not old_graph_data or not new_graph_data:
                return self._error_response(
                    "Missing old_graph or new_graph",
                    request_id
                )

            # 解析圖形數據
            if 'graph' in old_graph_data:
                old_graph_data = old_graph_data['graph']
            if 'graph' in new_graph_data:
                new_graph_data = new_graph_data['graph']

            old_graph = GraphDeserializer.from_dict(old_graph_data, RamenGraph)
            new_graph = GraphDeserializer.from_dict(new_graph_data, RamenGraph)

            # 執行差異比較
            differ = GraphDiffer()
            diff_result = differ.compare(
                old_graph,
                new_graph,
                from_version,
                to_version
            )

            # 轉換為回應格式
            response_data = {
                "from_version": diff_result.from_version,
                "to_version": diff_result.to_version,
                "total_changes": diff_result.total_changes,
                "nodes_added": [
                    {
                        "node_id": diff.node_id,
                        "changes": diff.changes,
                        "diff_type": diff.diff_type.value,
                        "new_data": diff.new_data
                    }
                    for diff in diff_result.nodes_added
                ],
                "nodes_removed": [
                    {
                        "node_id": diff.node_id,
                        "changes": diff.changes,
                        "diff_type": diff.diff_type.value,
                        "old_data": diff.old_data
                    }
                    for diff in diff_result.nodes_removed
                ],
                "nodes_modified": [
                    {
                        "node_id": diff.node_id,
                        "changes": diff.changes,
                        "diff_type": diff.diff_type.value,
                        "old_data": diff.old_data,
                        "new_data": diff.new_data
                    }
                    for diff in diff_result.nodes_modified
                ],
                "nodes_moved": [
                    {
                        "node_id": diff.node_id,
                        "changes": diff.changes,
                        "diff_type": diff.diff_type.value,
                        "old_data": diff.old_data,
                        "new_data": diff.new_data
                    }
                    for diff in diff_result.nodes_moved
                ],
                "edges_added": [
                    {
                        "edge_id": diff.edge_id,
                        "changes": diff.changes,
                        "diff_type": diff.diff_type.value,
                        "new_data": diff.new_data
                    }
                    for diff in diff_result.edges_added
                ],
                "edges_removed": [
                    {
                        "edge_id": diff.edge_id,
                        "changes": diff.changes,
                        "diff_type": diff.diff_type.value,
                        "old_data": diff.old_data
                    }
                    for diff in diff_result.edges_removed
                ],
                "edges_modified": [
                    {
                        "edge_id": diff.edge_id,
                        "changes": diff.changes,
                        "diff_type": diff.diff_type.value,
                        "old_data": diff.old_data,
                        "new_data": diff.new_data
                    }
                    for diff in diff_result.edges_modified
                ],
                "metadata_changes": diff_result.metadata_changes,
                "summary": format_diff_summary(diff_result)
            }

            return self._success_response(
                MessageType.GIT_RESPONSE,
                response_data,
                request_id
            )
        except Exception as e:
            return self._error_response(f"Failed to compute diff: {e}", request_id)

    async def _handle_git_merge(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理 Git 合併"""
        try:
            base_graph_data = data.get("base_graph")
            left_graph_data = data.get("left_graph")
            right_graph_data = data.get("right_graph")
            base_version = data.get("base_version", "base")
            left_version = data.get("left_version", "ours")
            right_version = data.get("right_version", "theirs")

            if not all([base_graph_data, left_graph_data, right_graph_data]):
                return self._error_response(
                    "Missing base_graph, left_graph, or right_graph",
                    request_id
                )

            # 解析圖形數據
            def extract_graph_data(graph_dict):
                if 'graph' in graph_dict:
                    return graph_dict['graph']
                return graph_dict

            base_data = extract_graph_data(base_graph_data)
            left_data = extract_graph_data(left_graph_data)
            right_data = extract_graph_data(right_graph_data)

            base_graph = GraphDeserializer.from_dict(base_data, RamenGraph)
            left_graph = GraphDeserializer.from_dict(left_data, RamenGraph)
            right_graph = GraphDeserializer.from_dict(right_data, RamenGraph)

            # 執行三方合併
            merger = GraphMerger()
            merge_result = merger.three_way_merge(
                base_graph,
                left_graph,
                right_graph,
                base_version,
                left_version,
                right_version
            )

            # 轉換衝突為回應格式
            conflicts_response = []
            for conflict in merge_result.conflicts:
                conflicts_response.append({
                    "conflict_id": conflict.conflict_id,
                    "conflict_type": conflict.conflict_type.value,
                    "element_id": conflict.element_id,
                    "element_type": conflict.element_type,
                    "description": conflict.description,
                    "left_data": conflict.left_data,
                    "right_data": conflict.right_data,
                    "base_data": conflict.base_data,
                    "auto_resolution_suggestion": (
                        conflict.auto_resolution_suggestion.value
                        if conflict.auto_resolution_suggestion else None
                    ),
                    "auto_resolution_confidence": conflict.auto_resolution_confidence
                })

            response_data = {
                "success": merge_result.success,
                "has_conflicts": merge_result.has_conflicts,
                "auto_merged_count": merge_result.auto_merged_count,
                "manual_required_count": merge_result.manual_required_count,
                "merge_summary": merge_result.merge_summary,
                "base_version": merge_result.base_version,
                "left_version": merge_result.left_version,
                "right_version": merge_result.right_version,
                "conflicts": conflicts_response,
                "merged_graph": (
                    merge_result.merged_graph.__dict__
                    if merge_result.merged_graph else None
                )
            }

            return self._success_response(
                MessageType.GIT_RESPONSE,
                response_data,
                request_id
            )
        except Exception as e:
            return self._error_response(f"Failed to perform merge: {e}", request_id)

    async def _handle_git_validate(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理 Git 驗證"""
        try:
            graph_data = data.get("graph")
            if not graph_data:
                return self._error_response("Missing graph", request_id)

            # 嘗試解析圖形
            if 'graph' in graph_data:
                graph_data = graph_data['graph']

            graph = GraphDeserializer.from_dict(graph_data, RamenGraph)

            response_data = {
                "valid": True,
                "graph_id": graph.id,
                "nodes": len(graph.nodes),
                "edges": len(graph.edges),
                "metadata": {
                    "name": graph.metadata.name,
                    "version": graph.metadata.version
                }
            }

            return self._success_response(
                MessageType.GIT_RESPONSE,
                response_data,
                request_id
            )
        except Exception as e:
            return self._success_response(
                MessageType.GIT_RESPONSE,
                {
                    "valid": False,
                    "error": str(e),
                    "details": "Graph format validation failed"
                },
                request_id
            )

    async def _handle_git_history(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理 Git 歷史"""
        import subprocess

        try:
            graph_path = data.get("graph_path")
            max_count = data.get("max_count", 10)
            since = data.get("since")
            until = data.get("until")
            author = data.get("author")

            if not graph_path:
                return self._error_response("Missing graph_path", request_id)

            # 建構 git log 命令
            cmd = [
                "git", "log",
                "--format=%H|%h|%an|%ae|%ad|%at|%s|%b|%P|%D",
                "--date=iso",
                f"-{max_count}"
            ]

            if since:
                cmd.extend([f"--since={since}"])
            if until:
                cmd.extend([f"--until={until}"])
            if author:
                cmd.extend([f"--author={author}"])

            cmd.append("--")
            cmd.append(graph_path)

            # 執行 git log
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
            if result.returncode != 0:
                return self._error_response(
                    f"Git history not found: {result.stderr}",
                    request_id
                )

            # 解析提交記錄
            commits = []
            commit_lines = result.stdout.strip().split('\n\n')

            for commit_block in commit_lines:
                if not commit_block.strip():
                    continue

                lines = commit_block.strip().split('\n')
                if not lines:
                    continue

                parts = lines[0].split('|')
                if len(parts) < 8:
                    continue

                commit_info = {
                    "hash": parts[0],
                    "short_hash": parts[1],
                    "author": parts[2],
                    "author_email": parts[3],
                    "date": parts[4],
                    "timestamp": int(parts[5]) if parts[5].isdigit() else 0,
                    "subject": parts[6],
                    "body": parts[7] if len(parts) > 7 else "",
                    "parents": parts[8].split() if len(parts) > 8 and parts[8] else [],
                    "refs": [
                        ref.strip() for ref in parts[9].split(',') if ref.strip()
                    ] if len(parts) > 9 else []
                }
                commits.append(commit_info)

            # 獲取分支信息
            branches_result = subprocess.run(
                ["git", "branch", "-a"],
                capture_output=True,
                text=True,
                cwd="."
            )

            branches = []
            current_branch = ""

            if branches_result.returncode == 0:
                for line in branches_result.stdout.split('\n'):
                    line = line.strip()
                    if line.startswith('*'):
                        current_branch = line[2:].strip()
                        branches.append(current_branch)
                    elif line and not line.startswith('remotes/'):
                        branches.append(line)

            response_data = {
                "graph_path": graph_path,
                "total_commits": len(commits),
                "commits": commits,
                "branches": branches,
                "current_branch": current_branch
            }

            return self._success_response(
                MessageType.GIT_RESPONSE,
                response_data,
                request_id
            )
        except subprocess.CalledProcessError as e:
            return self._error_response(f"Git command failed: {e}", request_id)
        except Exception as e:
            return self._error_response(
                f"Failed to get git history: {e}",
                request_id
            )

    async def _handle_git_branches(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理 Git 分支"""
        import subprocess

        try:
            result = subprocess.run(
                ["git", "branch", "-a"],
                capture_output=True,
                text=True,
                cwd="."
            )

            if result.returncode != 0:
                return self._error_response("Failed to get branches", request_id)

            branches = []
            current_branch = ""

            for line in result.stdout.split('\n'):
                line = line.strip()
                if line.startswith('*'):
                    current_branch = line[2:].strip()
                    branches.append({"name": current_branch, "current": True})
                elif line and not line.startswith('remotes/'):
                    branches.append({"name": line, "current": False})

            response_data = {
                "current_branch": current_branch,
                "branches": branches
            }

            return self._success_response(
                MessageType.GIT_RESPONSE,
                response_data,
                request_id
            )
        except Exception as e:
            return self._error_response(f"Failed to get branches: {e}", request_id)

    async def _handle_git_resolve_conflict(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理 Git 衝突解決"""
        try:
            conflict_id = data.get("conflict_id")
            resolution = data.get("resolution")
            custom_data = data.get("custom_data")

            if not conflict_id or not resolution:
                return self._error_response(
                    "Missing conflict_id or resolution",
                    request_id
                )

            # 驗證解決策略
            try:
                conflict_resolution = ConflictResolution(resolution)
            except ValueError:
                return self._error_response(
                    f"Invalid resolution strategy: {resolution}",
                    request_id
                )

            response_data = {
                "conflict_id": conflict_id,
                "resolution": conflict_resolution.value,
                "status": "resolved",
                "custom_data": custom_data
            }

            return self._success_response(
                MessageType.GIT_RESPONSE,
                response_data,
                request_id
            )
        except Exception as e:
            return self._error_response(
                f"Failed to resolve conflict: {e}",
                request_id
            )

    # ============= Frontend Components API =============

    async def _handle_get_component_manifest(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取元件清單"""
        try:
            manifest = self.component_discovery.generate_component_manifest()
            return self._success_response(
                MessageType.FRONTEND_RESPONSE,
                {"manifest": manifest},
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_discover_components(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理發現元件"""
        try:
            components = self.component_discovery.discover_components_from_toppings()

            return self._success_response(
                MessageType.FRONTEND_RESPONSE,
                {
                    "components": components,
                    "total_packages": len(components),
                    "total_components": sum(
                        len(pkg_components)
                        for pkg_components in components.values()
                    )
                },
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)

    async def _handle_get_component_for_node(
        self,
        data: Dict[str, Any],
        request_id: Optional[str],
        websocket: WebSocket
    ) -> WebSocketResponse:
        """處理獲取節點元件"""
        try:
            node_type = data.get("node_type")
            if not node_type:
                return self._error_response("Missing node_type", request_id)

            component_info = self.component_discovery.get_component_for_node(node_type)

            if not component_info:
                return self._success_response(
                    MessageType.FRONTEND_RESPONSE,
                    {
                        "component": None,
                        "message": f"No frontend component found for node type: {node_type}"
                    },
                    request_id
                )

            return self._success_response(
                MessageType.FRONTEND_RESPONSE,
                {"component": component_info},
                request_id
            )
        except Exception as e:
            return self._error_response(str(e), request_id)


# 全域訊息處理器實例
_handler_instance: Optional[WebSocketMessageHandler] = None


def get_message_handler() -> WebSocketMessageHandler:
    """獲取全域訊息處理器實例"""
    global _handler_instance
    if _handler_instance is None:
        _handler_instance = WebSocketMessageHandler()
    return _handler_instance

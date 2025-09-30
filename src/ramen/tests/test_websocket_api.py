"""
WebSocket API 測試
測試統一的 WebSocket 端點和訊息處理
"""

import pytest
import json
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket

from ramen.main_api import app
from ramen.api.websocket_protocol import MessageType


class TestWebSocketAPI:
    """WebSocket API 測試類別"""

    @pytest.fixture
    def client(self):
        """建立測試客戶端"""
        # 確保節點已註冊
        import ramen.nodes.core
        import ramen.nodes.math
        import ramen.nodes.logic
        import ramen.nodes.string
        import ramen.nodes.type
        import ramen.nodes.flow
        import ramen.nodes.object
        import ramen.nodes.debug
        import ramen.nodes.collection

        return TestClient(app)

    def test_websocket_connection(self, client):
        """測試 WebSocket 連接"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            data = websocket.receive_json()
            assert data["type"] == "connected"
            assert "session_id" in data
            assert "timestamp" in data

    def test_ping_pong(self, client):
        """測試 ping/pong"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送 ping
            websocket.send_json({
                "type": MessageType.PING,
                "request_id": "test-ping-1"
            })

            # 接收 pong
            response = websocket.receive_json()
            assert response["type"] == MessageType.PONG
            assert response["request_id"] == "test-ping-1"
            assert "timestamp" in response["data"]

    def test_get_nodes(self, client):
        """測試獲取節點列表"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送獲取節點請求
            websocket.send_json({
                "type": MessageType.GET_NODES,
                "request_id": "test-get-nodes-1"
            })

            # 接收回應
            response = websocket.receive_json()
            assert response["type"] == MessageType.NODES_RESPONSE
            assert response["request_id"] == "test-get-nodes-1"
            assert response["success"] is True
            assert "nodes" in response["data"]
            assert "total_count" in response["data"]
            assert response["data"]["total_count"] > 0

    def test_get_node_metadata(self, client):
        """測試獲取節點元數據"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送獲取節點元數據請求（使用存在的節點類型）
            websocket.send_json({
                "type": MessageType.GET_NODE_METADATA,
                "request_id": "test-get-node-metadata-1",
                "data": {
                    "node_type": "core.input"
                }
            })

            # 接收回應
            response = websocket.receive_json()
            assert response["type"] == MessageType.NODE_METADATA_RESPONSE
            assert response["request_id"] == "test-get-node-metadata-1"
            assert response["success"] is True
            assert "metadata" in response["data"]

    def test_get_toppings(self, client):
        """測試獲取 toppings"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送獲取 toppings 請求
            websocket.send_json({
                "type": MessageType.GET_TOPPINGS,
                "request_id": "test-get-toppings-1"
            })

            # 接收回應
            response = websocket.receive_json()
            assert response["type"] == MessageType.TOPPINGS_RESPONSE
            assert response["request_id"] == "test-get-toppings-1"
            assert response["success"] is True
            assert "toppings" in response["data"]
            assert "total_count" in response["data"]

    def test_registry_get_categories(self, client):
        """測試獲取註冊表分類"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送獲取分類請求
            websocket.send_json({
                "type": MessageType.REGISTRY_GET_CATEGORIES,
                "request_id": "test-get-categories-1"
            })

            # 接收回應
            response = websocket.receive_json()
            assert response["type"] == MessageType.REGISTRY_RESPONSE
            assert response["request_id"] == "test-get-categories-1"
            assert response["success"] is True
            assert "categories" in response["data"]
            assert "total_categories" in response["data"]

    def test_registry_get_stats(self, client):
        """測試獲取註冊表統計"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送獲取統計請求
            websocket.send_json({
                "type": MessageType.REGISTRY_GET_STATS,
                "request_id": "test-get-stats-1"
            })

            # 接收回應
            response = websocket.receive_json()
            assert response["type"] == MessageType.REGISTRY_RESPONSE
            assert response["request_id"] == "test-get-stats-1"
            assert response["success"] is True
            assert "stats" in response["data"]

    def test_create_session(self, client):
        """測試建立會話"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送建立會話請求
            websocket.send_json({
                "type": MessageType.CREATE_SESSION,
                "request_id": "test-create-session-1",
                "data": {
                    "graph_id": "test-graph",
                    "user_id": "test-user"
                }
            })

            # 接收回應
            response = websocket.receive_json()
            assert response["type"] == MessageType.SESSION_RESPONSE
            assert response["request_id"] == "test-create-session-1"
            assert response["success"] is True
            assert "session_id" in response["data"]
            assert response["data"]["graph_id"] == "test-graph"
            assert response["data"]["user_id"] == "test-user"

    def test_get_system_stats(self, client):
        """測試獲取系統統計"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送獲取系統統計請求
            websocket.send_json({
                "type": MessageType.GET_SYSTEM_STATS,
                "request_id": "test-get-system-stats-1"
            })

            # 接收回應
            response = websocket.receive_json()
            assert response["type"] == MessageType.SYSTEM_RESPONSE
            assert response["request_id"] == "test-get-system-stats-1"
            assert response["success"] is True
            assert "stats" in response["data"]

    def test_system_health(self, client):
        """測試系統健康檢查"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送系統健康檢查請求
            websocket.send_json({
                "type": MessageType.SYSTEM_HEALTH,
                "request_id": "test-system-health-1"
            })

            # 接收回應
            response = websocket.receive_json()
            assert response["type"] == MessageType.SYSTEM_RESPONSE
            assert response["request_id"] == "test-system-health-1"
            assert response["success"] is True
            assert "health_status" in response["data"]

    def test_invalid_message_type(self, client):
        """測試無效的訊息類型"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送無效的訊息
            websocket.send_json({
                "type": "invalid_type",
                "request_id": "test-invalid-1"
            })

            # 接收錯誤回應
            response = websocket.receive_json()
            assert response["type"] == MessageType.ERROR
            assert response["request_id"] == "test-invalid-1"
            assert "error" in response

    def test_missing_message_type(self, client):
        """測試缺少訊息類型"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送缺少類型的訊息
            websocket.send_json({
                "request_id": "test-missing-type-1"
            })

            # 接收錯誤回應
            response = websocket.receive_json()
            assert response["type"] == MessageType.ERROR
            assert response["request_id"] == "test-missing-type-1"
            assert "Missing message type" in response["error"]

    def test_invalid_json(self, client):
        """測試無效的 JSON"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送無效的 JSON
            websocket.send_text("invalid json")

            # 接收錯誤回應
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "Invalid JSON" in response["error"]

    def test_multiple_requests(self, client):
        """測試多個請求"""
        with client.websocket_connect("/ws") as websocket:
            # 接收連接成功訊息
            websocket.receive_json()

            # 發送多個請求
            requests = [
                {
                    "type": MessageType.GET_NODES,
                    "request_id": "req-1"
                },
                {
                    "type": MessageType.GET_TOPPINGS,
                    "request_id": "req-2"
                },
                {
                    "type": MessageType.REGISTRY_GET_STATS,
                    "request_id": "req-3"
                }
            ]

            responses = []
            for request in requests:
                websocket.send_json(request)
                response = websocket.receive_json()
                responses.append(response)

            # 驗證所有回應
            assert len(responses) == 3
            assert responses[0]["request_id"] == "req-1"
            assert responses[0]["type"] == MessageType.NODES_RESPONSE
            assert responses[1]["request_id"] == "req-2"
            assert responses[1]["type"] == MessageType.TOPPINGS_RESPONSE
            assert responses[2]["request_id"] == "req-3"
            assert responses[2]["type"] == MessageType.REGISTRY_RESPONSE


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
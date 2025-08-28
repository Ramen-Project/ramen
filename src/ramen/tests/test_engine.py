"""
執行引擎測試
"""

import unittest
import asyncio
from datetime import datetime
from pathlib import Path
import tempfile
import shutil

from ramen.core.models import (
    RamenGraph, RamenNode, RamenEdge,
    NodeMetadata, Position, Port,
    GraphMetadata
)
from ramen.engine import (
    GraphExecutor,
    GraphCompiler,
    ExecutionContext,
    NodeContext,
    ExecutionSession,
    SessionManager
)
from ramen.engine.context import ExecutionState
from ramen.engine.errors import NodeExecutionError, CompilationError, SessionError
from ramen.engine.compiler import CompiledGraph


class TestExecutionContext(unittest.TestCase):
    """測試執行上下文"""
    
    def test_create_context(self):
        """測試建立執行上下文"""
        context = ExecutionContext(graph_id="test-graph")
        
        self.assertIsNotNone(context.execution_id)
        self.assertEqual(context.graph_id, "test-graph")
        self.assertEqual(context.state, ExecutionState.IDLE)
        self.assertEqual(context.progress, 0.0)
    
    def test_node_context_management(self):
        """測試節點上下文管理"""
        context = ExecutionContext()
        
        # 添加節點上下文
        node_ctx = context.add_node_context("node1", "operator")
        self.assertIsNotNone(node_ctx)
        self.assertEqual(node_ctx.node_id, "node1")
        self.assertEqual(node_ctx.node_type, "operator")
        
        # 獲取節點上下文
        retrieved = context.get_node_context("node1")
        self.assertEqual(retrieved, node_ctx)
        
        # 不存在的節點
        self.assertIsNone(context.get_node_context("node999"))
    
    def test_variable_management(self):
        """測試變數管理"""
        context = ExecutionContext()
        
        # 設置變數
        context.set_variable("x", 42)
        context.set_variable("y", "hello")
        
        # 獲取變數
        self.assertEqual(context.get_variable("x"), 42)
        self.assertEqual(context.get_variable("y"), "hello")
        self.assertEqual(context.get_variable("z", "default"), "default")
    
    def test_execution_tracking(self):
        """測試執行追蹤"""
        context = ExecutionContext()
        context.execution_order = ["node1", "node2", "node3"]
        
        # 初始進度
        self.assertEqual(context.progress, 0.0)
        
        # 標記節點執行
        context.mark_node_executed("node1")
        self.assertAlmostEqual(context.progress, 1/3)
        self.assertTrue(context.is_node_executed("node1"))
        
        context.mark_node_executed("node2")
        self.assertAlmostEqual(context.progress, 2/3)
        
        context.mark_node_executed("node3")
        self.assertAlmostEqual(context.progress, 1.0)
    
    def test_state_transitions(self):
        """測試狀態轉換"""
        context = ExecutionContext()
        
        # 開始執行
        context.mark_running()
        self.assertEqual(context.state, ExecutionState.RUNNING)
        self.assertIsNotNone(context.start_time)
        
        # 完成執行
        context.mark_completed()
        self.assertEqual(context.state, ExecutionState.COMPLETED)
        self.assertIsNotNone(context.end_time)
        self.assertIsNotNone(context.execution_time)
        
        # 錯誤狀態
        context2 = ExecutionContext()
        error = Exception("Test error")
        context2.mark_error(error)
        self.assertEqual(context2.state, ExecutionState.ERROR)
        self.assertEqual(context2.error, error)


class TestGraphExecutor(unittest.TestCase):
    """測試圖形執行器"""
    
    def setUp(self):
        """設置測試環境"""
        self.executor = GraphExecutor()
        
        # 註冊測試節點執行器
        def add_node(context: NodeContext):
            a = context.get_input("a", 0)
            b = context.get_input("b", 0)
            context.set_output("result", a + b)
        
        def multiply_node(context: NodeContext):
            a = context.get_input("a", 1)
            b = context.get_input("b", 1)
            context.set_output("result", a * b)
        
        self.executor.register_node("test.add", add_node)
        self.executor.register_node("test.multiply", multiply_node)
    
    def create_test_graph(self) -> RamenGraph:
        """建立測試圖形"""
        # 建立圖形
        graph = RamenGraph(
            id="test-graph",
            metadata=GraphMetadata(name="Test Graph"),
            nodes=[
                RamenNode(
                    id="node1",
                    metadata=NodeMetadata(
                        type="add",
                        name="Add",
                        namespace="test"
                    ),
                    position=Position(x=0, y=0),
                    inputs=[
                        Port(id="a", name="A", type_id="int", is_input=True),
                        Port(id="b", name="B", type_id="int", is_input=True)
                    ],
                    outputs=[
                        Port(id="result", name="Result", type_id="int", is_input=False)
                    ]
                ),
                RamenNode(
                    id="node2",
                    metadata=NodeMetadata(
                        type="multiply",
                        name="Multiply",
                        namespace="test"
                    ),
                    position=Position(x=100, y=0),
                    inputs=[
                        Port(id="a", name="A", type_id="int", is_input=True),
                        Port(id="b", name="B", type_id="int", is_input=True)
                    ],
                    outputs=[
                        Port(id="result", name="Result", type_id="int", is_input=False)
                    ]
                )
            ],
            edges=[
                RamenEdge(
                    id="edge1",
                    source_node_id="node1",
                    source_port_id="result",
                    target_node_id="node2",
                    target_port_id="a"
                )
            ]
        )
        
        return graph
    
    def test_graph_validation(self):
        """測試圖形驗證"""
        graph = self.create_test_graph()
        
        # 有效圖形
        errors = self.executor.validate_graph(graph)
        self.assertEqual(len(errors), 0)
        
        # 無效的節點類型
        invalid_graph = RamenGraph(
            id="invalid",
            metadata=GraphMetadata(name="Invalid"),
            nodes=[
                RamenNode(
                    id="node1",
                    metadata=NodeMetadata(
                        type="unknown",
                        name="Unknown",
                        namespace="test"
                    ),
                    position=Position(x=0, y=0)
                )
            ]
        )
        errors = self.executor.validate_graph(invalid_graph)
        self.assertTrue(len(errors) > 0)
    
    def test_topological_sort(self):
        """測試拓撲排序"""
        graph = self.create_test_graph()
        order = self.executor._topological_sort(graph)
        
        # node1 應該在 node2 之前
        self.assertEqual(order.index("node1") < order.index("node2"), True)
    
    def test_sync_execution(self):
        """測試同步執行"""
        graph = self.create_test_graph()
        self.executor.enable_async = False
        
        # 建立輸入上下文
        context = ExecutionContext(graph_id=graph.id)
        context.nodes["node1"] = NodeContext(node_id="node1", node_type="add")
        context.nodes["node1"].set_input("a", 5)
        context.nodes["node1"].set_input("b", 3)
        context.nodes["node2"] = NodeContext(node_id="node2", node_type="multiply")
        context.nodes["node2"].set_input("b", 2)
        
        # 執行圖形
        result = self.executor.execute(graph, context=context)
        
        # 驗證結果
        self.assertTrue(result.success)
        self.assertEqual(result.context.state, ExecutionState.COMPLETED)
        
        # node1: 5 + 3 = 8
        # node2: 8 * 2 = 16
        node2_outputs = result.outputs.get("node2", {})
        self.assertEqual(node2_outputs.get("result"), 16)
    
    def test_async_execution(self):
        """測試異步執行"""
        async def run_test():
            graph = self.create_test_graph()
            
            context = ExecutionContext(graph_id=graph.id)
            context.nodes["node1"] = NodeContext(node_id="node1", node_type="add")
            context.nodes["node1"].set_input("a", 10)
            context.nodes["node1"].set_input("b", 5)
            context.nodes["node2"] = NodeContext(node_id="node2", node_type="multiply")
            context.nodes["node2"].set_input("b", 3)
            
            result = await self.executor.execute_async(graph, context=context)
            
            self.assertTrue(result.success)
            node2_outputs = result.outputs.get("node2", {})
            self.assertEqual(node2_outputs.get("result"), 45)  # (10+5)*3
        
        asyncio.run(run_test())
    
    def test_execution_error_handling(self):
        """測試執行錯誤處理"""
        # 建立會導致錯誤的節點
        def error_node(context: NodeContext):
            raise ValueError("Test error")
        
        self.executor.register_node("test.error", error_node)
        
        graph = RamenGraph(
            id="error-graph",
            metadata=GraphMetadata(name="Error Graph"),
            nodes=[
                RamenNode(
                    id="error_node",
                    metadata=NodeMetadata(
                        type="error",
                        name="Error",
                        namespace="test"
                    ),
                    position=Position(x=0, y=0)
                )
            ]
        )
        
        # 執行應該失敗
        self.executor.enable_async = False
        with self.assertRaises(NodeExecutionError):
            self.executor.execute(graph)


class TestGraphCompiler(unittest.TestCase):
    """測試圖形編譯器"""
    
    def setUp(self):
        """設置測試環境"""
        self.temp_dir = tempfile.mkdtemp()
        self.compiler = GraphCompiler(
            cache_dir=Path(self.temp_dir) / "cache",
            enable_cache=True
        )
    
    def tearDown(self):
        """清理測試環境"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_test_graph(self) -> RamenGraph:
        """建立測試圖形"""
        return RamenGraph(
            id="compile-test",
            metadata=GraphMetadata(name="Compile Test"),
            nodes=[
                RamenNode(
                    id="input",
                    metadata=NodeMetadata(
                        type="variable",
                        name="Input",
                        namespace="core"
                    ),
                    position=Position(x=0, y=0)
                ),
                RamenNode(
                    id="process",
                    metadata=NodeMetadata(
                        type="operator",
                        name="Process",
                        namespace="core"
                    ),
                    position=Position(x=100, y=0)
                )
            ],
            edges=[
                RamenEdge(
                    id="edge1",
                    source_node_id="input",
                    source_port_id="value",
                    target_node_id="process",
                    target_port_id="input"
                )
            ]
        )
    
    def test_jit_compilation(self):
        """測試 JIT 編譯"""
        graph = self.create_test_graph()
        
        # 編譯圖形
        compiled = self.compiler.compile_jit(graph)
        
        self.assertIsNotNone(compiled)
        self.assertEqual(compiled.graph_id, graph.id)
        self.assertIsNotNone(compiled.bytecode)
        self.assertIsNotNone(compiled.source_code)
        self.assertEqual(compiled.metadata["compilation_mode"], "JIT")
    
    def test_aot_compilation(self):
        """測試 AOT 編譯"""
        graph = self.create_test_graph()
        output_path = Path(self.temp_dir) / "compiled.graph"
        
        # AOT 編譯
        compiled = self.compiler.compile_aot(graph, output_path)
        
        self.assertIsNotNone(compiled)
        self.assertEqual(compiled.metadata["compilation_mode"], "AOT")
        self.assertTrue(output_path.exists())
        
        # 載入編譯結果
        loaded = CompiledGraph.load(output_path)
        self.assertEqual(loaded.graph_id, graph.id)
    
    def test_compilation_cache(self):
        """測試編譯快取"""
        graph = self.create_test_graph()
        
        # 第一次編譯
        compiled1 = self.compiler.compile_jit(graph)
        
        # 第二次編譯應該從快取取得
        compiled2 = self.compiler.compile_jit(graph)
        
        self.assertEqual(compiled1.graph_hash, compiled2.graph_hash)
        
        # 清除快取
        self.compiler.clear_cache()
        
        # 清除後應該重新編譯
        compiled3 = self.compiler.compile_jit(graph)
        self.assertIsNotNone(compiled3)
    
    def test_topological_sort_with_cycle(self):
        """測試循環依賴檢測"""
        graph = RamenGraph(
            id="cycle-graph",
            metadata=GraphMetadata(name="Cycle Graph"),
            nodes=[
                RamenNode(
                    id="node1",
                    metadata=NodeMetadata(type="op", name="N1", namespace="test"),
                    position=Position(x=0, y=0)
                ),
                RamenNode(
                    id="node2",
                    metadata=NodeMetadata(type="op", name="N2", namespace="test"),
                    position=Position(x=0, y=0)
                )
            ],
            edges=[
                RamenEdge(
                    id="e1",
                    source_node_id="node1",
                    source_port_id="out",
                    target_node_id="node2",
                    target_port_id="in"
                ),
                RamenEdge(
                    id="e2",
                    source_node_id="node2",
                    source_port_id="out",
                    target_node_id="node1",
                    target_port_id="in"
                )
            ]
        )
        
        # 應該拋出編譯錯誤
        with self.assertRaises(CompilationError):
            self.compiler.compile_jit(graph)


class TestSessionManager(unittest.TestCase):
    """測試會話管理"""
    
    def setUp(self):
        """設置測試環境"""
        self.manager = SessionManager(max_sessions=5)
    
    def tearDown(self):
        """清理測試環境"""
        self.manager.shutdown()
    
    def test_create_session(self):
        """測試建立會話"""
        session = self.manager.create_session(graph_id="test-graph")
        
        self.assertIsNotNone(session)
        self.assertIsNotNone(session.session_id)
        self.assertEqual(session.graph_id, "test-graph")
        self.assertTrue(session._is_active)
    
    def test_get_session(self):
        """測試獲取會話"""
        session = self.manager.create_session(graph_id="test-graph")
        
        # 通過 ID 獲取
        retrieved = self.manager.get_session(session_id=session.session_id)
        self.assertEqual(retrieved, session)
        
        # 通過圖形 ID 獲取
        retrieved2 = self.manager.get_session(graph_id="test-graph")
        self.assertEqual(retrieved2, session)
        
        # 不存在的會話
        self.assertIsNone(self.manager.get_session(session_id="invalid"))
    
    def test_session_takeover(self):
        """測試會話接管"""
        # 建立第一個會話
        session1 = self.manager.create_session(graph_id="test-graph")
        
        # 嘗試建立同一圖形的會話應該失敗
        with self.assertRaises(SessionError):
            self.manager.create_session(graph_id="test-graph")
        
        # 強制接管
        session2 = self.manager.create_session(
            graph_id="test-graph",
            force_takeover=True
        )
        
        self.assertIsNotNone(session2)
        self.assertNotEqual(session1.session_id, session2.session_id)
        self.assertFalse(session1._is_active)
    
    def test_session_limit(self):
        """測試會話數量限制"""
        # 建立最大數量的會話
        sessions = []
        for i in range(5):
            session = self.manager.create_session(graph_id=f"graph-{i}")
            sessions.append(session)
        
        # 超過限制應該失敗
        with self.assertRaises(SessionError):
            self.manager.create_session(graph_id="graph-overflow")
    
    def test_list_sessions(self):
        """測試列出會話"""
        # 建立幾個會話
        self.manager.create_session(graph_id="graph1", user_id="user1")
        self.manager.create_session(graph_id="graph2", user_id="user1")
        self.manager.create_session(graph_id="graph3", user_id="user2")
        
        # 列出所有會話
        all_sessions = self.manager.list_sessions()
        self.assertEqual(len(all_sessions), 3)
        
        # 列出特定用戶的會話
        user1_sessions = self.manager.list_sessions(user_id="user1")
        self.assertEqual(len(user1_sessions), 2)
        
        user2_sessions = self.manager.list_sessions(user_id="user2")
        self.assertEqual(len(user2_sessions), 1)


if __name__ == "__main__":
    unittest.main()
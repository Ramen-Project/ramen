"""
圖形執行器
負責執行編譯後的圖形
"""

from typing import Dict, Any, Optional, List, Callable, Set
from dataclasses import dataclass
import asyncio
import inspect
from collections import deque

from ramen.core.models import RamenGraph, RamenNode, RamenEdge
from ramen.engine.context import ExecutionContext, NodeContext, ExecutionState
from ramen.engine.errors import (
    NodeExecutionError,
    EdgeExecutionError,
    ExecutionError,
    ValidationError,
    TimeoutError
)


@dataclass
class ExecutionResult:
    """執行結果"""
    success: bool
    context: ExecutionContext
    outputs: Dict[str, Any]
    errors: List[Exception]
    
    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典"""
        return {
            "success": self.success,
            "execution_id": self.context.execution_id,
            "state": self.context.state.value,
            "outputs": self.outputs,
            "errors": [str(e) for e in self.errors],
            "execution_time": self.context.execution_time,
            "progress": self.context.progress,
            "node_results": self.context.get_node_results()
        }


class GraphExecutor:
    """圖形執行器"""
    
    def __init__(
        self,
        node_registry: Optional[Dict[str, Callable]] = None,
        max_parallel_nodes: int = 10,
        node_timeout: float = 300.0,  # 5 分鐘
        enable_async: bool = True
    ):
        self.node_registry = node_registry or {}
        self.max_parallel_nodes = max_parallel_nodes
        self.node_timeout = node_timeout
        self.enable_async = enable_async
        
        # 執行狀態
        self._current_context: Optional[ExecutionContext] = None
        self._cancellation_token: Optional[asyncio.Event] = None
    
    def register_node(self, node_type: str, executor: Callable):
        """註冊節點執行器"""
        self.node_registry[node_type] = executor
    
    def validate_graph(self, graph: RamenGraph) -> List[str]:
        """驗證圖形結構"""
        errors = []

        # 檢查節點是否有對應的執行器
        for node in graph.nodes:
            node_type = f"{node.metadata.namespace}.{node.metadata.type}"
            if node_type not in self.node_registry:
                errors.append(f"No executor found for node type: {node_type}")

        # 檢查邊的連接是否有效
        node_ids = {node.id for node in graph.nodes}
        for edge in graph.edges:
            if edge.source_node_id not in node_ids:
                errors.append(f"Edge {edge.id} has invalid source node: {edge.source_node_id}")
            if edge.target_node_id not in node_ids:
                errors.append(f"Edge {edge.id} has invalid target node: {edge.target_node_id}")

        # 檢查是否有循環依賴
        if self._has_cycle(graph):
            errors.append("Graph contains cyclic dependencies")

        # 驗證 Import 和 Export 節點
        import_export_errors = self._validate_import_export_nodes(graph)
        errors.extend(import_export_errors)

        return errors

    def _validate_import_export_nodes(self, graph: RamenGraph) -> List[str]:
        """驗證 Import 和 Export 節點的特殊規則"""
        import re
        errors = []

        # Python 變數命名規則：字母或底線開頭，只含字母、數字、底線
        python_identifier_pattern = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')

        # 收集所有的 Import 和 Export 節點
        import_nodes = []
        export_nodes = []
        node_map = {node.id: node for node in graph.nodes}

        for node in graph.nodes:
            node_type = f"{node.metadata.namespace}.{node.metadata.type}"
            if node_type == "graph.import":
                import_nodes.append(node)
            elif node_type == "graph.export":
                export_nodes.append(node)

        # 驗證 Import 節點
        import_names = {}  # {import_name: node_id}
        for node in import_nodes:
            # 獲取 import_name
            import_name = node.data.get("import_name", "input") if node.data else "input"

            # 檢查命名規範
            if not python_identifier_pattern.match(import_name):
                errors.append(
                    f"Import node '{node.id}' has invalid import_name '{import_name}': "
                    f"must be a valid Python identifier (letters, numbers, underscore; cannot start with number)"
                )

            # 檢查重複的 import_name
            if import_name in import_names:
                errors.append(
                    f"Duplicate import_name '{import_name}' found in nodes '{import_names[import_name]}' and '{node.id}'"
                )
            else:
                import_names[import_name] = node.id

            # 檢查 Import 節點不應該有輸入連接
            has_input = any(edge.target_node_id == node.id for edge in graph.edges)
            if has_input:
                errors.append(
                    f"Import node '{node.id}' (import_name: '{import_name}') should not have input connections - "
                    f"Import nodes are entry points and receive data from parent graph"
                )

        # 驗證 Export 節點
        export_names = {}  # {export_name: node_id}
        for node in export_nodes:
            # 獲取 export_name
            export_name = node.data.get("export_name", "output") if node.data else "output"

            # 檢查命名規範
            if not python_identifier_pattern.match(export_name):
                errors.append(
                    f"Export node '{node.id}' has invalid export_name '{export_name}': "
                    f"must be a valid Python identifier (letters, numbers, underscore; cannot start with number)"
                )

            # 檢查重複的 export_name
            if export_name in export_names:
                errors.append(
                    f"Duplicate export_name '{export_name}' found in nodes '{export_names[export_name]}' and '{node.id}'"
                )
            else:
                export_names[export_name] = node.id

            # 檢查 Export 節點必須有輸入連接
            has_input = any(edge.target_node_id == node.id for edge in graph.edges)
            if not has_input:
                errors.append(
                    f"Export node '{node.id}' (export_name: '{export_name}') must have an input connection - "
                    f"Export nodes need data to export"
                )

        return errors

    def _has_cycle(self, graph: RamenGraph) -> bool:
        """檢查圖形是否有循環"""
        # 建立鄰接表
        adj_list = {node.id: [] for node in graph.nodes}
        for edge in graph.edges:
            adj_list[edge.source_node_id].append(edge.target_node_id)
        
        # DFS 檢測循環
        visited = set()
        rec_stack = set()
        
        def has_cycle_util(node_id: str) -> bool:
            visited.add(node_id)
            rec_stack.add(node_id)
            
            for neighbor in adj_list[node_id]:
                if neighbor not in visited:
                    if has_cycle_util(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            
            rec_stack.remove(node_id)
            return False
        
        for node_id in adj_list:
            if node_id not in visited:
                if has_cycle_util(node_id):
                    return True
        
        return False
    
    def _topological_sort(self, graph: RamenGraph) -> List[str]:
        """拓撲排序，獲取節點執行順序"""
        # 計算入度
        in_degree = {node.id: 0 for node in graph.nodes}
        adj_list = {node.id: [] for node in graph.nodes}
        
        for edge in graph.edges:
            adj_list[edge.source_node_id].append(edge.target_node_id)
            in_degree[edge.target_node_id] += 1
        
        # 找出所有入度為 0 的節點
        queue = deque([node_id for node_id, degree in in_degree.items() if degree == 0])
        result = []
        
        while queue:
            node_id = queue.popleft()
            result.append(node_id)
            
            # 減少相鄰節點的入度
            for neighbor in adj_list[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        return result
    
    def _get_node_dependencies(self, graph: RamenGraph, node_id: str) -> Set[str]:
        """獲取節點的所有依賴"""
        dependencies = set()
        for edge in graph.edges:
            if edge.target_node_id == node_id:
                dependencies.add(edge.source_node_id)
        return dependencies
    
    def _get_node_dependents(self, graph: RamenGraph, node_id: str) -> Set[str]:
        """獲取依賴該節點的所有節點"""
        dependents = set()
        for edge in graph.edges:
            if edge.source_node_id == node_id:
                dependents.add(edge.target_node_id)
        return dependents
    
    async def _execute_node_async(
        self,
        node: RamenNode,
        context: NodeContext,
        executor: Callable
    ) -> Any:
        """異步執行單個節點"""
        try:
            context.mark_running()
            
            # 檢查執行器是否為異步函數
            if inspect.iscoroutinefunction(executor):
                result = await asyncio.wait_for(
                    executor(context),
                    timeout=self.node_timeout
                )
            else:
                # 在執行緒中執行同步函數
                loop = asyncio.get_event_loop()
                result = await asyncio.wait_for(
                    loop.run_in_executor(None, executor, context),
                    timeout=self.node_timeout
                )
            
            context.mark_completed()
            return result
            
        except asyncio.TimeoutError:
            error = TimeoutError(
                f"Node {node.id} execution timed out after {self.node_timeout} seconds",
                timeout_seconds=self.node_timeout,
                node_id=node.id
            )
            context.mark_error(error)
            raise error
        except Exception as e:
            error = NodeExecutionError(
                f"Failed to execute node {node.id}: {str(e)}",
                node_id=node.id,
                node_type=node.metadata.type,
                input_values=context.inputs,
                cause=e
            )
            context.mark_error(error)
            raise error
    
    def _execute_node_sync(
        self,
        node: RamenNode,
        context: NodeContext,
        executor: Callable
    ) -> Any:
        """同步執行單個節點"""
        try:
            context.mark_running()
            result = executor(context)
            context.mark_completed()
            return result
        except Exception as e:
            error = NodeExecutionError(
                f"Failed to execute node {node.id}: {str(e)}",
                node_id=node.id,
                node_type=node.metadata.type,
                input_values=context.inputs,
                cause=e
            )
            context.mark_error(error)
            raise error
    
    def _transfer_data(
        self,
        graph: RamenGraph,
        source_node_id: str,
        target_node_id: str,
        context: ExecutionContext
    ):
        """在節點間傳遞數據"""
        edges = [e for e in graph.edges 
                if e.source_node_id == source_node_id 
                and e.target_node_id == target_node_id]
        
        source_context = context.get_node_context(source_node_id)
        target_context = context.get_node_context(target_node_id)
        
        if not source_context or not target_context:
            return
        
        for edge in edges:
            try:
                # 從源節點輸出埠獲取數據
                value = source_context.get_output(edge.source_port_id)
                
                # 傳遞到目標節點輸入埠
                target_context.set_input(edge.target_port_id, value)
                
                context.log("data_transferred", {
                    "edge_id": edge.id,
                    "source": f"{source_node_id}.{edge.source_port_id}",
                    "target": f"{target_node_id}.{edge.target_port_id}",
                    "value_type": type(value).__name__
                })
                
            except Exception as e:
                raise EdgeExecutionError(
                    f"Failed to transfer data through edge {edge.id}: {str(e)}",
                    edge_id=edge.id,
                    source_node=source_node_id,
                    target_node=target_node_id,
                    source_port=edge.source_port_id,
                    target_port=edge.target_port_id,
                    cause=e
                )
    
    async def execute_async(
        self,
        graph: RamenGraph,
        inputs: Optional[Dict[str, Any]] = None,
        context: Optional[ExecutionContext] = None
    ) -> ExecutionResult:
        """異步執行圖形"""
        # 驗證圖形
        validation_errors = self.validate_graph(graph)
        if validation_errors:
            raise ValidationError(
                "Graph validation failed",
                validation_errors=validation_errors,
                graph_id=graph.id
            )
        
        # 建立執行上下文
        if context is None:
            context = ExecutionContext(graph_id=graph.id)
        self._current_context = context
        
        # 初始化取消令牌
        self._cancellation_token = asyncio.Event()
        
        # 獲取執行順序
        execution_order = self._topological_sort(graph)
        context.execution_order = execution_order
        
        # 為每個節點建立上下文
        node_map = {node.id: node for node in graph.nodes}
        for node_id in execution_order:
            node = node_map[node_id]
            context.add_node_context(node_id, node.metadata.type)
        
        # 設置輸入變數
        if inputs:
            for name, value in inputs.items():
                context.set_variable(name, value)
        
        # 開始執行
        context.mark_running()
        errors = []
        outputs = {}
        
        try:
            # 按照拓撲順序執行節點
            for node_id in execution_order:
                # 檢查是否已取消
                if self._cancellation_token.is_set():
                    context.mark_cancelled()
                    break
                
                node = node_map[node_id]
                node_context = context.get_node_context(node_id)
                
                # 獲取節點執行器
                node_type = f"{node.metadata.namespace}.{node.metadata.type}"
                executor = self.node_registry.get(node_type)
                
                if not executor:
                    raise ExecutionError(
                        f"No executor found for node type: {node_type}",
                        error_code="EXECUTOR_NOT_FOUND",
                        details={"node_id": node_id, "node_type": node_type}
                    )
                
                # 從依賴節點傳遞數據
                dependencies = self._get_node_dependencies(graph, node_id)
                for dep_id in dependencies:
                    if context.is_node_executed(dep_id):
                        self._transfer_data(graph, dep_id, node_id, context)
                
                # 設置節點的默認值和數據
                if node.data:
                    for key, value in node.data.items():
                        if key not in node_context.inputs:
                            node_context.set_input(key, value)
                    # 保存 node.data 供節點使用
                    node_context.metadata["node_data"] = node.data
                
                # 傳遞執行上下文給節點
                node_context.metadata["exec_context"] = context
                
                try:
                    # 執行節點
                    await self._execute_node_async(node, node_context, executor)
                    context.mark_node_executed(node_id)
                    
                    # 收集輸出
                    if node_context.outputs:
                        outputs[node_id] = node_context.outputs
                        
                except Exception as e:
                    errors.append(e)
                    # 決定是否繼續執行
                    if not context.config.get("continue_on_error", False):
                        raise e
            
            # 執行完成
            if not errors and context.state != ExecutionState.CANCELLED:
                context.mark_completed()
                
        except Exception as e:
            errors.append(e)
            context.mark_error(e)
        
        return ExecutionResult(
            success=len(errors) == 0 and context.state == ExecutionState.COMPLETED,
            context=context,
            outputs=outputs,
            errors=errors
        )
    
    def execute(
        self,
        graph: RamenGraph,
        inputs: Optional[Dict[str, Any]] = None,
        context: Optional[ExecutionContext] = None
    ) -> ExecutionResult:
        """同步執行圖形"""
        if self.enable_async:
            # 在新的事件循環中執行
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(
                    self.execute_async(graph, inputs, context)
                )
            finally:
                loop.close()
        else:
            # 同步執行邏輯（簡化版）
            return self._execute_sync(graph, inputs, context)
    
    def _execute_sync(
        self,
        graph: RamenGraph,
        inputs: Optional[Dict[str, Any]] = None,
        context: Optional[ExecutionContext] = None
    ) -> ExecutionResult:
        """同步執行實現"""
        # 驗證圖形
        validation_errors = self.validate_graph(graph)
        if validation_errors:
            raise ValidationError(
                "Graph validation failed",
                validation_errors=validation_errors,
                graph_id=graph.id
            )
        
        # 建立執行上下文
        if context is None:
            context = ExecutionContext(graph_id=graph.id)
        self._current_context = context
        
        # 獲取執行順序
        execution_order = self._topological_sort(graph)
        context.execution_order = execution_order
        
        # 為每個節點建立上下文
        node_map = {node.id: node for node in graph.nodes}
        for node_id in execution_order:
            node = node_map[node_id]
            context.add_node_context(node_id, node.metadata.type)
        
        # 設置輸入變數
        if inputs:
            for name, value in inputs.items():
                context.set_variable(name, value)
        
        # 開始執行
        context.mark_running()
        errors = []
        outputs = {}
        
        try:
            for node_id in execution_order:
                node = node_map[node_id]
                node_context = context.get_node_context(node_id)
                
                # 獲取節點執行器
                node_type = f"{node.metadata.namespace}.{node.metadata.type}"
                executor = self.node_registry.get(node_type)
                
                if not executor:
                    raise ExecutionError(
                        f"No executor found for node type: {node_type}",
                        error_code="EXECUTOR_NOT_FOUND",
                        details={"node_id": node_id, "node_type": node_type}
                    )
                
                # 從依賴節點傳遞數據
                dependencies = self._get_node_dependencies(graph, node_id)
                for dep_id in dependencies:
                    if context.is_node_executed(dep_id):
                        self._transfer_data(graph, dep_id, node_id, context)
                
                # 設置節點的默認值和數據
                if node.data:
                    for key, value in node.data.items():
                        if key not in node_context.inputs:
                            node_context.set_input(key, value)
                    # 保存 node.data 供節點使用
                    node_context.metadata["node_data"] = node.data
                
                # 傳遞執行上下文給節點
                node_context.metadata["exec_context"] = context
                
                try:
                    # 執行節點
                    self._execute_node_sync(node, node_context, executor)
                    context.mark_node_executed(node_id)
                    
                    # 收集輸出
                    if node_context.outputs:
                        outputs[node_id] = node_context.outputs
                        
                except Exception as e:
                    errors.append(e)
                    if not context.config.get("continue_on_error", False):
                        raise e
            
            # 執行完成
            if not errors:
                context.mark_completed()
                
        except Exception as e:
            errors.append(e)
            context.mark_error(e)
        
        return ExecutionResult(
            success=len(errors) == 0 and context.state == ExecutionState.COMPLETED,
            context=context,
            outputs=outputs,
            errors=errors
        )
    
    def cancel(self):
        """取消當前執行"""
        if self._cancellation_token:
            self._cancellation_token.set()
        if self._current_context:
            self._current_context.mark_cancelled()
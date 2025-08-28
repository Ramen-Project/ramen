"""
執行上下文管理
"""

from typing import Dict, Any, Optional, List, Set
from dataclasses import dataclass, field
from datetime import datetime
import uuid
from enum import Enum


class ExecutionState(Enum):
    """執行狀態枚舉"""
    IDLE = "idle"
    COMPILING = "compiling"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


@dataclass
class NodeContext:
    """節點執行上下文"""
    node_id: str
    node_type: str
    inputs: Dict[str, Any] = field(default_factory=dict)
    outputs: Dict[str, Any] = field(default_factory=dict)
    state: ExecutionState = ExecutionState.IDLE
    error: Optional[Exception] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def execution_time(self) -> Optional[float]:
        """計算執行時間（秒）"""
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return None
    
    def set_input(self, port: str, value: Any):
        """設置輸入值"""
        self.inputs[port] = value
    
    def get_input(self, port: str, default: Any = None) -> Any:
        """獲取輸入值"""
        return self.inputs.get(port, default)
    
    def set_output(self, port: str, value: Any):
        """設置輸出值"""
        self.outputs[port] = value
    
    def get_output(self, port: str, default: Any = None) -> Any:
        """獲取輸出值"""
        return self.outputs.get(port, default)
    
    def mark_running(self):
        """標記為執行中"""
        self.state = ExecutionState.RUNNING
        self.start_time = datetime.now()
    
    def mark_completed(self):
        """標記為已完成"""
        self.state = ExecutionState.COMPLETED
        self.end_time = datetime.now()
    
    def mark_error(self, error: Exception):
        """標記為錯誤"""
        self.state = ExecutionState.ERROR
        self.error = error
        self.end_time = datetime.now()


@dataclass
class ExecutionContext:
    """圖形執行上下文"""
    execution_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    graph_id: Optional[str] = None
    session_id: Optional[str] = None
    state: ExecutionState = ExecutionState.IDLE
    
    # 節點執行上下文
    nodes: Dict[str, NodeContext] = field(default_factory=dict)
    
    # 全域變數
    variables: Dict[str, Any] = field(default_factory=dict)
    
    # 執行順序
    execution_order: List[str] = field(default_factory=list)
    executed_nodes: Set[str] = field(default_factory=set)
    
    # 執行統計
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    error: Optional[Exception] = None
    
    # 執行設定
    config: Dict[str, Any] = field(default_factory=dict)
    
    # 執行日誌
    logs: List[Dict[str, Any]] = field(default_factory=list)
    
    @property
    def execution_time(self) -> Optional[float]:
        """計算總執行時間（秒）"""
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return None
    
    @property
    def progress(self) -> float:
        """計算執行進度 (0.0 - 1.0)"""
        if not self.execution_order:
            return 0.0
        return len(self.executed_nodes) / len(self.execution_order)
    
    def add_node_context(self, node_id: str, node_type: str) -> NodeContext:
        """添加節點上下文"""
        context = NodeContext(node_id=node_id, node_type=node_type)
        self.nodes[node_id] = context
        return context
    
    def get_node_context(self, node_id: str) -> Optional[NodeContext]:
        """獲取節點上下文"""
        return self.nodes.get(node_id)
    
    def set_variable(self, name: str, value: Any):
        """設置全域變數"""
        self.variables[name] = value
        self.log("variable_set", {"name": name, "value": str(value)[:100]})
    
    def get_variable(self, name: str, default: Any = None) -> Any:
        """獲取全域變數"""
        return self.variables.get(name, default)
    
    def mark_node_executed(self, node_id: str):
        """標記節點已執行"""
        self.executed_nodes.add(node_id)
        self.log("node_executed", {"node_id": node_id})
    
    def is_node_executed(self, node_id: str) -> bool:
        """檢查節點是否已執行"""
        return node_id in self.executed_nodes
    
    def mark_running(self):
        """標記執行開始"""
        self.state = ExecutionState.RUNNING
        self.start_time = datetime.now()
        self.log("execution_started", {"graph_id": self.graph_id})
    
    def mark_completed(self):
        """標記執行完成"""
        self.state = ExecutionState.COMPLETED
        self.end_time = datetime.now()
        self.log("execution_completed", {
            "graph_id": self.graph_id,
            "execution_time": self.execution_time
        })
    
    def mark_error(self, error: Exception):
        """標記執行錯誤"""
        self.state = ExecutionState.ERROR
        self.error = error
        self.end_time = datetime.now()
        self.log("execution_error", {
            "graph_id": self.graph_id,
            "error": str(error)
        })
    
    def mark_cancelled(self):
        """標記執行取消"""
        self.state = ExecutionState.CANCELLED
        self.end_time = datetime.now()
        self.log("execution_cancelled", {"graph_id": self.graph_id})
    
    def log(self, event: str, data: Optional[Dict[str, Any]] = None):
        """添加執行日誌"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "event": event,
            "data": data or {}
        }
        self.logs.append(log_entry)
    
    def get_execution_summary(self) -> Dict[str, Any]:
        """獲取執行摘要"""
        return {
            "execution_id": self.execution_id,
            "graph_id": self.graph_id,
            "session_id": self.session_id,
            "state": self.state.value,
            "progress": self.progress,
            "execution_time": self.execution_time,
            "nodes_executed": len(self.executed_nodes),
            "nodes_total": len(self.execution_order),
            "error": str(self.error) if self.error else None,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None
        }
    
    def get_node_results(self) -> Dict[str, Dict[str, Any]]:
        """獲取所有節點的執行結果"""
        results = {}
        for node_id, context in self.nodes.items():
            results[node_id] = {
                "state": context.state.value,
                "outputs": context.outputs,
                "error": str(context.error) if context.error else None,
                "execution_time": context.execution_time
            }
        return results
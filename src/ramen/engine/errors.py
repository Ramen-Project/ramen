"""
執行引擎錯誤定義
"""

from typing import Optional, Any, Dict
import traceback


class ExecutionError(Exception):
    """執行錯誤基礎類別"""
    
    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        super().__init__(message)
        self.error_code = error_code or "EXECUTION_ERROR"
        self.details = details or {}
        self.cause = cause
        self.traceback = traceback.format_exc() if cause else None
    
    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典格式，方便 API 傳輸"""
        return {
            "error": self.error_code,
            "message": str(self),
            "details": self.details,
            "traceback": self.traceback
        }


class CompilationError(ExecutionError):
    """編譯錯誤"""
    
    def __init__(
        self,
        message: str,
        graph_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        super().__init__(
            message,
            error_code="COMPILATION_ERROR",
            details=details,
            cause=cause
        )
        if graph_id:
            self.details["graph_id"] = graph_id


class NodeExecutionError(ExecutionError):
    """節點執行錯誤"""
    
    def __init__(
        self,
        message: str,
        node_id: str,
        node_type: Optional[str] = None,
        input_values: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        details = {
            "node_id": node_id,
            "node_type": node_type,
            "input_values": input_values
        }
        super().__init__(
            message,
            error_code="NODE_EXECUTION_ERROR",
            details=details,
            cause=cause
        )


class EdgeExecutionError(ExecutionError):
    """邊執行錯誤（資料傳遞錯誤）"""
    
    def __init__(
        self,
        message: str,
        edge_id: str,
        source_node: str,
        target_node: str,
        source_port: Optional[str] = None,
        target_port: Optional[str] = None,
        cause: Optional[Exception] = None
    ):
        details = {
            "edge_id": edge_id,
            "source_node": source_node,
            "target_node": target_node,
            "source_port": source_port,
            "target_port": target_port
        }
        super().__init__(
            message,
            error_code="EDGE_EXECUTION_ERROR",
            details=details,
            cause=cause
        )


class SessionError(ExecutionError):
    """會話管理錯誤"""
    
    def __init__(
        self,
        message: str,
        session_id: Optional[str] = None,
        graph_id: Optional[str] = None,
        cause: Optional[Exception] = None
    ):
        details = {}
        if session_id:
            details["session_id"] = session_id
        if graph_id:
            details["graph_id"] = graph_id
            
        super().__init__(
            message,
            error_code="SESSION_ERROR",
            details=details,
            cause=cause
        )


class ValidationError(ExecutionError):
    """圖形驗證錯誤"""
    
    def __init__(
        self,
        message: str,
        validation_errors: list,
        graph_id: Optional[str] = None
    ):
        details = {
            "validation_errors": validation_errors
        }
        if graph_id:
            details["graph_id"] = graph_id
            
        super().__init__(
            message,
            error_code="VALIDATION_ERROR",
            details=details
        )


class TimeoutError(ExecutionError):
    """執行超時錯誤"""
    
    def __init__(
        self,
        message: str,
        timeout_seconds: float,
        node_id: Optional[str] = None,
        graph_id: Optional[str] = None
    ):
        details = {
            "timeout_seconds": timeout_seconds
        }
        if node_id:
            details["node_id"] = node_id
        if graph_id:
            details["graph_id"] = graph_id
            
        super().__init__(
            message,
            error_code="TIMEOUT_ERROR",
            details=details
        )
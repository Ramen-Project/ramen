"""
執行會話管理
管理圖形執行的會話，確保單一會話原則
"""

from typing import Dict, Optional, Any, List
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
import uuid
import asyncio
import logging

from ramen.core.models import RamenGraph, ExecutionMode
from ramen.engine.context import ExecutionContext, ExecutionState
from ramen.engine.executor import GraphExecutor, ExecutionResult
from ramen.engine.compiler import GraphCompiler, CompiledGraph
from ramen.engine.errors import SessionError
from ramen.engine.kernel import KernelManager, KernelConfig, KernelState

logger = logging.getLogger(__name__)


@dataclass
class ExecutionSession:
    """執行會話"""
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    graph_id: Optional[str] = None
    user_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    
    # 專案路徑（for kernel）
    project_path: Optional[Path] = None
    use_kernel: bool = True  # 是否使用 kernel 進行隔離執行
    
    # 執行狀態
    context: Optional[ExecutionContext] = None
    executor: Optional[GraphExecutor] = None
    compiled_graph: Optional[CompiledGraph] = None
    kernel: Optional[KernelManager] = None
    
    # 會話設定
    timeout: timedelta = field(default=timedelta(hours=1))
    auto_cleanup: bool = True
    
    # 會話鎖
    _lock: Lock = field(default_factory=Lock, init=False, repr=False)
    _is_active: bool = field(default=True, init=False)
    
    # 執行歷史
    execution_history: List[ExecutionResult] = field(default_factory=list)
    
    def is_expired(self) -> bool:
        """檢查會話是否過期"""
        if not self._is_active:
            return True
        
        if self.timeout:
            time_since_activity = datetime.now() - self.last_activity
            return time_since_activity > self.timeout
        
        return False
    
    def touch(self):
        """更新最後活動時間"""
        self.last_activity = datetime.now()
    
    def acquire_lock(self, timeout: Optional[float] = None) -> bool:
        """獲取會話鎖"""
        return self._lock.acquire(timeout=timeout or 5.0)
    
    def release_lock(self):
        """釋放會話鎖"""
        self._lock.release()
    
    def execute(
        self,
        graph: RamenGraph,
        inputs: Optional[Dict[str, Any]] = None,
        compiler: Optional[GraphCompiler] = None
    ) -> ExecutionResult:
        """在會話中執行圖形"""
        if not self._is_active:
            raise SessionError(
                "Session is no longer active",
                session_id=self.session_id,
                graph_id=graph.id
            )
        
        if self.is_expired():
            self.close()
            raise SessionError(
                "Session has expired",
                session_id=self.session_id,
                graph_id=graph.id
            )
        
        self.touch()
        
        try:
            # 獲取鎖
            if not self.acquire_lock():
                raise SessionError(
                    "Failed to acquire session lock",
                    session_id=self.session_id,
                    graph_id=graph.id
                )
            
            # 設置圖形 ID
            if self.graph_id and self.graph_id != graph.id:
                raise SessionError(
                    f"Session is bound to graph {self.graph_id}, cannot execute {graph.id}",
                    session_id=self.session_id,
                    graph_id=graph.id
                )
            self.graph_id = graph.id
            
            # 編譯圖形（如果需要）
            if compiler and not self.compiled_graph:
                self.compiled_graph = compiler.compile_jit(graph)
            
            # 建立或重用執行器
            if not self.executor:
                self.executor = GraphExecutor()
            
            # 建立新的執行上下文
            self.context = ExecutionContext(
                graph_id=graph.id,
                session_id=self.session_id
            )
            
            # 執行圖形
            result = self.executor.execute(graph, inputs, self.context)
            
            # 記錄執行歷史
            self.execution_history.append(result)
            
            return result
            
        finally:
            self.release_lock()
    
    async def execute_async(
        self,
        graph: RamenGraph,
        inputs: Optional[Dict[str, Any]] = None,
        compiler: Optional[GraphCompiler] = None
    ) -> ExecutionResult:
        """異步執行圖形"""
        if not self._is_active:
            raise SessionError(
                "Session is no longer active",
                session_id=self.session_id,
                graph_id=graph.id
            )
        
        if self.is_expired():
            self.close()
            raise SessionError(
                "Session has expired",
                session_id=self.session_id,
                graph_id=graph.id
            )
        
        self.touch()
        
        # 設置圖形 ID
        if self.graph_id and self.graph_id != graph.id:
            raise SessionError(
                f"Session is bound to graph {self.graph_id}, cannot execute {graph.id}",
                session_id=self.session_id,
                graph_id=graph.id
            )
        self.graph_id = graph.id
        
        # 使用 Kernel 執行（如果啟用）
        if self.use_kernel and self.project_path:
            return await self._execute_with_kernel(graph, inputs, compiler)
        else:
            return await self._execute_local(graph, inputs, compiler)
    
    async def _execute_with_kernel(
        self,
        graph: RamenGraph,
        inputs: Optional[Dict[str, Any]] = None,
        compiler: Optional[GraphCompiler] = None
    ) -> ExecutionResult:
        """使用 kernel 執行圖形（隔離環境）"""
        try:
            # 初始化 kernel（如果需要）
            if not self.kernel:
                kernel_config = KernelConfig(
                    project_path=self.project_path,
                    timeout=self.timeout.total_seconds(),
                    debug=True  # TODO: 從設定讀取
                )
                self.kernel = KernelManager(kernel_config)
                await self.kernel.start()
            
            # 確保 kernel 準備就緒
            if self.kernel.state != KernelState.READY:
                logger.warning(f"Kernel 狀態非 READY: {self.kernel.state}, 重新啟動")
                await self.kernel.terminate()
                await self.kernel.start()
            
            # 轉換 graph 格式（如果需要）
            if hasattr(graph, 'to_graph'):
                graph_model = graph.to_graph()
            else:
                graph_model = graph
            
            # 透過 kernel 執行
            logger.info(f"在 kernel 中執行圖形 {graph.id}")
            result_data = await self.kernel.execute_graph(
                graph=graph_model,
                variables=inputs or {},
                mode=ExecutionMode.JIT
            )
            
            # 轉換結果為 ExecutionResult
            result = ExecutionResult(
                success=result_data.get("success", False),
                outputs=result_data.get("outputs", {}),
                errors=result_data.get("errors", []),
                context=ExecutionContext(
                    graph_id=graph.id,
                    session_id=self.session_id,
                    execution_time=result_data.get("execution_time", 0.0)
                )
            )
            
            # 記錄執行歷史
            self.execution_history.append(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Kernel 執行失敗: {e}")
            # 建立錯誤結果
            result = ExecutionResult(
                success=False,
                outputs={},
                errors=[str(e)],
                context=ExecutionContext(
                    graph_id=graph.id,
                    session_id=self.session_id
                )
            )
            self.execution_history.append(result)
            raise
    
    async def _execute_local(
        self,
        graph: RamenGraph,
        inputs: Optional[Dict[str, Any]] = None,
        compiler: Optional[GraphCompiler] = None
    ) -> ExecutionResult:
        """本地執行圖形（非隔離）"""
        # 編譯圖形（如果需要）
        if compiler and not self.compiled_graph:
            self.compiled_graph = compiler.compile_jit(graph)
        
        # 建立或重用執行器
        if not self.executor:
            self.executor = GraphExecutor()
        
        # 建立新的執行上下文
        self.context = ExecutionContext(
            graph_id=graph.id,
            session_id=self.session_id
        )
        
        # 異步執行圖形
        result = await self.executor.execute_async(graph, inputs, self.context)
        
        # 記錄執行歷史
        self.execution_history.append(result)
        
        return result
    
    def cancel(self):
        """取消當前執行"""
        if self.executor:
            self.executor.cancel()
        if self.context:
            self.context.mark_cancelled()
    
    def get_status(self) -> Dict[str, Any]:
        """獲取會話狀態"""
        return {
            "session_id": self.session_id,
            "graph_id": self.graph_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "is_active": self._is_active,
            "is_expired": self.is_expired(),
            "current_state": self.context.state.value if self.context else None,
            "execution_count": len(self.execution_history)
        }
    
    def get_current_execution(self) -> Optional[Dict[str, Any]]:
        """獲取當前執行狀態"""
        if self.context:
            return self.context.get_execution_summary()
        return None
    
    def close(self):
        """關閉會話"""
        self._is_active = False
        if self.executor:
            self.executor.cancel()
        
        # 終止 kernel（如果有）
        if self.kernel:
            try:
                # 使用同步方式終止 kernel
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(self.kernel.terminate())
                loop.close()
            except:
                pass
            self.kernel = None
        
        # 清理資源
        if self.auto_cleanup:
            self.context = None
            self.executor = None
            self.compiled_graph = None
            self.execution_history.clear()


class SessionManager:
    """會話管理器"""
    
    def __init__(
        self,
        max_sessions: int = 100,
        session_timeout: timedelta = timedelta(hours=1),
        cleanup_interval: timedelta = timedelta(minutes=5)
    ):
        self.max_sessions = max_sessions
        self.session_timeout = session_timeout
        self.cleanup_interval = cleanup_interval
        
        # 會話存儲
        self._sessions: Dict[str, ExecutionSession] = {}
        self._graph_sessions: Dict[str, str] = {}  # graph_id -> session_id
        self._user_sessions: Dict[str, List[str]] = {}  # user_id -> [session_ids]
        
        # 鎖
        self._lock = Lock()
        
        # 清理任務
        self._cleanup_task: Optional[asyncio.Task] = None
        self._running = True
    
    def create_session(
        self,
        graph_id: Optional[str] = None,
        user_id: Optional[str] = None,
        force_takeover: bool = False,
        project_path: Optional[Path] = None,
        use_kernel: bool = True
    ) -> ExecutionSession:
        """建立新會話"""
        with self._lock:
            # 檢查會話數量限制
            if len(self._sessions) >= self.max_sessions:
                # 清理過期會話
                self._cleanup_expired_sessions()
                
                if len(self._sessions) >= self.max_sessions:
                    raise SessionError(
                        f"Maximum number of sessions ({self.max_sessions}) reached"
                    )
            
            # 檢查圖形是否已有會話
            if graph_id and graph_id in self._graph_sessions:
                existing_session_id = self._graph_sessions[graph_id]
                existing_session = self._sessions.get(existing_session_id)
                
                if existing_session and not existing_session.is_expired():
                    if not force_takeover:
                        raise SessionError(
                            f"Graph {graph_id} already has an active session",
                            session_id=existing_session_id,
                            graph_id=graph_id
                        )
                    else:
                        # 接管會話
                        existing_session.close()
                        del self._sessions[existing_session_id]
            
            # 建立新會話
            session = ExecutionSession(
                graph_id=graph_id,
                user_id=user_id,
                timeout=self.session_timeout,
                project_path=project_path,
                use_kernel=use_kernel
            )
            
            # 註冊會話
            self._sessions[session.session_id] = session
            
            if graph_id:
                self._graph_sessions[graph_id] = session.session_id
            
            if user_id:
                if user_id not in self._user_sessions:
                    self._user_sessions[user_id] = []
                self._user_sessions[user_id].append(session.session_id)
            
            return session
    
    def get_session(
        self,
        session_id: Optional[str] = None,
        graph_id: Optional[str] = None
    ) -> Optional[ExecutionSession]:
        """獲取會話"""
        with self._lock:
            if session_id:
                session = self._sessions.get(session_id)
                if session and not session.is_expired():
                    return session
            
            if graph_id and graph_id in self._graph_sessions:
                session_id = self._graph_sessions[graph_id]
                session = self._sessions.get(session_id)
                if session and not session.is_expired():
                    return session
            
            return None
    
    def get_or_create_session(
        self,
        graph_id: str,
        user_id: Optional[str] = None,
        force_takeover: bool = False,
        project_path: Optional[Path] = None,
        use_kernel: bool = True
    ) -> ExecutionSession:
        """獲取或建立會話"""
        session = self.get_session(graph_id=graph_id)
        
        if session:
            session.touch()
            return session
        
        return self.create_session(
            graph_id=graph_id,
            user_id=user_id,
            force_takeover=force_takeover,
            project_path=project_path,
            use_kernel=use_kernel
        )
    
    def close_session(self, session_id: str):
        """關閉會話"""
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.close()
                
                # 移除註冊
                del self._sessions[session_id]
                
                if session.graph_id and session.graph_id in self._graph_sessions:
                    if self._graph_sessions[session.graph_id] == session_id:
                        del self._graph_sessions[session.graph_id]
                
                if session.user_id and session.user_id in self._user_sessions:
                    self._user_sessions[session.user_id].remove(session_id)
    
    def list_sessions(
        self,
        user_id: Optional[str] = None,
        active_only: bool = True
    ) -> List[Dict[str, Any]]:
        """列出會話"""
        with self._lock:
            sessions = []
            
            if user_id:
                session_ids = self._user_sessions.get(user_id, [])
                target_sessions = [self._sessions.get(sid) for sid in session_ids]
            else:
                target_sessions = self._sessions.values()
            
            for session in target_sessions:
                if session and (not active_only or not session.is_expired()):
                    sessions.append(session.get_status())
            
            return sessions
    
    def _cleanup_expired_sessions(self):
        """清理過期會話"""
        expired_ids = []
        
        for session_id, session in self._sessions.items():
            if session.is_expired():
                expired_ids.append(session_id)
        
        for session_id in expired_ids:
            self.close_session(session_id)
    
    async def _cleanup_task_loop(self):
        """清理任務循環"""
        while self._running:
            await asyncio.sleep(self.cleanup_interval.total_seconds())
            
            with self._lock:
                self._cleanup_expired_sessions()
    
    async def start_cleanup_task(self):
        """啟動清理任務"""
        if not self._cleanup_task:
            self._cleanup_task = asyncio.create_task(self._cleanup_task_loop())
    
    async def stop_cleanup_task(self):
        """停止清理任務"""
        self._running = False
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None
    
    def shutdown(self):
        """關閉所有會話"""
        with self._lock:
            for session in self._sessions.values():
                session.close()
            
            self._sessions.clear()
            self._graph_sessions.clear()
            self._user_sessions.clear()
            self._running = False
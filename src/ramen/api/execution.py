"""
執行 API
提供圖形執行、會話管理和即時更新功能

⚠️  DEPRECATED: HTTP endpoints in this module are deprecated.
All functionality has been migrated to WebSocket API.
See: src/ramen/api/websocket_handler.py
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import asyncio

from ramen.core.models import RamenGraph, GraphDeserializer
from ramen.engine import (
    GraphExecutor,
    GraphCompiler,
    ExecutionSession,
    SessionManager,
    ExecutionContext,
    ExecutionResult
)

# 建立路由
router = APIRouter(prefix="/api/execution", tags=["execution"])

# 全域會話管理器
session_manager = SessionManager()

# 全域編譯器
compiler = GraphCompiler()

# WebSocket 連接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
    
    async def send_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append(connection)
            
            # 清理斷開的連接
            for conn in disconnected:
                self.disconnect(conn, session_id)
    
    async def broadcast_to_session(self, session_id: str, message: dict):
        await self.send_to_session(session_id, message)

manager = ConnectionManager()

# 請求和響應模型
class ExecuteGraphRequest(BaseModel):
    graph: Dict[str, Any]
    inputs: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    force_takeover: bool = False
    compile_mode: str = "JIT"  # JIT 或 AOT

class ExecutionResponse(BaseModel):
    success: bool
    execution_id: str
    session_id: str
    state: str
    outputs: Optional[Dict[str, Any]] = None
    errors: Optional[List[str]] = None
    execution_time: Optional[float] = None

class SessionResponse(BaseModel):
    session_id: str
    graph_id: Optional[str]
    user_id: Optional[str]
    created_at: str
    last_activity: str
    is_active: bool
    current_state: Optional[str]

class CancelExecutionRequest(BaseModel):
    session_id: str

# API 端點
@router.post("/execute", response_model=ExecutionResponse)
async def execute_graph(
    request: ExecuteGraphRequest,
    background_tasks: BackgroundTasks
):
    """執行圖形"""
    try:
        # 反序列化圖形
        graph = GraphDeserializer.from_dict(request.graph, RamenGraph)
        
        # 獲取或建立會話
        if request.session_id:
            session = session_manager.get_session(request.session_id)
            if not session:
                raise HTTPException(
                    status_code=404,
                    detail=f"Session {request.session_id} not found"
                )
        else:
            session = session_manager.get_or_create_session(
                graph_id=graph.id,
                force_takeover=request.force_takeover
            )
        
        # 在背景執行並發送即時更新
        background_tasks.add_task(
            execute_with_updates,
            session,
            graph,
            request.inputs,
            request.compile_mode
        )
        
        # 立即返回執行開始狀態
        return ExecutionResponse(
            success=True,
            execution_id=session.context.execution_id if session.context else "",
            session_id=session.session_id,
            state="starting",
            outputs=None,
            errors=None,
            execution_time=None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def execute_with_updates(
    session: ExecutionSession,
    graph: RamenGraph,
    inputs: Optional[Dict[str, Any]],
    compile_mode: str
):
    """在背景執行圖形並發送更新"""
    try:
        # 發送開始訊息
        await manager.broadcast_to_session(session.session_id, {
            "type": "execution_started",
            "session_id": session.session_id,
            "graph_id": graph.id,
            "timestamp": datetime.now().isoformat()
        })
        
        # 執行圖形
        result = await session.execute_async(
            graph,
            inputs,
            compiler if compile_mode else None
        )
        
        # 發送完成訊息
        await manager.broadcast_to_session(session.session_id, {
            "type": "execution_completed",
            "session_id": session.session_id,
            "success": result.success,
            "outputs": result.outputs,
            "errors": [str(e) for e in result.errors],
            "execution_time": result.context.execution_time,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        # 發送錯誤訊息
        await manager.broadcast_to_session(session.session_id, {
            "type": "execution_error",
            "session_id": session.session_id,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        })

@router.get("/status/{session_id}", response_model=Dict[str, Any])
async def get_execution_status(session_id: str):
    """獲取執行狀態"""
    session = session_manager.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found"
        )
    
    return session.get_current_execution() or {
        "session_id": session_id,
        "state": "idle"
    }

@router.get("/results/{session_id}", response_model=Dict[str, Any])
async def get_execution_results(session_id: str):
    """獲取執行結果"""
    session = session_manager.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found"
        )
    
    if not session.execution_history:
        raise HTTPException(
            status_code=404,
            detail="No execution results available"
        )
    
    # 返回最新的執行結果
    latest_result = session.execution_history[-1]
    return latest_result.to_dict()

@router.post("/cancel/{session_id}")
async def cancel_execution(session_id: str):
    """取消執行"""
    session = session_manager.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found"
        )
    
    session.cancel()
    
    # 發送取消訊息
    await manager.broadcast_to_session(session_id, {
        "type": "execution_cancelled",
        "session_id": session_id,
        "timestamp": datetime.now().isoformat()
    })
    
    return {"message": "Execution cancelled", "session_id": session_id}

# 會話管理端點
@router.post("/session/create", response_model=SessionResponse)
async def create_session(
    graph_id: Optional[str] = None,
    user_id: Optional[str] = None,
    force_takeover: bool = False
):
    """建立新會話"""
    try:
        session = session_manager.create_session(
            graph_id=graph_id,
            user_id=user_id,
            force_takeover=force_takeover
        )
        
        return SessionResponse(
            session_id=session.session_id,
            graph_id=session.graph_id,
            user_id=session.user_id,
            created_at=session.created_at.isoformat(),
            last_activity=session.last_activity.isoformat(),
            is_active=True,
            current_state=None
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/session/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """獲取會話資訊"""
    session = session_manager.get_session(session_id)
    
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found"
        )
    
    status = session.get_status()
    
    return SessionResponse(
        session_id=status["session_id"],
        graph_id=status["graph_id"],
        user_id=status["user_id"],
        created_at=status["created_at"],
        last_activity=status["last_activity"],
        is_active=status["is_active"],
        current_state=status["current_state"]
    )

@router.delete("/session/{session_id}")
async def close_session(session_id: str):
    """關閉會話"""
    session_manager.close_session(session_id)
    return {"message": "Session closed", "session_id": session_id}

@router.get("/sessions", response_model=List[Dict[str, Any]])
async def list_sessions(
    user_id: Optional[str] = None,
    active_only: bool = True
):
    """列出會話"""
    return session_manager.list_sessions(
        user_id=user_id,
        active_only=active_only
    )

# WebSocket 端點 (通用版本)
@router.websocket("/ws")
async def websocket_endpoint_general(websocket: WebSocket):
    """WebSocket 連接，通用端點"""
    # 檢查 Origin 以支持 VSCode webview
    origin = websocket.headers.get("origin")
    if origin and (origin.startswith("vscode-webview://") or 
                   origin in ["http://localhost:5173", "http://127.0.0.1:5173"]):
        # 為沒有特定 session 的連接生成一個默認 session ID
        import uuid
        session_id = f"default-{str(uuid.uuid4())[:8]}"
        await websocket_endpoint(websocket, session_id)
    else:
        # 接受所有連接（開發階段）
        import uuid
        session_id = f"default-{str(uuid.uuid4())[:8]}"
        await websocket_endpoint(websocket, session_id)

# WebSocket 端點 (帶 session ID)
@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket 連接，用於即時執行更新"""
    # 檢查 Origin 以支持 VSCode webview（開發階段接受所有連接）
    origin = websocket.headers.get("origin")
    print(f"WebSocket connection from origin: {origin}")  # 調試訊息
    
    await manager.connect(websocket, session_id)
    
    try:
        # 發送連接成功訊息
        await websocket.send_json({
            "type": "connected",
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        })
        
        # 保持連接並處理訊息
        while True:
            data = await websocket.receive_text()
            
            # 處理客戶端訊息
            try:
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    # 回應 ping
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })
                elif message.get("type") == "get_status":
                    # 獲取當前狀態
                    session = session_manager.get_session(session_id)
                    if session:
                        status = session.get_current_execution()
                        await websocket.send_json({
                            "type": "status",
                            "data": status,
                            "timestamp": datetime.now().isoformat()
                        })
                
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON",
                    "timestamp": datetime.now().isoformat()
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
        
        # 檢查是否需要清理會話
        if session_id not in manager.active_connections:
            # 沒有其他連接，可以考慮清理會話
            pass

# 啟動時初始化
@router.on_event("startup")
async def startup_event():
    """啟動時初始化"""
    await session_manager.start_cleanup_task()

# 關閉時清理
@router.on_event("shutdown")
async def shutdown_event():
    """關閉時清理"""
    await session_manager.stop_cleanup_task()
    session_manager.shutdown()
"""
Ramen API Module
Main FastAPI application for Ramen visual programming environment
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import uuid
from datetime import datetime
from .api.execution import router as execution_router
from .api.graph import router as graph_router
from .api.nodes import router as nodes_router

# Create FastAPI app
app = FastAPI(
    title="Ramen API",
    description="Visual Programming Environment API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",  # Vite dev server
        "vscode-webview://*"      # VSCode webview origins
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"vscode-webview://.*",  # Allow all VSCode webview origins
)

# Include routers
app.include_router(execution_router)
app.include_router(graph_router)
app.include_router(nodes_router)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Ramen API is running"}

# Health check endpoints (both paths for compatibility)
@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/health")
async def api_health():
    return {"status": "healthy", "service": "ramen-api", "version": "1.0.0"}

# 簡單的 WebSocket 連接管理
active_connections = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # 發送連接成功訊息
        await websocket.send_json({
            "type": "connected",
            "session_id": str(uuid.uuid4())[:8],
            "timestamp": datetime.now().isoformat()
        })
        
        # 保持連接並處理訊息
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })
                    
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error", 
                    "message": "Invalid JSON",
                    "timestamp": datetime.now().isoformat()
                })
                
    except WebSocketDisconnect:
        active_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
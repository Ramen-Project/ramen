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
from .api.frontend_components import router as frontend_components_router
from .api.system import router as system_router
from .api.git import router as git_router
from .topping.loader import load_toppings

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

# Load toppings on startup
@app.on_event("startup")
async def startup_event():
    """Load toppings when the application starts."""
    load_toppings()

# Include routers
app.include_router(execution_router)
app.include_router(graph_router)
app.include_router(nodes_router)
app.include_router(frontend_components_router)
app.include_router(system_router)
app.include_router(git_router)

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

# WebSocket state management
from .topping.websocket_sync import get_state_manager

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    state_manager = get_state_manager()
    
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
                message_type = message.get("type")
                
                if message_type == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })
                
                elif message_type in ["subscribe_node", "unsubscribe_node", "node_event"]:
                    # Handle node state sync events
                    await state_manager.handle_event(websocket, message)
                
                else:
                    # Handle other message types as needed
                    pass
                    
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error", 
                    "message": "Invalid JSON",
                    "timestamp": datetime.now().isoformat()
                })
                
    except WebSocketDisconnect:
        # Clean up state subscriptions
        state_manager.disconnect_websocket(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
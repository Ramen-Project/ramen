"""
Ramen API Module
Main FastAPI application for Ramen visual programming environment
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import uuid
from datetime import datetime
from .topping.loader import load_toppings
from .api.websocket_handler import get_message_handler

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

# Load toppings and nodes on startup
@app.on_event("startup")
async def startup_event():
    """Load toppings and nodes when the application starts."""
    import logging
    logger = logging.getLogger(__name__)

    # Import all node modules to trigger registration
    import ramen.nodes.core
    import ramen.nodes.math
    import ramen.nodes.logic
    import ramen.nodes.string
    import ramen.nodes.type
    import ramen.nodes.flow
    import ramen.nodes.object
    import ramen.nodes.debug
    import ramen.nodes.collection

    from .registry import get_global_registry
    registry = get_global_registry()
    logger.info(f"Registered {registry.count()} nodes on startup")

    # Load external toppings
    load_toppings()

# HTTP routers are deprecated, all functionality moved to WebSocket
# Keep minimal HTTP endpoints for health checks only

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

# 統一的 WebSocket 端點
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """統一的 WebSocket 端點，處理所有 API 請求"""
    import logging
    logger = logging.getLogger(__name__)

    client_info = f"{websocket.client.host}:{websocket.client.port}" if websocket.client else "unknown"
    session_id = str(uuid.uuid4())[:8]

    await websocket.accept()
    logger.info(f"🔌 [WebSocket] Client connected: {client_info}, session_id={session_id}")

    message_handler = get_message_handler()

    try:
        # 發送連接成功訊息
        connection_message = {
            "type": "connected",
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send_json(connection_message)
        logger.info(f"📤 [WebSocket] Sent connection message to session {session_id}")

        # 保持連接並處理訊息
        message_count = 0
        while True:
            data = await websocket.receive_text()
            message_count += 1

            try:
                message = json.loads(data)

                # 使用統一的訊息處理器
                response = await message_handler.handle_message(websocket, message)

                if response:
                    # 發送回應
                    await websocket.send_json(response.model_dump())

            except json.JSONDecodeError as e:
                logger.error(f"❌ [WebSocket] JSON decode error from session {session_id}: {e}")
                await websocket.send_json({
                    "type": "error",
                    "error": "Invalid JSON",
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                logger.error(f"❌ [WebSocket] Error handling message from session {session_id}: {e}", exc_info=True)
                await websocket.send_json({
                    "type": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })

    except WebSocketDisconnect:
        logger.info(f"🔌 [WebSocket] Client disconnected: {client_info}, session_id={session_id}, total_messages={message_count}")
    except Exception as e:
        logger.error(f"❌ [WebSocket] Unexpected error for session {session_id}: {e}", exc_info=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
"""
Ramen API Module
Main FastAPI application for Ramen visual programming environment
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.project import router as project_router

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
app.include_router(project_router)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Ramen API is running"}

# Health check endpoint
@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
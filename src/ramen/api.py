"""
Ramen ; API !D
t@	 API ï1
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import project_router

# uú FastAPI É(
app = FastAPI(
    title="Ramen API",
    description="Visual Programming Environment API",
    version="1.0.0"
)

# -n CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite ‹|:h
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ;Šï1
app.include_router(project_router)

# 9ï‘
@app.get("/")
async def root():
    return {"message": "Ramen API is running"}

# e·¢å
@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
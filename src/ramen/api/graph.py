"""
圖形管理 API
提供圖形檔案的載入、保存、查詢等功能
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from pathlib import Path
import json

from ..core.models import (
    RamenGraph, GraphSerializer, GraphDeserializer,
    RamenGraphFile, RamenFileHeader, GRAPH_FORMAT_VERSION,
    GraphMetadata, GraphDependencies
)
from ..loader import GraphLoader

router = APIRouter(prefix="/api/graphs", tags=["graphs"])

# 請求模型
class LoadGraphRequest(BaseModel):
    path: str

class SaveGraphRequest(BaseModel):
    path: str
    graph: Dict[str, Any]
    dependencies: Optional[Dict[str, Any]] = None

class CheckDependenciesRequest(BaseModel):
    graph_path: str

# 響應模型
class GraphResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

class DependencyCheckResponse(BaseModel):
    success: bool
    missing: List[str] = []
    available: List[str] = []

@router.post("/load")
async def load_graph(request: LoadGraphRequest) -> GraphResponse:
    """載入圖形檔案"""
    try:
        loader = GraphLoader()
        graph = loader.load_graph(request.path)
        
        # 序列化為字典
        graph_dict = GraphSerializer.to_dict(graph)
        
        # 檢查是否有依賴
        dependencies = None
        if hasattr(graph, 'dependencies') and graph.dependencies:
            dependencies = GraphSerializer.to_dict(graph.dependencies)
        
        return GraphResponse(
            success=True,
            message=f"Successfully loaded graph: {graph.metadata.name}",
            data={
                "graph": graph_dict,
                "dependencies": dependencies
            }
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load graph: {e}")

@router.post("/save")
async def save_graph(request: SaveGraphRequest) -> GraphResponse:
    """保存圖形檔案"""
    try:
        # 反序列化圖形
        graph = GraphDeserializer.from_dict(request.graph, RamenGraph)
        
        # 處理依賴（如果有）
        dependencies = None
        if request.dependencies:
            dependencies = GraphDeserializer.from_dict(request.dependencies, GraphDependencies)
        
        # 建立完整的檔案結構
        graph_file = RamenGraphFile(
            header=RamenFileHeader(
                format="ramen-graph",
                version=GRAPH_FORMAT_VERSION,
            ),
            graph=graph,
            metadata=graph.metadata,
            dependencies=dependencies
        )
        
        # 序列化並保存
        file_path = Path(request.path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(GraphSerializer.to_dict(graph_file), f, indent=2, ensure_ascii=False)
        
        return GraphResponse(
            success=True,
            message=f"Successfully saved graph to {request.path}",
            data=None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save graph: {e}")

@router.post("/check-dependencies")
async def check_dependencies(request: CheckDependenciesRequest) -> DependencyCheckResponse:
    """檢查圖形的依賴狀態"""
    try:
        loader = GraphLoader()
        missing, available = loader.check_dependencies(request.graph_path)
        
        return DependencyCheckResponse(
            success=True,
            missing=missing,
            available=available
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check dependencies: {e}")

@router.get("/list")
async def list_graphs(directory: str = ".") -> GraphResponse:
    """列出目錄中的所有圖形檔案"""
    try:
        dir_path = Path(directory)
        if not dir_path.exists():
            raise FileNotFoundError(f"Directory not found: {directory}")
        
        graphs = []
        for file_path in dir_path.rglob("*.ramen"):
            try:
                loader = GraphLoader()
                graph = loader.load_graph(str(file_path))
                graphs.append({
                    "path": str(file_path),
                    "id": graph.id,
                    "name": graph.metadata.name,
                    "description": graph.metadata.description
                })
            except Exception:
                # 忽略無法載入的檔案
                continue
        
        return GraphResponse(
            success=True,
            message=f"Found {len(graphs)} graphs",
            data={"graphs": graphs}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list graphs: {e}")
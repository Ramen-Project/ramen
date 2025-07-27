"""
專案管理 API
提供專案檔案的載入、保存、建立等功能
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from pathlib import Path
import json
import subprocess
import os
import shutil
from datetime import datetime

from ..core.models import (
    RamenProject, RamenGraph, GraphSerializer, GraphDeserializer,
    RamenProjectFile, RamenFileHeader, GRAPH_FORMAT_VERSION
)
# from ..uv_wrapper import UVWrapper  # TODO: 實作 UV 包裝器

router = APIRouter(prefix="/api/projects", tags=["projects"])

# 請求模型
class CreateProjectRequest(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None  # 專案創建位置

class SaveProjectRequest(BaseModel):
    filePath: str
    project: Dict[str, Any]

class LoadProjectRequest(BaseModel):
    path: str

class SyncProjectRequest(BaseModel):
    projectPath: str

# 響應模型
class ProjectResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

class ProjectListResponse(BaseModel):
    success: bool
    projects: list[Dict[str, Any]]

# 專案管理類
class ProjectManager:
    """專案管理器，處理專案檔案操作"""
    
    @staticmethod
    def validate_project_name(name: str) -> bool:
        """驗證專案名稱是否有效"""
        if not name or len(name.strip()) < 2:
            return False
        
        # 檢查無效字元
        invalid_chars = '<>:"/\\|?*'
        return not any(char in name for char in invalid_chars)
    
    @staticmethod
    def create_project_directory(name: str, location: Optional[str] = None) -> Path:
        """創建專案目錄"""
        if location:
            base_path = Path(location)
        else:
            # 預設在用戶目錄下的 RamenProjects 資料夾
            base_path = Path.home() / "RamenProjects"
        
        base_path.mkdir(parents=True, exist_ok=True)
        project_path = base_path / name
        
        # 如果目錄已存在，添加數字後綴
        counter = 1
        original_path = project_path
        while project_path.exists():
            project_path = original_path.with_name(f"{original_path.name}_{counter}")
            counter += 1
        
        project_path.mkdir(parents=True, exist_ok=True)
        return project_path
    
    @staticmethod
    def init_uv_project(project_path: Path) -> bool:
        """在專案目錄中初始化 uv 專案"""
        try:
            # 創建 pyproject.toml
            pyproject_content = f"""[project]
name = "{project_path.name.lower().replace(' ', '-')}"
version = "0.1.0"
description = "Ramen project"
requires-python = ">=3.12"
dependencies = [
    "ramen",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.uv]
default-groups = ["ml"]

[dependency-groups]
ml = [
    "ramen-topping-torch",
    "ramen-topping-numpy", 
    "ramen-topping-pandas",
    "ramen-topping-plots"
]
"""
            
            pyproject_path = project_path / "pyproject.toml"
            with open(pyproject_path, 'w', encoding='utf-8') as f:
                f.write(pyproject_content)
            
            # 創建基本目錄結構
            (project_path / "graphs").mkdir(exist_ok=True)
            (project_path / "data").mkdir(exist_ok=True)
            (project_path / "outputs").mkdir(exist_ok=True)
            
            # 創建 README
            readme_content = f"""# {project_path.name}

這是一個 Ramen 專案。

## 專案結構

- `graphs/` - 圖形檔案 (.ramen)
- `data/` - 輸入資料
- `outputs/` - 輸出結果
- `{project_path.name}.ramen-project` - 專案檔案

## 使用方法

1. 在 Ramen 中開啟這個專案
2. 編輯圖形並設計你的工作流程
3. 使用 `ramen-cli run <graph_name>` 執行圖形

## 環境管理

此專案使用 uv 管理 Python 環境和依賴。運行以下指令來同步環境：

```bash
uv sync
```
"""
            
            readme_path = project_path / "README.md"
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)
            
            return True
            
        except Exception as e:
            print(f"Failed to init uv project: {e}")
            return False

# API 端點
@router.post("/create", response_model=ProjectResponse)
async def create_project(request: CreateProjectRequest):
    """創建新專案"""
    try:
        # 驗證專案名稱
        if not ProjectManager.validate_project_name(request.name):
            raise HTTPException(
                status_code=400, 
                detail="Invalid project name. Name must be at least 2 characters long and not contain invalid characters."
            )
        
        # 創建專案目錄
        project_path = ProjectManager.create_project_directory(request.name, request.location)
        
        # 初始化 uv 專案
        if not ProjectManager.init_uv_project(project_path):
            # 如果初始化失敗，清理已創建的目錄
            shutil.rmtree(project_path, ignore_errors=True)
            raise HTTPException(status_code=500, detail="Failed to initialize project structure")
        
        # 創建專案物件
        from nanoid import generate
        project = RamenProject(
            id=f"project-{generate()}",
            name=request.name,
            description=request.description,
            graphs=[],
            created_at=datetime.now().isoformat(),
            last_modified=datetime.now().isoformat(),
            version="1.0.0"
        )
        
        # 保存專案檔案
        project_file_path = project_path / f"{request.name}.ramen-project"
        GraphSerializer.save_project(project, project_file_path)
        
        return ProjectResponse(
            success=True,
            message="Project created successfully",
            data={
                "project": GraphSerializer.to_dict(project),
                "path": str(project_file_path),
                "directory": str(project_path)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@router.get("/load", response_model=ProjectResponse)
async def load_project(path: str):
    """載入專案"""
    try:
        project_path = Path(path)
        
        if not project_path.exists():
            raise HTTPException(status_code=404, detail="Project file not found")
        
        if not project_path.suffix == '.ramen-project':
            raise HTTPException(status_code=400, detail="Invalid project file format")
        
        # 載入專案
        project = GraphDeserializer.load_project(project_path)
        
        return ProjectResponse(
            success=True,
            message="Project loaded successfully",
            data={
                "project": GraphSerializer.to_dict(project),
                "path": str(project_path)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load project: {str(e)}")

@router.post("/save", response_model=ProjectResponse)
async def save_project(request: SaveProjectRequest):
    """保存專案"""
    try:
        # 將字典轉換為專案對象
        project = GraphDeserializer.from_dict(request.project, RamenProject)
        
        # 更新最後修改時間
        project.last_modified = datetime.now().isoformat()
        
        # 保存到檔案
        file_path = Path(request.filePath)
        GraphSerializer.save_project(project, file_path)
        
        return ProjectResponse(
            success=True,
            message="Project saved successfully",
            data={
                "path": str(file_path),
                "lastModified": project.last_modified
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save project: {str(e)}")

@router.post("/sync", response_model=ProjectResponse)
async def sync_project(request: SyncProjectRequest, background_tasks: BackgroundTasks):
    """同步專案環境 (uv sync)"""
    try:
        project_path = Path(request.projectPath)
        
        if project_path.is_file():
            # 如果是專案檔案，取得其目錄
            project_dir = project_path.parent
        else:
            # 如果是目錄，直接使用
            project_dir = project_path
        
        # 檢查是否為有效的 uv 專案
        pyproject_path = project_dir / "pyproject.toml"
        if not pyproject_path.exists():
            raise HTTPException(
                status_code=400, 
                detail="No pyproject.toml found. This directory is not a valid uv project."
            )
        
        # 在背景執行 uv sync
        background_tasks.add_task(run_uv_sync, project_dir)
        
        return ProjectResponse(
            success=True,
            message="Environment sync started in background",
            data={"projectDir": str(project_dir)}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync project: {str(e)}")

@router.get("/list", response_model=ProjectListResponse)
async def list_recent_projects():
    """列出最近的專案"""
    try:
        projects_dir = Path.home() / "RamenProjects"
        recent_projects = []
        
        if projects_dir.exists():
            # 尋找 .ramen-project 檔案
            for project_file in projects_dir.rglob("*.ramen-project"):
                try:
                    # 取得檔案資訊
                    stat = project_file.stat()
                    project_info = {
                        "name": project_file.stem,
                        "path": str(project_file),
                        "directory": str(project_file.parent),
                        "lastModified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "size": stat.st_size
                    }
                    recent_projects.append(project_info)
                except Exception:
                    # 忽略無法讀取的檔案
                    continue
        
        # 按最後修改時間排序
        recent_projects.sort(key=lambda x: x["lastModified"], reverse=True)
        
        return ProjectListResponse(
            success=True,
            projects=recent_projects[:10]  # 只返回最近 10 個專案
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list projects: {str(e)}")

# 背景任務
async def run_uv_sync(project_dir: Path):
    """在背景執行 uv sync"""
    try:
        # 切換到專案目錄並執行 uv sync
        result = subprocess.run(
            ["uv", "sync"],
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=300  # 5分鐘超時
        )
        
        if result.returncode == 0:
            print(f"uv sync completed successfully for {project_dir}")
        else:
            print(f"uv sync failed for {project_dir}: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        print(f"uv sync timed out for {project_dir}")
    except Exception as e:
        print(f"Error running uv sync for {project_dir}: {e}")

# 健康檢查
@router.get("/health")
async def health_check():
    """API 健康檢查"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
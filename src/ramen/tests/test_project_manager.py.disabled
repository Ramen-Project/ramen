"""
專案管理器測試（不依賴 FastAPI）
"""

import pytest
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

from ramen.api.project import ProjectManager
from ramen.core.models import RamenProject, GraphSerializer


class TestProjectManager:
    """測試專案管理器"""
    
    def test_validate_project_name(self):
        """測試專案名稱驗證"""
        # 有效名稱
        assert ProjectManager.validate_project_name("Valid Project") is True
        assert ProjectManager.validate_project_name("專案名稱") is True
        assert ProjectManager.validate_project_name("Project123") is True
        
        # 無效名稱
        assert ProjectManager.validate_project_name("") is False
        assert ProjectManager.validate_project_name("a") is False
        assert ProjectManager.validate_project_name("Project<>Name") is False
        assert ProjectManager.validate_project_name('Project"Name') is False
        assert ProjectManager.validate_project_name("Project/Name") is False
    
    def test_create_project_directory(self):
        """測試專案目錄創建"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = ProjectManager.create_project_directory(
                "Test Project", 
                temp_dir
            )
            
            assert project_path.exists()
            assert project_path.is_dir()
            assert project_path.name == "Test Project"
            assert project_path.parent == Path(temp_dir)
    
    def test_create_project_directory_duplicate(self):
        """測試重複專案名稱處理"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # 創建第一個專案
            path1 = ProjectManager.create_project_directory("Test Project", temp_dir)
            
            # 創建同名專案
            path2 = ProjectManager.create_project_directory("Test Project", temp_dir)
            
            assert path1.exists()
            assert path2.exists()
            assert path1 != path2
            assert path2.name == "Test Project_1"
    
    def test_init_uv_project(self):
        """測試 uv 專案初始化"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = Path(temp_dir) / "test_project"
            project_path.mkdir()
            
            success = ProjectManager.init_uv_project(project_path)
            
            assert success is True
            assert (project_path / "pyproject.toml").exists()
            assert (project_path / "README.md").exists()
            assert (project_path / "graphs").exists()
            assert (project_path / "data").exists()
            assert (project_path / "outputs").exists()
            
            # 檢查 pyproject.toml 內容
            with open(project_path / "pyproject.toml", 'r') as f:
                content = f.read()
                assert "test_project" in content
                assert "ramen" in content


class TestProjectIntegration:
    """整合測試"""
    
    def test_create_and_load_project_flow(self):
        """測試完整的創建和載入流程"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # 模擬創建專案
            project_path = Path(temp_dir) / "test_project"
            project_path.mkdir()
            
            # 初始化專案結構
            success = ProjectManager.init_uv_project(project_path)
            assert success is True
            
            # 創建專案物件
            project = RamenProject(
                id="test-project",
                name="Test Project",
                description="Integration test project",
                graphs=[],
                created_at="2023-01-01T00:00:00Z",
                last_modified="2023-01-01T00:00:00Z",
                version="1.0.0"
            )
            
            # 保存專案
            project_file = project_path / "test_project.ramen-project"
            GraphSerializer.save_project(project, project_file)
            
            assert project_file.exists()
            
            # 載入專案
            from ramen.core.models import GraphDeserializer
            loaded_project = GraphDeserializer.load_project(project_file)
            
            assert loaded_project.name == "Test Project"
            assert loaded_project.description == "Integration test project"
            assert len(loaded_project.graphs) == 0
    
    def test_project_directory_structure(self):
        """測試專案目錄結構"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = ProjectManager.create_project_directory(
                "Test Project",
                temp_dir
            )
            
            # 初始化專案
            success = ProjectManager.init_uv_project(project_path)
            assert success is True
            
            # 檢查目錄結構
            expected_dirs = ["graphs", "data", "outputs"]
            for dir_name in expected_dirs:
                assert (project_path / dir_name).exists()
                assert (project_path / dir_name).is_dir()
            
            # 檢查檔案
            expected_files = ["pyproject.toml", "README.md"]
            for file_name in expected_files:
                assert (project_path / file_name).exists()
                assert (project_path / file_name).is_file()
    
    def test_pyproject_toml_content(self):
        """測試 pyproject.toml 內容"""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = Path(temp_dir) / "my_test_project"
            project_path.mkdir()
            
            success = ProjectManager.init_uv_project(project_path)
            assert success is True
            
            pyproject_path = project_path / "pyproject.toml"
            content = pyproject_path.read_text()
            
            # 檢查基本內容
            assert 'name = "my_test_project"' in content
            assert 'version = "0.1.0"' in content
            assert '"ramen"' in content
            assert '[tool.uv]' in content
            assert 'default-groups = ["ml"]' in content
            
            # 檢查依賴
            expected_deps = [
                "ramen-topping-torch",
                "ramen-topping-numpy",
                "ramen-topping-pandas",
                "ramen-topping-plots"
            ]
            
            for dep in expected_deps:
                assert dep in content


if __name__ == "__main__":
    pytest.main([__file__])
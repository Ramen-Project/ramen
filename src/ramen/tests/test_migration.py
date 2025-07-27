"""
版本遷移測試
"""

import pytest
from typing import Dict, Any

from ramen.core.migration import (
    VersionComparison, VersionUtils, MigrationManager, 
    BackwardCompatibility, MigrationResult
)
from ramen.core.models import GRAPH_FORMAT_VERSION


class TestVersionUtils:
    """測試版本工具"""
    
    def test_parse_version(self):
        """測試解析版本號"""
        assert VersionUtils.parse_version("1.2.3") == (1, 2, 3)
        assert VersionUtils.parse_version("0.0.1") == (0, 0, 1)
        assert VersionUtils.parse_version("10.20.30") == (10, 20, 30)
    
    def test_parse_partial_version(self):
        """測試解析部分版本號"""
        assert VersionUtils.parse_version("1.2") == (1, 2, 0)
        assert VersionUtils.parse_version("1") == (1, 0, 0)
    
    def test_parse_invalid_version(self):
        """測試解析無效版本號"""
        assert VersionUtils.parse_version("") == (0, 0, 0)
        assert VersionUtils.parse_version("invalid") == (0, 0, 0)
        assert VersionUtils.parse_version("v1.2.3") == (1, 2, 3)  # 移除非數字字符
    
    def test_compare_versions(self):
        """測試版本比較"""
        # 相同版本
        assert VersionUtils.compare_versions("1.0.0", "1.0.0") == VersionComparison.SAME
        assert VersionUtils.compare_versions("2.5.3", "2.5.3") == VersionComparison.SAME
        
        # 較新版本
        assert VersionUtils.compare_versions("1.1.0", "1.0.0") == VersionComparison.NEWER
        assert VersionUtils.compare_versions("2.0.0", "1.9.9") == VersionComparison.NEWER
        assert VersionUtils.compare_versions("1.0.1", "1.0.0") == VersionComparison.NEWER
        
        # 較舊版本
        assert VersionUtils.compare_versions("1.0.0", "1.1.0") == VersionComparison.OLDER
        assert VersionUtils.compare_versions("1.9.9", "2.0.0") == VersionComparison.OLDER
        assert VersionUtils.compare_versions("1.0.0", "1.0.1") == VersionComparison.OLDER
    
    def test_is_compatible(self):
        """測試版本兼容性"""
        # 相同主版本號
        assert VersionUtils.is_compatible("1.0.0", "1.1.0") is True
        assert VersionUtils.is_compatible("1.2.0", "1.3.0") is True
        
        # 不同主版本號
        assert VersionUtils.is_compatible("1.0.0", "2.0.0") is False
        assert VersionUtils.is_compatible("2.0.0", "1.0.0") is False
        
        # 檔案版本較新的次版本號
        assert VersionUtils.is_compatible("1.2.0", "1.1.0") is False
    
    def test_get_version_diff(self):
        """測試版本差異計算"""
        diff = VersionUtils.get_version_diff("1.0.0", "1.1.0")
        assert diff == {"major_diff": 0, "minor_diff": 1, "patch_diff": 0}
        
        diff = VersionUtils.get_version_diff("1.0.0", "2.0.0")
        assert diff == {"major_diff": 1, "minor_diff": 0, "patch_diff": 0}
        
        diff = VersionUtils.get_version_diff("1.2.3", "1.2.5")
        assert diff == {"major_diff": 0, "minor_diff": 0, "patch_diff": 2}


class TestMigrationManager:
    """測試遷移管理器"""
    
    def test_needs_migration(self):
        """測試是否需要遷移"""
        assert MigrationManager.needs_migration("1.0.0", "1.1.0") is True
        assert MigrationManager.needs_migration("0.9.0", "1.0.0") is True
        assert MigrationManager.needs_migration("1.0.0", "1.0.0") is False
        assert MigrationManager.needs_migration("1.1.0", "1.0.0") is False
    
    def test_migrate_same_version(self):
        """測試相同版本的遷移"""
        test_data = {"id": "test", "metadata": {"version": "1.0.0"}}
        result = MigrationManager.migrate(test_data, "1.0.0", "1.0.0")
        
        assert result.success is True
        assert result.from_version == "1.0.0"
        assert result.to_version == "1.0.0"
        assert result.data == test_data
        assert len(result.warnings) == 0
        assert len(result.errors) == 0
    
    def test_migrate_no_path(self):
        """測試沒有遷移路徑的情況"""
        test_data = {"id": "test"}
        result = MigrationManager.migrate(test_data, "0.1.0", "2.0.0")
        
        assert result.success is False
        assert len(result.errors) > 0
        assert "No migration path found" in result.errors[0]
    
    def test_migrate_graph(self):
        """測試圖形遷移"""
        graph_data = {
            "id": "test-graph",
            "metadata": {
                "name": "Test Graph",
                "version": "1.0.0"
            },
            "nodes": [],
            "edges": []
        }
        
        result = MigrationManager.migrate_graph(graph_data)
        assert result.from_version == "1.0.0"
    
    def test_migrate_graph_no_version(self):
        """測試沒有版本的圖形遷移"""
        graph_data = {
            "id": "test-graph",
            "metadata": {"name": "Test Graph"},
            "nodes": [],
            "edges": []
        }
        
        result = MigrationManager.migrate_graph(graph_data)
        assert result.from_version == "1.0.0"  # 預設版本
    
    def test_migrate_project(self):
        """測試專案遷移"""
        project_data = {
            "id": "test-project",
            "name": "Test Project",
            "version": "1.0.0",
            "graphs": [
                {
                    "id": "graph-1",
                    "metadata": {"name": "Graph 1", "version": "1.0.0"},
                    "nodes": [],
                    "edges": []
                }
            ]
        }
        
        result = MigrationManager.migrate_project(project_data)
        assert result.from_version == "1.0.0"
        assert len(result.data["graphs"]) == 1
    
    def test_get_supported_versions(self):
        """測試獲取支援的版本"""
        versions = MigrationManager.get_supported_versions()
        assert isinstance(versions, list)
        assert len(versions) > 0
        assert GRAPH_FORMAT_VERSION in versions
        
        # 檢查版本排序（降序）
        for i in range(1, len(versions)):
            prev_ver = VersionUtils.parse_version(versions[i-1])
            curr_ver = VersionUtils.parse_version(versions[i])
            assert prev_ver >= curr_ver


class TestBackwardCompatibility:
    """測試向後兼容性"""
    
    def test_load_legacy_simple_format(self):
        """測試載入簡單格式"""
        legacy_data = {
            "nodes": [
                {
                    "id": "node-1",
                    "type": "operator",
                    "position": {"x": 100.0, "y": 200.0},
                    "data": {
                        "name": "Test Node",
                        "namespace": "Math",
                        "brief": "A test node"
                    }
                }
            ],
            "edges": [
                {
                    "id": "edge-1",
                    "source": "node-1",
                    "target": "node-2",
                    "sourceHandle": "output-1",
                    "targetHandle": "input-1"
                }
            ]
        }
        
        result = BackwardCompatibility.load_legacy_format(legacy_data)
        
        assert result["success"] is True
        assert "graph" in result
        graph = result["graph"]
        assert graph["id"] is not None
        assert graph["metadata"]["name"] == "Migrated Graph"
        assert len(graph["nodes"]) == 1
        assert len(graph["edges"]) == 1
        assert len(result["warnings"]) > 0
    
    def test_load_unknown_format(self):
        """測試載入未知格式"""
        unknown_data = {
            "some_property": "value"
        }
        
        result = BackwardCompatibility.load_legacy_format(unknown_data)
        
        assert result["success"] is False
        assert "Unknown legacy format" in result["warnings"]
    
    def test_load_invalid_legacy_format(self):
        """測試載入無效的舊格式"""
        invalid_data = {
            "nodes": "invalid",
            "edges": None
        }
        
        result = BackwardCompatibility.load_legacy_format(invalid_data)
        
        assert result["success"] is False
        assert len(result["warnings"]) > 0
        assert "Failed to convert legacy format" in result["warnings"][0]
    
    def test_convert_legacy_nodes(self):
        """測試轉換舊節點格式"""
        legacy_nodes = [
            {
                "id": "node-1",
                "type": "operator",
                "position": {"x": 100.0, "y": 200.0},
                "data": {
                    "name": "Test Node",
                    "namespace": "Math",
                    "brief": "A test node",
                    "inputs": [{"id": "input1", "name": "a", "type_id": "float", "is_input": True}],
                    "outputs": [{"id": "output1", "name": "result", "type_id": "float", "is_input": False}]
                },
                "selected": True,
                "hidden": False,
                "parentId": "group-1"
            }
        ]
        
        converted = BackwardCompatibility._convert_legacy_nodes(legacy_nodes)
        
        assert len(converted) == 1
        node = converted[0]
        assert node["id"] == "node-1"
        assert node["metadata"]["name"] == "Test Node"
        assert node["metadata"]["namespace"] == "Math"
        assert node["position"]["x"] == 100.0
        assert node["selected"] is True
        assert node["visible"] is True
        assert node["parent_id"] == "group-1"
        assert len(node["inputs"]) == 1
        assert len(node["outputs"]) == 1
    
    def test_convert_legacy_edges(self):
        """測試轉換舊邊格式"""
        legacy_edges = [
            {
                "id": "edge-1",
                "source": "node-1",
                "target": "node-2",
                "sourceHandle": "output-1",
                "targetHandle": "input-1",
                "label": "Test Edge",
                "selected": True,
                "hidden": False,
                "style": {"color": "red"},
                "data": {"custom": "value"}
            }
        ]
        
        converted = BackwardCompatibility._convert_legacy_edges(legacy_edges)
        
        assert len(converted) == 1
        edge = converted[0]
        assert edge["id"] == "edge-1"
        assert edge["source_node_id"] == "node-1"
        assert edge["target_node_id"] == "node-2"
        assert edge["source_port_id"] == "output-1"
        assert edge["target_port_id"] == "input-1"
        assert edge["label"] == "Test Edge"
        assert edge["selected"] is True
        assert edge["visible"] is True
        assert edge["style"]["color"] == "red"
        assert edge["data"]["custom"] == "value"


if __name__ == "__main__":
    pytest.main([__file__])
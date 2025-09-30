"""
圖形格式版本遷移工具
處理不同版本間的數據格式轉換
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from datetime import datetime
import re

from ramen.core.models import GRAPH_FORMAT_VERSION

class VersionComparison(Enum):
    """版本比較結果"""
    SAME = 0
    NEWER = 1
    OLDER = -1

@dataclass
class MigrationResult:
    """遷移結果"""
    success: bool
    from_version: str
    to_version: str
    warnings: List[str]
    errors: List[str]
    data: Any

class Migrator(ABC):
    """遷移器介面"""
    
    @property
    @abstractmethod
    def from_version(self) -> str:
        pass
    
    @property
    @abstractmethod
    def to_version(self) -> str:
        pass
    
    @abstractmethod
    def migrate(self, data: Dict[str, Any]) -> MigrationResult:
        pass

class VersionUtils:
    """版本工具"""
    
    @staticmethod
    def parse_version(version: str) -> Tuple[int, int, int]:
        """解析版本號"""
        # 移除非數字字符，只保留數字和點
        clean_version = re.sub(r'[^\d.]', '', version)
        parts = clean_version.split('.')
        
        try:
            major = int(parts[0]) if len(parts) > 0 else 0
            minor = int(parts[1]) if len(parts) > 1 else 0
            patch = int(parts[2]) if len(parts) > 2 else 0
            return (major, minor, patch)
        except ValueError:
            return (0, 0, 0)
    
    @staticmethod
    def compare_versions(version1: str, version2: str) -> VersionComparison:
        """比較版本號"""
        v1 = VersionUtils.parse_version(version1)
        v2 = VersionUtils.parse_version(version2)
        
        if v1[0] != v2[0]:  # major
            return VersionComparison.NEWER if v1[0] > v2[0] else VersionComparison.OLDER
        if v1[1] != v2[1]:  # minor
            return VersionComparison.NEWER if v1[1] > v2[1] else VersionComparison.OLDER
        if v1[2] != v2[2]:  # patch
            return VersionComparison.NEWER if v1[2] > v2[2] else VersionComparison.OLDER
        
        return VersionComparison.SAME
    
    @staticmethod
    def is_compatible(file_version: str, app_version: str = GRAPH_FORMAT_VERSION) -> bool:
        """檢查版本兼容性"""
        file_ver = VersionUtils.parse_version(file_version)
        app_ver = VersionUtils.parse_version(app_version)
        
        # 主版本號不同則不兼容
        if file_ver[0] != app_ver[0]:
            return False
        
        # 次版本號向後兼容
        return file_ver[1] <= app_ver[1]
    
    @staticmethod
    def get_version_diff(from_version: str, to_version: str) -> Dict[str, int]:
        """獲取版本間的差異"""
        from_ver = VersionUtils.parse_version(from_version)
        to_ver = VersionUtils.parse_version(to_version)
        
        return {
            'major_diff': to_ver[0] - from_ver[0],
            'minor_diff': to_ver[1] - from_ver[1],
            'patch_diff': to_ver[2] - from_ver[2]
        }

class Migration_1_0_0_to_1_1_0(Migrator):
    """1.0.0 到 1.1.0 的遷移器 (範例)"""
    
    @property
    def from_version(self) -> str:
        return "1.0.0"
    
    @property
    def to_version(self) -> str:
        return "1.1.0"
    
    def migrate(self, data: Dict[str, Any]) -> MigrationResult:
        result = MigrationResult(
            success=True,
            from_version=self.from_version,
            to_version=self.to_version,
            warnings=[],
            errors=[],
            data=data.copy()
        )
        
        try:
            # 範例：添加新的 metadata 欄位
            if 'metadata' in result.data and 'tags' not in result.data['metadata']:
                result.data['metadata']['tags'] = []
                result.warnings.append('Added missing tags field to metadata')
            
            # 範例：更新節點結構
            if 'nodes' in result.data:
                for node in result.data['nodes']:
                    if 'metadata' in node and 'category' not in node['metadata']:
                        node['metadata']['category'] = 'Utilities'
                        result.warnings.append(f'Added default category to node {node.get("id", "unknown")}')
            
            # 更新版本號
            if 'metadata' in result.data:
                result.data['metadata']['version'] = self.to_version
            
        except Exception as e:
            result.success = False
            result.errors.append(f'Migration failed: {str(e)}')
        
        return result

class MigrationManager:
    """遷移管理器"""
    
    _migrators: List[Migrator] = [
        Migration_1_0_0_to_1_1_0(),
        # 未來的遷移器可以在這裡添加
    ]
    
    @classmethod
    def get_migration_path(cls, from_version: str, to_version: str) -> List[Migrator]:
        """獲取可用的遷移路徑"""
        path: List[Migrator] = []
        current_version = from_version
        
        while VersionUtils.compare_versions(current_version, to_version) == VersionComparison.OLDER:
            migrator = next((m for m in cls._migrators if m.from_version == current_version), None)
            
            if not migrator:
                raise ValueError(f"No migration path found from {current_version} to {to_version}")
            
            path.append(migrator)
            current_version = migrator.to_version
        
        return path
    
    @classmethod
    def migrate(cls, data: Dict[str, Any], from_version: str, 
                to_version: str = GRAPH_FORMAT_VERSION) -> MigrationResult:
        """執行遷移"""
        # 如果版本相同，不需要遷移
        if VersionUtils.compare_versions(from_version, to_version) == VersionComparison.SAME:
            return MigrationResult(
                success=True,
                from_version=from_version,
                to_version=to_version,
                warnings=[],
                errors=[],
                data=data
            )
        
        try:
            migration_path = cls.get_migration_path(from_version, to_version)
            current_data = data.copy()
            all_warnings: List[str] = []
            all_errors: List[str] = []
            
            for migrator in migration_path:
                result = migrator.migrate(current_data)
                
                if not result.success:
                    return MigrationResult(
                        success=False,
                        from_version=from_version,
                        to_version=to_version,
                        warnings=all_warnings + result.warnings,
                        errors=all_errors + result.errors,
                        data=current_data
                    )
                
                current_data = result.data
                all_warnings.extend(result.warnings)
                all_errors.extend(result.errors)
            
            return MigrationResult(
                success=True,
                from_version=from_version,
                to_version=to_version,
                warnings=all_warnings,
                errors=all_errors,
                data=current_data
            )
        
        except Exception as e:
            return MigrationResult(
                success=False,
                from_version=from_version,
                to_version=to_version,
                warnings=[],
                errors=[f'Migration failed: {str(e)}'],
                data=data
            )
    
    @classmethod
    def migrate_graph(cls, graph_data: Dict[str, Any]) -> MigrationResult:
        """自動遷移圖形數據"""
        file_version = graph_data.get('metadata', {}).get('version', '1.0.0')
        return cls.migrate(graph_data, file_version)
    
    @classmethod
    def migrate_project(cls, project_data: Dict[str, Any]) -> MigrationResult:
        """自動遷移專案數據"""
        file_version = project_data.get('version', '1.0.0')
        
        # 先遷移專案級別的數據
        project_result = cls.migrate(project_data, file_version)
        
        if not project_result.success:
            return project_result
        
        # 遷移每個圖形
        migrated_graphs: List[Dict[str, Any]] = []
        all_warnings = project_result.warnings.copy()
        all_errors = project_result.errors.copy()
        
        for graph in project_result.data.get('graphs', []):
            graph_result = cls.migrate_graph(graph)
            
            if not graph_result.success:
                all_errors.append(f'Failed to migrate graph {graph.get("id", "unknown")}: {", ".join(graph_result.errors)}')
                continue
            
            migrated_graphs.append(graph_result.data)
            all_warnings.extend(graph_result.warnings)
            all_errors.extend(graph_result.errors)
        
        result_data = project_result.data.copy()
        result_data['graphs'] = migrated_graphs
        
        return MigrationResult(
            success=len(all_errors) == 0,
            from_version=file_version,
            to_version=GRAPH_FORMAT_VERSION,
            warnings=all_warnings,
            errors=all_errors,
            data=result_data
        )
    
    @classmethod
    def needs_migration(cls, version: str, target_version: str = GRAPH_FORMAT_VERSION) -> bool:
        """檢查是否需要遷移"""
        return VersionUtils.compare_versions(version, target_version) == VersionComparison.OLDER
    
    @classmethod
    def get_supported_versions(cls) -> List[str]:
        """獲取所有支援的版本"""
        versions = set()
        
        # 添加所有遷移器的版本
        for migrator in cls._migrators:
            versions.add(migrator.from_version)
            versions.add(migrator.to_version)
        
        # 添加當前版本
        versions.add(GRAPH_FORMAT_VERSION)
        
        # 排序版本
        version_list = list(versions)
        version_list.sort(key=lambda v: VersionUtils.parse_version(v), reverse=True)
        
        return version_list

class BackwardCompatibility:
    """向後兼容性工具"""
    
    @staticmethod
    def load_legacy_format(data: Dict[str, Any]) -> Dict[str, Any]:
        """嘗試從舊格式載入數據"""
        warnings: List[str] = []
        
        try:
            # 檢查是否為簡單格式 (只有 nodes 和 edges)
            if 'nodes' in data and 'edges' in data and 'metadata' not in data:
                warnings.append('Detected legacy simple format, converting...')
                
                # 轉換為新格式
                converted_graph = {
                    'id': f'migrated-{int(datetime.now().timestamp())}',
                    'metadata': {
                        'name': 'Migrated Graph',
                        'description': 'Converted from legacy format',
                        'created_at': datetime.now().isoformat(),
                        'last_modified': datetime.now().isoformat(),
                        'version': GRAPH_FORMAT_VERSION
                    },
                    'nodes': BackwardCompatibility._convert_legacy_nodes(data['nodes']),
                    'edges': BackwardCompatibility._convert_legacy_edges(data['edges']),
                    'variables': [],
                    'viewport': data.get('viewport')
                }
                
                return {
                    'success': True,
                    'graph': converted_graph,
                    'warnings': warnings
                }
            
            # 其他舊格式檢查...
            
            return {
                'success': False,
                'warnings': ['Unknown legacy format']
            }
            
        except Exception as e:
            return {
                'success': False,
                'warnings': [f'Failed to convert legacy format: {str(e)}']
            }
    
    @staticmethod
    def _convert_legacy_nodes(legacy_nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """轉換舊的節點格式"""
        converted_nodes = []
        
        for node in legacy_nodes:
            converted_node = {
                'id': node['id'],
                'metadata': {
                    'type': node.get('type', 'operator'),
                    'name': node.get('data', {}).get('name', node['id']),
                    'namespace': node.get('data', {}).get('namespace', 'default'),
                    'description': node.get('data', {}).get('brief') or node.get('data', {}).get('description')
                },
                'position': node['position'],
                'inputs': node.get('data', {}).get('inputs', []),
                'outputs': node.get('data', {}).get('outputs', []),
                'selected': node.get('selected', False),
                'visible': not node.get('hidden', False),
                'data': node.get('data', {})
            }
            
            if 'parentId' in node:
                converted_node['parent_id'] = node['parentId']
            
            converted_nodes.append(converted_node)
        
        return converted_nodes
    
    @staticmethod
    def _convert_legacy_edges(legacy_edges: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """轉換舊的邊格式"""
        converted_edges = []
        
        for edge in legacy_edges:
            converted_edge = {
                'id': edge['id'],
                'source_node_id': edge['source'],
                'source_port_id': edge.get('sourceHandle', 'output0'),
                'target_node_id': edge['target'],
                'target_port_id': edge.get('targetHandle', 'input0'),
                'selected': edge.get('selected', False),
                'visible': not edge.get('hidden', False)
            }
            
            if 'label' in edge:
                converted_edge['label'] = edge['label']
            if 'style' in edge:
                converted_edge['style'] = edge['style']
            if 'data' in edge:
                converted_edge['data'] = edge['data']
            
            converted_edges.append(converted_edge)
        
        return converted_edges
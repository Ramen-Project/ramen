"""
Git 整合 API 端點
提供圖形檔案的版本控制功能

⚠️  DEPRECATED: HTTP endpoints in this module are deprecated.
All functionality has been migrated to WebSocket API.
See: src/ramen/api/websocket_handler.py
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import json

from ..core.models import RamenGraph, GraphDeserializer
from ..git.diff import GraphDiffer, GraphDiffResult, format_diff_summary
from ..git.merge import GraphMerger, ConflictResolution

router = APIRouter(prefix="/git", tags=["git"])


class GitDiffRequest(BaseModel):
    """Git 差異請求模型"""
    oldGraph: Dict[str, Any]
    newGraph: Dict[str, Any]
    fromVersion: Optional[str] = "old"
    toVersion: Optional[str] = "new"


class GitDiffResponse(BaseModel):
    """Git 差異回應模型"""
    fromVersion: str
    toVersion: str
    totalChanges: int
    nodesAdded: List[Dict[str, Any]]
    nodesRemoved: List[Dict[str, Any]]
    nodesModified: List[Dict[str, Any]]
    nodesMoved: List[Dict[str, Any]]
    edgesAdded: List[Dict[str, Any]]
    edgesRemoved: List[Dict[str, Any]]
    edgesModified: List[Dict[str, Any]]
    metadataChanges: List[str]
    summary: str


@router.post("/diff", response_model=GitDiffResponse)
async def compute_graph_diff(request: GitDiffRequest):
    """
    計算兩個圖形版本之間的語義化差異
    
    Args:
        request: 包含兩個圖形版本的請求
        
    Returns:
        GitDiffResponse: 詳細的差異分析結果
    """
    try:
        # 解析圖形數據
        if 'graph' in request.oldGraph:
            old_graph_data = request.oldGraph['graph']
        else:
            old_graph_data = request.oldGraph
            
        if 'graph' in request.newGraph:
            new_graph_data = request.newGraph['graph']
        else:
            new_graph_data = request.newGraph
        
        # 反序列化圖形
        old_graph = GraphDeserializer.from_dict(old_graph_data, RamenGraph)
        new_graph = GraphDeserializer.from_dict(new_graph_data, RamenGraph)
        
        # 執行差異比較
        differ = GraphDiffer()
        diff_result = differ.compare(
            old_graph, 
            new_graph, 
            request.fromVersion, 
            request.toVersion
        )
        
        # 轉換為回應格式
        response = GitDiffResponse(
            fromVersion=diff_result.from_version,
            toVersion=diff_result.to_version,
            totalChanges=diff_result.total_changes,
            nodesAdded=[
                {
                    "nodeId": diff.node_id,
                    "changes": diff.changes,
                    "diffType": diff.diff_type.value,
                    "newData": diff.new_data
                }
                for diff in diff_result.nodes_added
            ],
            nodesRemoved=[
                {
                    "nodeId": diff.node_id,
                    "changes": diff.changes,
                    "diffType": diff.diff_type.value,
                    "oldData": diff.old_data
                }
                for diff in diff_result.nodes_removed
            ],
            nodesModified=[
                {
                    "nodeId": diff.node_id,
                    "changes": diff.changes,
                    "diffType": diff.diff_type.value,
                    "oldData": diff.old_data,
                    "newData": diff.new_data
                }
                for diff in diff_result.nodes_modified
            ],
            nodesMoved=[
                {
                    "nodeId": diff.node_id,
                    "changes": diff.changes,
                    "diffType": diff.diff_type.value,
                    "oldData": diff.old_data,
                    "newData": diff.new_data
                }
                for diff in diff_result.nodes_moved
            ],
            edgesAdded=[
                {
                    "edgeId": diff.edge_id,
                    "changes": diff.changes,
                    "diffType": diff.diff_type.value,
                    "newData": diff.new_data
                }
                for diff in diff_result.edges_added
            ],
            edgesRemoved=[
                {
                    "edgeId": diff.edge_id,
                    "changes": diff.changes,
                    "diffType": diff.diff_type.value,
                    "oldData": diff.old_data
                }
                for diff in diff_result.edges_removed
            ],
            edgesModified=[
                {
                    "edgeId": diff.edge_id,
                    "changes": diff.changes,
                    "diffType": diff.diff_type.value,
                    "oldData": diff.old_data,
                    "newData": diff.new_data
                }
                for diff in diff_result.edges_modified
            ],
            metadataChanges=diff_result.metadata_changes,
            summary=format_diff_summary(diff_result)
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to compute diff: {str(e)}")


@router.get("/health")
async def git_health_check():
    """Git API 健康檢查"""
    return {
        "status": "healthy",
        "service": "ramen-git-api", 
        "version": "1.0.0",
        "features": [
            "semantic_diff",
            "graph_comparison",
            "change_detection"
        ]
    }


class GraphValidationRequest(BaseModel):
    """圖形驗證請求模型"""
    graph: Dict[str, Any]


@router.post("/validate")
async def validate_graph(request: GraphValidationRequest):
    """
    驗證圖形格式是否正確
    
    Args:
        request: 包含圖形數據的請求
        
    Returns:
        Dict: 驗證結果
    """
    try:
        # 嘗試解析圖形
        if 'graph' in request.graph:
            graph_data = request.graph['graph']
        else:
            graph_data = request.graph
            
        graph = GraphDeserializer.from_dict(graph_data, RamenGraph)
        
        return {
            "valid": True,
            "graphId": graph.id,
            "nodes": len(graph.nodes),
            "edges": len(graph.edges),
            "metadata": {
                "name": graph.metadata.name,
                "version": graph.metadata.version
            }
        }
        
    except Exception as e:
        return {
            "valid": False,
            "error": str(e),
            "details": "Graph format validation failed"
        }


@router.get("/diff/formats")
async def get_supported_diff_formats():
    """獲取支援的差異格式"""
    return {
        "formats": [
            {
                "name": "semantic",
                "description": "Node-level semantic differences",
                "features": ["node_changes", "edge_changes", "metadata_changes", "position_tracking"]
            },
            {
                "name": "summary", 
                "description": "Human-readable diff summary",
                "features": ["text_format", "change_statistics", "colored_output"]
            },
            {
                "name": "json",
                "description": "Structured JSON diff data",
                "features": ["programmatic_access", "detailed_changes", "version_info"]
            }
        ],
        "change_types": [
            "added",
            "removed", 
            "modified",
            "moved",
            "reconnected"
        ]
    }


class GitMergeRequest(BaseModel):
    """Git 合併請求模型"""
    baseGraph: Dict[str, Any]
    leftGraph: Dict[str, Any] 
    rightGraph: Dict[str, Any]
    baseVersion: Optional[str] = "base"
    leftVersion: Optional[str] = "ours" 
    rightVersion: Optional[str] = "theirs"


class ConflictItemResponse(BaseModel):
    """衝突項目回應模型"""
    conflictId: str
    conflictType: str
    elementId: str
    elementType: str
    description: str
    leftData: Optional[Dict[str, Any]] = None
    rightData: Optional[Dict[str, Any]] = None
    baseData: Optional[Dict[str, Any]] = None
    autoResolutionSuggestion: Optional[str] = None
    autoResolutionConfidence: Optional[float] = None


class GitMergeResponse(BaseModel):
    """Git 合併回應模型"""
    success: bool
    hasConflicts: bool
    autoMergedCount: int
    manualRequiredCount: int
    mergeSummary: str
    baseVersion: str
    leftVersion: str
    rightVersion: str
    conflicts: List[ConflictItemResponse]
    mergedGraph: Optional[Dict[str, Any]] = None


@router.post("/merge", response_model=GitMergeResponse)
async def perform_three_way_merge(request: GitMergeRequest):
    """
    執行三方合併操作
    
    Args:
        request: 包含三個圖形版本的合併請求
        
    Returns:
        GitMergeResponse: 合併結果和衝突信息
    """
    try:
        # 解析圖形數據
        def extract_graph_data(graph_dict):
            if 'graph' in graph_dict:
                return graph_dict['graph']
            return graph_dict
        
        base_data = extract_graph_data(request.baseGraph)
        left_data = extract_graph_data(request.leftGraph)
        right_data = extract_graph_data(request.rightGraph)
        
        # 反序列化圖形
        base_graph = GraphDeserializer.from_dict(base_data, RamenGraph)
        left_graph = GraphDeserializer.from_dict(left_data, RamenGraph)
        right_graph = GraphDeserializer.from_dict(right_data, RamenGraph)
        
        # 執行三方合併
        merger = GraphMerger()
        merge_result = merger.three_way_merge(
            base_graph, 
            left_graph, 
            right_graph,
            request.baseVersion,
            request.leftVersion,
            request.rightVersion
        )
        
        # 轉換衝突為回應格式
        conflicts_response = []
        for conflict in merge_result.conflicts:
            conflicts_response.append(ConflictItemResponse(
                conflictId=conflict.conflict_id,
                conflictType=conflict.conflict_type.value,
                elementId=conflict.element_id,
                elementType=conflict.element_type,
                description=conflict.description,
                leftData=conflict.left_data,
                rightData=conflict.right_data,
                baseData=conflict.base_data,
                autoResolutionSuggestion=conflict.auto_resolution_suggestion.value if conflict.auto_resolution_suggestion else None,
                autoResolutionConfidence=conflict.auto_resolution_confidence
            ))
        
        response = GitMergeResponse(
            success=merge_result.success,
            hasConflicts=merge_result.has_conflicts,
            autoMergedCount=merge_result.auto_merged_count,
            manualRequiredCount=merge_result.manual_required_count,
            mergeSummary=merge_result.merge_summary,
            baseVersion=merge_result.base_version,
            leftVersion=merge_result.left_version,
            rightVersion=merge_result.right_version,
            conflicts=conflicts_response,
            mergedGraph=merge_result.merged_graph.__dict__ if merge_result.merged_graph else None
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to perform merge: {str(e)}")


class ConflictResolutionRequest(BaseModel):
    """衝突解決請求模型"""
    conflictId: str
    resolution: str  # ConflictResolution enum value
    customData: Optional[Dict[str, Any]] = None


@router.post("/resolve-conflict")
async def resolve_merge_conflict(request: ConflictResolutionRequest):
    """
    解決合併衝突
    
    Args:
        request: 衝突解決請求
        
    Returns:
        Dict: 解決結果
    """
    try:
        # 驗證解決策略
        try:
            resolution = ConflictResolution(request.resolution)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid resolution strategy: {request.resolution}"
            )
        
        return {
            "conflictId": request.conflictId,
            "resolution": resolution.value,
            "status": "resolved",
            "customData": request.customData
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to resolve conflict: {str(e)}")


@router.get("/merge/strategies")
async def get_merge_strategies():
    """獲取可用的合併策略"""
    return {
        "auto_merge_strategies": [
            {
                "name": "position_only_changes",
                "description": "Auto-merge when only node positions change",
                "confidence": "high"
            },
            {
                "name": "non_overlapping_changes", 
                "description": "Auto-merge when changes don't overlap",
                "confidence": "medium"
            },
            {
                "name": "metadata_only_changes",
                "description": "Auto-merge simple metadata changes",
                "confidence": "high"
            }
        ],
        "conflict_resolution_options": [
            {
                "value": "KEEP_LEFT",
                "description": "Keep the left/our version"
            },
            {
                "value": "KEEP_RIGHT", 
                "description": "Keep the right/their version"
            },
            {
                "value": "KEEP_BASE",
                "description": "Revert to base version"
            },
            {
                "value": "MANUAL_MERGE",
                "description": "Manually specify the merged result"
            },
            {
                "value": "SKIP_ELEMENT",
                "description": "Skip this element in the merge"
            }
        ]
    }


class GitHistoryRequest(BaseModel):
    """Git 歷史請求模型"""
    graphPath: str
    maxCount: Optional[int] = 10
    since: Optional[str] = None
    until: Optional[str] = None
    author: Optional[str] = None


class GitCommitInfo(BaseModel):
    """Git 提交信息模型"""
    hash: str
    shortHash: str
    author: str
    authorEmail: str
    date: str
    timestamp: int
    message: str
    subject: str
    body: str
    parents: List[str]
    refs: List[str]
    graphChanges: Optional[Dict[str, Any]] = None


class GitHistoryResponse(BaseModel):
    """Git 歷史回應模型"""
    graphPath: str
    totalCommits: int
    commits: List[GitCommitInfo]
    branches: List[str]
    currentBranch: str


@router.post("/history", response_model=GitHistoryResponse)
async def get_graph_history(request: GitHistoryRequest):
    """
    獲取圖形檔案的 Git 歷史記錄
    
    Args:
        request: 歷史記錄請求
        
    Returns:
        GitHistoryResponse: 版本歷史和提交信息
    """
    import subprocess
    import re
    from datetime import datetime as dt
    
    try:
        graph_path = request.graphPath
        
        # 建構 git log 命令
        cmd = [
            "git", "log", 
            "--format=%H|%h|%an|%ae|%ad|%at|%s|%b|%P|%D",
            "--date=iso", 
            f"-{request.maxCount}"
        ]
        
        if request.since:
            cmd.extend([f"--since={request.since}"])
        if request.until:
            cmd.extend([f"--until={request.until}"])
        if request.author:
            cmd.extend([f"--author={request.author}"])
            
        cmd.append("--")
        cmd.append(graph_path)
        
        # 執行 git log
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
        if result.returncode != 0:
            raise HTTPException(status_code=404, detail=f"Git history not found: {result.stderr}")
        
        # 解析提交記錄
        commits = []
        commit_lines = result.stdout.strip().split('\n\n')
        
        for commit_block in commit_lines:
            if not commit_block.strip():
                continue
                
            lines = commit_block.strip().split('\n')
            if not lines:
                continue
                
            # 解析第一行的格式化信息
            parts = lines[0].split('|')
            if len(parts) < 8:
                continue
                
            hash_full = parts[0]
            hash_short = parts[1]
            author = parts[2]
            author_email = parts[3]
            date_str = parts[4]
            timestamp = int(parts[5]) if parts[5].isdigit() else 0
            subject = parts[6]
            body_part = parts[7] if len(parts) > 7 else ""
            parents = parts[8].split() if len(parts) > 8 and parts[8] else []
            refs = [ref.strip() for ref in parts[9].split(',') if ref.strip()] if len(parts) > 9 else []
            
            # 提取 body（多行信息）
            body_lines = lines[1:] if len(lines) > 1 else []
            full_body = body_part + '\n' + '\n'.join(body_lines) if body_lines else body_part
            
            commit_info = GitCommitInfo(
                hash=hash_full,
                shortHash=hash_short,
                author=author,
                authorEmail=author_email,
                date=date_str,
                timestamp=timestamp,
                message=subject + ('\n' + full_body if full_body else ''),
                subject=subject,
                body=full_body,
                parents=parents,
                refs=refs
            )
            commits.append(commit_info)
        
        # 獲取分支信息
        branches_result = subprocess.run(
            ["git", "branch", "-a"], 
            capture_output=True, text=True, cwd="."
        )
        
        branches = []
        current_branch = ""
        
        if branches_result.returncode == 0:
            for line in branches_result.stdout.split('\n'):
                line = line.strip()
                if line.startswith('*'):
                    current_branch = line[2:].strip()
                    branches.append(current_branch)
                elif line and not line.startswith('remotes/'):
                    branches.append(line)
        
        return GitHistoryResponse(
            graphPath=graph_path,
            totalCommits=len(commits),
            commits=commits,
            branches=branches,
            currentBranch=current_branch
        )
        
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Git command failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get git history: {str(e)}")


@router.get("/branches")
async def get_git_branches():
    """獲取 Git 分支列表"""
    import subprocess
    
    try:
        result = subprocess.run(
            ["git", "branch", "-a"], 
            capture_output=True, text=True, cwd="."
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="Failed to get branches")
        
        branches = []
        current_branch = ""
        
        for line in result.stdout.split('\n'):
            line = line.strip()
            if line.startswith('*'):
                current_branch = line[2:].strip()
                branches.append({"name": current_branch, "current": True})
            elif line and not line.startswith('remotes/'):
                branches.append({"name": line, "current": False})
        
        return {
            "currentBranch": current_branch,
            "branches": branches
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get branches: {str(e)}")
#!/usr/bin/env python
"""
簡單測試 Kernel 元件
"""

import asyncio
import sys
from pathlib import Path

# 將專案根目錄加入路徑
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ramen.engine.kernel import KernelManager, KernelConfig, KernelState
from ramen.core.models import RamenGraph, RamenNode, RamenEdge, Port, NodeMetadata, ExecutionMode, GraphMetadata, Position


def test_kernel_config():
    """測試 KernelConfig"""
    print("測試 KernelConfig...")
    
    config = KernelConfig(
        project_path=Path.cwd(),
        timeout=60.0,
        debug=True
    )
    
    assert config.project_path == Path.cwd()
    assert config.timeout == 60.0
    assert config.debug == True
    print("✓ KernelConfig 測試通過")


def test_kernel_manager_init():
    """測試 KernelManager 初始化"""
    print("\n測試 KernelManager 初始化...")
    
    config = KernelConfig(
        project_path=Path.cwd()
    )
    
    manager = KernelManager(config)
    
    assert manager.state == KernelState.IDLE
    assert manager.kernel_id is not None
    assert manager.process is None
    print(f"✓ KernelManager 初始化成功，ID: {manager.kernel_id}")


def test_graph_creation():
    """測試圖形建立"""
    print("\n測試圖形建立...")
    
    graph = RamenGraph(
        id="test-graph",
        metadata=GraphMetadata(
            name="Test Graph",
            description="測試用圖形",
            created_at="2025-08-28T00:00:00",
            last_modified="2025-08-28T00:00:00",
            version="1.0.0"
        ),
        nodes=[
            RamenNode(
                id="input",
                metadata=NodeMetadata(
                    type="variable",
                    name="Input Variable",
                    namespace="builtin"
                ),
                position=Position(x=0, y=0),
                inputs=[
                    Port(id="name", name="Name", type_id="str", is_input=True),
                    Port(id="value", name="Value", type_id="int", is_input=True)
                ],
                outputs=[
                    Port(id="output", name="Output", type_id="int", is_input=False)
                ],
                data={"name": "x", "value": 10}
            )
        ],
        edges=[],
        variables=[]
    )
    
    assert graph.id == "test-graph"
    assert len(graph.nodes) == 1
    assert graph.nodes[0].id == "input"
    print("✓ 圖形建立成功")


def test_execution_mode():
    """測試執行模式"""
    print("\n測試執行模式...")
    
    mode_jit = ExecutionMode.JIT
    mode_aot = ExecutionMode.AOT
    
    assert mode_jit.value == "jit"
    assert mode_aot.value == "aot"
    print("✓ ExecutionMode 測試通過")


def main():
    """主測試函數"""
    print("開始簡單 Kernel 測試...\n")
    
    try:
        # 執行基本測試
        test_kernel_config()
        test_kernel_manager_init()
        test_graph_creation()
        test_execution_mode()
        
        print("\n" + "="*50)
        print("✓ 所有簡單測試通過！")
        print("="*50)
        
    except Exception as e:
        print(f"\n✗ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
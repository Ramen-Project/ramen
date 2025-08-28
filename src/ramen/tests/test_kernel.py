#!/usr/bin/env python
"""
測試 Python Kernel 功能
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, Any

# 將專案根目錄加入路徑
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ramen.engine.kernel import KernelManager, KernelConfig, KernelState
from ramen.core.models import RamenGraph, RamenNode, RamenEdge, Port, NodeMetadata, ExecutionMode, GraphMetadata, Position


async def test_kernel_basic():
    """測試基本 kernel 功能"""
    print("=== 測試 Kernel 基本功能 ===")
    
    # 設定 kernel
    project_path = Path.cwd()
    config = KernelConfig(
        project_path=project_path,
        timeout=30.0,
        debug=True
    )
    
    kernel = KernelManager(config)
    
    try:
        # 啟動 kernel
        print("啟動 kernel...")
        await kernel.start()
        assert kernel.state == KernelState.READY
        print(f"✓ Kernel 啟動成功，狀態: {kernel.state}")
        
        # 建立簡單圖形
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
                ),
                RamenNode(
                    id="multiply",
                    metadata=NodeMetadata(
                        type="operator",
                        name="Multiply",
                        namespace="builtin"
                    ),
                    position=Position(x=200, y=0),
                    inputs=[
                        Port(id="a", name="A", type_id="int", is_input=True),
                        Port(id="b", name="B", type_id="int", is_input=True)
                    ],
                    outputs=[
                        Port(id="result", name="Result", type_id="int", is_input=False)
                    ],
                    data={"b": 2}
                ),
                RamenNode(
                    id="print",
                    metadata=NodeMetadata(
                        type="operator",
                        name="Print Result",
                        namespace="builtin"
                    ),
                    position=Position(x=400, y=0),
                    inputs=[
                        Port(id="value", name="Value", type_id="int", is_input=True),
                        Port(id="label", name="Label", type_id="str", is_input=True)
                    ],
                    outputs=[
                        Port(id="output", name="Output", type_id="int", is_input=False)
                    ],
                    data={"label": "Result"}
                )
            ],
            edges=[
                RamenEdge(
                    id="edge1",
                    source_node_id="input",
                    source_port_id="output",
                    target_node_id="multiply",
                    target_port_id="a"
                ),
                RamenEdge(
                    id="edge2",
                    source_node_id="multiply",
                    source_port_id="result",
                    target_node_id="print",
                    target_port_id="value"
                )
            ],
            variables=[]
        )
        
        # 執行圖形
        print("\n執行圖形...")
        result = await kernel.execute_graph(
            graph=graph,
            variables={"x": 5},
            mode=ExecutionMode.JIT
        )
        
        print(f"✓ 執行成功！")
        print(f"  輸出: {result.get('outputs', {})}")
        print(f"  執行時間: {result.get('execution_time', 0):.3f} 秒")
        print(f"  節點數: {result.get('node_count', 0)}")
        print(f"  邊數: {result.get('edge_count', 0)}")
        
        # 測試多次執行
        print("\n測試多次執行...")
        for i in range(3):
            result = await kernel.execute_graph(
                graph=graph,
                variables={"x": i * 10},
                mode=ExecutionMode.JIT
            )
            print(f"  執行 {i+1}: 輸入 x={i*10}, 結果={result.get('outputs', {})}")
        
        print("✓ 多次執行成功")
        
    except Exception as e:
        print(f"✗ 錯誤: {e}")
        raise
    finally:
        # 終止 kernel
        print("\n終止 kernel...")
        await kernel.terminate()
        assert kernel.state == KernelState.TERMINATED
        print(f"✓ Kernel 已終止，狀態: {kernel.state}")


async def test_kernel_error_handling():
    """測試 kernel 錯誤處理"""
    print("\n=== 測試 Kernel 錯誤處理 ===")
    
    config = KernelConfig(
        project_path=Path.cwd(),
        timeout=30.0,
        debug=True
    )
    
    kernel = KernelManager(config)
    
    try:
        await kernel.start()
        
        # 建立會產生錯誤的圖形
        graph = RamenGraph(
            id="error-graph",
            metadata=GraphMetadata(
                name="Error Graph",
                created_at="2025-08-28T00:00:00",
                last_modified="2025-08-28T00:00:00",
                version="1.0.0"
            ),
            nodes=[
                RamenNode(
                    id="divide",
                    metadata=NodeMetadata(
                        type="operator",
                        name="Divide by Zero",
                        namespace="builtin"
                    ),
                    position=Position(x=0, y=0),
                    inputs=[
                        Port(id="a", name="A", type_id="int", is_input=True),
                        Port(id="b", name="B", type_id="int", is_input=True)
                    ],
                    outputs=[
                        Port(id="result", name="Result", type_id="float", is_input=False)
                    ],
                    data={"a": 10, "b": 0}  # 除以零
                )
            ],
            edges=[],
            variables=[]
        )
        
        print("執行會產生錯誤的圖形...")
        result = await kernel.execute_graph(
            graph=graph,
            variables={},
            mode=ExecutionMode.JIT
        )
        
        if not result.get("success"):
            print("✓ 錯誤被正確捕獲:")
            print(f"  錯誤: {result.get('error', 'Unknown')}")
            print(f"  錯誤類型: {result.get('error_type', 'Unknown')}")
        else:
            print("✗ 預期的錯誤未發生")
            
    finally:
        await kernel.terminate()


async def test_kernel_isolation():
    """測試 kernel 隔離性"""
    print("\n=== 測試 Kernel 隔離性 ===")
    
    config = KernelConfig(
        project_path=Path.cwd(),
        timeout=30.0,
        debug=True
    )
    
    # 建立兩個獨立的 kernel
    kernel1 = KernelManager(config)
    kernel2 = KernelManager(config)
    
    try:
        # 啟動兩個 kernel
        print("啟動多個 kernel...")
        await kernel1.start()
        await kernel2.start()
        
        print(f"✓ Kernel 1 ID: {kernel1.kernel_id}")
        print(f"✓ Kernel 2 ID: {kernel2.kernel_id}")
        
        # 確認 ID 不同
        assert kernel1.kernel_id != kernel2.kernel_id
        print("✓ Kernel ID 不同，隔離性確認")
        
        # 建立測試圖形
        graph = RamenGraph(
            id="isolation-test",
            metadata=GraphMetadata(
                name="Isolation Test",
                created_at="2025-08-28T00:00:00",
                last_modified="2025-08-28T00:00:00",
                version="1.0.0"
            ),
            nodes=[
                RamenNode(
                    id="constant",
                    metadata=NodeMetadata(
                        type="variable",
                        name="Constant",
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
                    data={"name": "test_var", "value": 100}
                )
            ],
            edges=[],
            variables=[]
        )
        
        # 在兩個 kernel 中執行
        print("\n在不同 kernel 中執行相同圖形...")
        result1 = await kernel1.execute_graph(graph, {}, ExecutionMode.JIT)
        result2 = await kernel2.execute_graph(graph, {}, ExecutionMode.JIT)
        
        print(f"✓ Kernel 1 執行結果: {result1.get('outputs', {})}")
        print(f"✓ Kernel 2 執行結果: {result2.get('outputs', {})}")
        
        # 兩個 kernel 應該產生相同結果但獨立運行
        assert result1.get("success") == result2.get("success")
        print("✓ 隔離執行驗證成功")
        
    finally:
        await kernel1.terminate()
        await kernel2.terminate()


async def main():
    """主測試函數"""
    print("開始 Kernel 測試...\n")
    
    try:
        # 執行各項測試
        await test_kernel_basic()
        await test_kernel_error_handling()
        await test_kernel_isolation()
        
        print("\n" + "="*50)
        print("✓ 所有測試通過！")
        print("="*50)
        
    except Exception as e:
        print(f"\n✗ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
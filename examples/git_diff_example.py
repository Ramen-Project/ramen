#!/usr/bin/env python3
"""
Git 差異比較系統示例
展示如何使用語義化差異比較功能
"""

import sys
import os

# 添加 src 路徑
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from ramen.core.models import (
    RamenGraph, RamenNode, RamenEdge, GraphMetadata, 
    NodeMetadata, Position, Port
)
from ramen.git.diff import GraphDiffer, format_diff_summary


def create_sample_graph_v1():
    """建立範例圖形 v1"""
    metadata = GraphMetadata(
        name="Math Calculator",
        description="Basic mathematical operations",
        version="1.0.0"
    )
    
    # 建立節點
    add_node = RamenNode(
        id="add_1",
        metadata=NodeMetadata(
            type="operator",
            name="Add Numbers",
            namespace="math"
        ),
        position=Position(x=100, y=100),
        inputs=[
            Port(id="a", name="number_a", type_id="float", is_input=True),
            Port(id="b", name="number_b", type_id="float", is_input=True)
        ],
        outputs=[
            Port(id="result", name="sum", type_id="float", is_input=False)
        ]
    )
    
    multiply_node = RamenNode(
        id="mult_1",
        metadata=NodeMetadata(
            type="operator", 
            name="Multiply Numbers",
            namespace="math"
        ),
        position=Position(x=300, y=100),
        inputs=[
            Port(id="x", name="factor_x", type_id="float", is_input=True),
            Port(id="y", name="factor_y", type_id="float", is_input=True)
        ],
        outputs=[
            Port(id="product", name="result", type_id="float", is_input=False)
        ]
    )
    
    # 建立連接
    connection = RamenEdge(
        id="conn_1",
        source_node_id="add_1",
        source_port_id="result",
        target_node_id="mult_1", 
        target_port_id="x",
        label="sum to multiplier"
    )
    
    return RamenGraph(
        id="math_calc_v1",
        metadata=metadata,
        nodes=[add_node, multiply_node],
        edges=[connection]
    )


def create_sample_graph_v2():
    """建立範例圖形 v2 - 有多項變更"""
    metadata = GraphMetadata(
        name="Advanced Math Calculator",  # 名稱變更
        description="Extended mathematical operations with division",  # 描述變更
        version="2.0.0"  # 版本變更
    )
    
    # 修改現有節點
    add_node = RamenNode(
        id="add_1", 
        metadata=NodeMetadata(
            type="operator",
            name="Addition Operation",  # 名稱變更
            namespace="math"
        ),
        position=Position(x=50, y=150),  # 位置變更
        inputs=[
            Port(id="a", name="number_a", type_id="float", is_input=True),
            Port(id="b", name="number_b", type_id="float", is_input=True)
        ],
        outputs=[
            Port(id="result", name="sum", type_id="float", is_input=False)
        ]
    )
    
    # 保留 multiply 節點但移動位置  
    multiply_node = RamenNode(
        id="mult_1",
        metadata=NodeMetadata(
            type="operator",
            name="Multiply Numbers", 
            namespace="math"
        ),
        position=Position(x=250, y=150),  # 位置變更
        inputs=[
            Port(id="x", name="factor_x", type_id="float", is_input=True),
            Port(id="y", name="factor_y", type_id="float", is_input=True)
        ],
        outputs=[
            Port(id="product", name="result", type_id="float", is_input=False)
        ]
    )
    
    # 新增除法節點
    divide_node = RamenNode(
        id="div_1",
        metadata=NodeMetadata(
            type="operator",
            name="Divide Numbers",
            namespace="math"
        ),
        position=Position(x=450, y=150),
        inputs=[
            Port(id="dividend", name="dividend", type_id="float", is_input=True),
            Port(id="divisor", name="divisor", type_id="float", is_input=True)
        ],
        outputs=[
            Port(id="quotient", name="result", type_id="float", is_input=False)
        ]
    )
    
    # 更新連接
    connection1 = RamenEdge(
        id="conn_1",
        source_node_id="add_1", 
        source_port_id="result",
        target_node_id="mult_1",
        target_port_id="x",
        label="sum to multiplier"  # 標籤保持不變
    )
    
    # 新增連接
    connection2 = RamenEdge(
        id="conn_2", 
        source_node_id="mult_1",
        source_port_id="product",
        target_node_id="div_1",
        target_port_id="dividend",
        label="product to divider"
    )
    
    return RamenGraph(
        id="math_calc_v2",
        metadata=metadata,
        nodes=[add_node, multiply_node, divide_node],
        edges=[connection1, connection2]
    )


def main():
    """主程序"""
    print("🍜 Ramen Visual Programming - Git Diff Example")
    print("=" * 60)
    
    # 建立兩個版本的圖形
    graph_v1 = create_sample_graph_v1()
    graph_v2 = create_sample_graph_v2()
    
    print(f"Graph V1: {graph_v1.metadata.name}")
    print(f"  - Nodes: {len(graph_v1.nodes)}")
    print(f"  - Edges: {len(graph_v1.edges)}")
    print()
    
    print(f"Graph V2: {graph_v2.metadata.name}")
    print(f"  - Nodes: {len(graph_v2.nodes)}")
    print(f"  - Edges: {len(graph_v2.edges)}")
    print()
    
    # 執行差異比較
    differ = GraphDiffer()
    diff_result = differ.compare(graph_v1, graph_v2, "v1.0.0", "v2.0.0")
    
    print("🔍 Semantic Diff Analysis")
    print("=" * 60)
    print(format_diff_summary(diff_result))
    
    print("\n📊 Diff Statistics")
    print("=" * 60)
    print(f"Total changes detected: {diff_result.total_changes}")
    print(f"  • Nodes added: {len(diff_result.nodes_added)}")
    print(f"  • Nodes removed: {len(diff_result.nodes_removed)}")
    print(f"  • Nodes modified: {len(diff_result.nodes_modified)}")
    print(f"  • Nodes moved: {len(diff_result.nodes_moved)}")
    print(f"  • Edges added: {len(diff_result.edges_added)}")
    print(f"  • Edges removed: {len(diff_result.edges_removed)}")
    print(f"  • Metadata changes: {len(diff_result.metadata_changes)}")
    
    print("\n✨ This demonstrates semantic-level diff analysis")
    print("   that goes beyond simple text comparison!")


if __name__ == "__main__":
    main()
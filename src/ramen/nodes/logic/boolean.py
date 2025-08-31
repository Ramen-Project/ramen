"""Boolean logic operations."""

from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="logic",
    node_type="and",
    display_name="And",
    category="Logic/Boolean",
    description="Logical AND operation",
    icon="&",
    color="#9C27B0",
    inputs=[
        Port("a", PortType.BOOLEAN, required=True),
        Port("b", PortType.BOOLEAN, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def and_node(context: NodeContext) -> Any:
    """Logical AND operation."""
    a = context.get_input("a", False)
    b = context.get_input("b", False) 
    result = bool(a) and bool(b)
    context.set_output("result", result)
    return result


@node(
    namespace="logic", 
    node_type="or",
    display_name="Or",
    category="Logic/Boolean",
    description="Logical OR operation",
    icon="|",
    color="#9C27B0",
    inputs=[
        Port("a", PortType.BOOLEAN, required=True),
        Port("b", PortType.BOOLEAN, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def or_node(context: NodeContext) -> Any:
    """Logical OR operation."""
    a = context.get_input("a", False)
    b = context.get_input("b", False)
    result = bool(a) or bool(b)
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="not", 
    display_name="Not",
    category="Logic/Boolean",
    description="Logical NOT operation",
    icon="!",
    color="#9C27B0",
    inputs=[Port("value", PortType.BOOLEAN, required=True)],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def not_node(context: NodeContext) -> Any:
    """Logical NOT operation."""
    value = context.get_input("value", False)
    result = not bool(value)
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="xor",
    display_name="Xor", 
    category="Logic/Boolean",
    description="Logical XOR (exclusive or) operation",
    icon="⊕",
    color="#9C27B0",
    inputs=[
        Port("a", PortType.BOOLEAN, required=True),
        Port("b", PortType.BOOLEAN, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def xor_node(context: NodeContext) -> Any:
    """Logical XOR operation.""" 
    a = context.get_input("a", False)
    b = context.get_input("b", False)
    result = bool(a) ^ bool(b)
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="nand",
    display_name="Nand",
    category="Logic/Boolean",
    description="Logical NAND (not and) operation",
    icon="⊼",
    color="#9C27B0",
    inputs=[
        Port("a", PortType.BOOLEAN, required=True),
        Port("b", PortType.BOOLEAN, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def nand_node(context: NodeContext) -> Any:
    """Logical NAND operation."""
    a = context.get_input("a", False) 
    b = context.get_input("b", False)
    result = not (bool(a) and bool(b))
    context.set_output("result", result)
    return result


@node(
    namespace="logic",
    node_type="nor",
    display_name="Nor",
    category="Logic/Boolean", 
    description="Logical NOR (not or) operation",
    icon="⊽",
    color="#9C27B0",
    inputs=[
        Port("a", PortType.BOOLEAN, required=True),
        Port("b", PortType.BOOLEAN, required=True)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def nor_node(context: NodeContext) -> Any:
    """Logical NOR operation."""
    a = context.get_input("a", False)
    b = context.get_input("b", False)
    result = not (bool(a) or bool(b))
    context.set_output("result", result)
    return result
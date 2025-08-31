"""Basic string operations."""

from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="string",
    node_type="concat",
    display_name="Concatenate",
    category="String/Basic",
    description="Concatenate multiple strings",
    icon="🔗",
    color="#FF5722",
    inputs=[
        Port("a", PortType.STRING, required=True),
        Port("b", PortType.STRING, required=True),
        Port("separator", PortType.STRING, required=False)
    ],
    outputs=[Port("result", PortType.STRING)]
)
def concat_node(context: NodeContext) -> Any:
    """Concatenate strings with optional separator."""
    a = context.get_input("a", "")
    b = context.get_input("b", "")
    separator = context.get_input("separator", "")
    
    result = str(a) + separator + str(b)
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="length",
    display_name="Length",
    category="String/Basic",
    description="Get string length",
    icon="#",
    color="#FF5722",
    inputs=[Port("text", PortType.STRING, required=True)],
    outputs=[Port("length", PortType.NUMBER)]
)
def length_node(context: NodeContext) -> Any:
    """Get string length."""
    text = context.get_input("text", "")
    length = len(str(text))
    context.set_output("length", length)
    return length


@node(
    namespace="string",
    node_type="slice",
    display_name="Slice",
    category="String/Basic",
    description="Extract substring by start and end indices",
    icon="✂️",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("start", PortType.NUMBER, required=True),
        Port("end", PortType.NUMBER, required=False)
    ],
    outputs=[Port("result", PortType.STRING)]
)
def slice_node(context: NodeContext) -> Any:
    """Extract substring."""
    text = str(context.get_input("text", ""))
    start = int(context.get_input("start", 0))
    end = context.get_input("end")
    
    if end is not None:
        end = int(end)
        result = text[start:end]
    else:
        result = text[start:]
    
    context.set_output("result", result)
    return result


@node(
    namespace="string", 
    node_type="repeat",
    display_name="Repeat",
    category="String/Basic",
    description="Repeat string n times",
    icon="🔄",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("count", PortType.NUMBER, required=True)
    ],
    outputs=[Port("result", PortType.STRING)]
)
def repeat_node(context: NodeContext) -> Any:
    """Repeat string n times."""
    text = str(context.get_input("text", ""))
    count = int(context.get_input("count", 1))
    
    result = text * max(0, count)
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="reverse",
    display_name="Reverse", 
    category="String/Basic",
    description="Reverse string order",
    icon="↔️",
    color="#FF5722",
    inputs=[Port("text", PortType.STRING, required=True)],
    outputs=[Port("result", PortType.STRING)]
)
def reverse_node(context: NodeContext) -> Any:
    """Reverse string order."""
    text = str(context.get_input("text", ""))
    result = text[::-1]
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="trim",
    display_name="Trim",
    category="String/Basic",
    description="Remove whitespace from start and end",
    icon="📐",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("chars", PortType.STRING, required=False)
    ],
    outputs=[Port("result", PortType.STRING)]
)
def trim_node(context: NodeContext) -> Any:
    """Remove whitespace or specified characters from both ends."""
    text = str(context.get_input("text", ""))
    chars = context.get_input("chars")
    
    if chars:
        result = text.strip(chars)
    else:
        result = text.strip()
    
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="pad",
    display_name="Pad",
    category="String/Basic",
    description="Pad string to specified width",
    icon="📏",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("width", PortType.NUMBER, required=True),
        Port("fill_char", PortType.STRING, required=False),
        Port("direction", PortType.STRING, required=False)
    ],
    outputs=[Port("result", PortType.STRING)]
)
def pad_node(context: NodeContext) -> Any:
    """Pad string to specified width."""
    text = str(context.get_input("text", ""))
    width = int(context.get_input("width", len(text)))
    fill_char = context.get_input("fill_char", " ")
    direction = context.get_input("direction", "left")
    
    if len(fill_char) == 0:
        fill_char = " "
    
    if direction == "right":
        result = text.ljust(width, fill_char[0])
    elif direction == "center":
        result = text.center(width, fill_char[0])
    else:  # left (default)
        result = text.rjust(width, fill_char[0])
    
    context.set_output("result", result)
    return result
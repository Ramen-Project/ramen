"""String transformation operations."""

import re
from typing import Any
from ramen.nodes.base import node, NodeContext, Port, PortType


@node(
    namespace="string",
    node_type="upper",
    display_name="Upper Case",
    category="String/Transform",
    description="Convert string to uppercase",
    icon="🔠",
    color="#FF5722",
    inputs=[Port("text", PortType.STRING, required=True)],
    outputs=[Port("result", PortType.STRING)]
)
def upper_node(context: NodeContext) -> Any:
    """Convert string to uppercase."""
    text = str(context.get_input("text", ""))
    result = text.upper()
    context.set_output("result", result)
    return result


@node(
    namespace="string", 
    node_type="lower",
    display_name="Lower Case",
    category="String/Transform",
    description="Convert string to lowercase",
    icon="🔡",
    color="#FF5722",
    inputs=[Port("text", PortType.STRING, required=True)],
    outputs=[Port("result", PortType.STRING)]
)
def lower_node(context: NodeContext) -> Any:
    """Convert string to lowercase."""
    text = str(context.get_input("text", ""))
    result = text.lower()
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="title",
    display_name="Title Case",
    category="String/Transform",
    description="Convert string to title case",
    icon="📰",
    color="#FF5722",
    inputs=[Port("text", PortType.STRING, required=True)],
    outputs=[Port("result", PortType.STRING)]
)
def title_node(context: NodeContext) -> Any:
    """Convert string to title case."""
    text = str(context.get_input("text", ""))
    result = text.title()
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="capitalize",
    display_name="Capitalize",
    category="String/Transform",
    description="Capitalize first character of string",
    icon="🆙",
    color="#FF5722",
    inputs=[Port("text", PortType.STRING, required=True)],
    outputs=[Port("result", PortType.STRING)]
)
def capitalize_node(context: NodeContext) -> Any:
    """Capitalize first character."""
    text = str(context.get_input("text", ""))
    result = text.capitalize()
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="replace",
    display_name="Replace",
    category="String/Transform",
    description="Replace occurrences of substring",
    icon="🔄",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("old", PortType.STRING, required=True),
        Port("new", PortType.STRING, required=True),
        Port("count", PortType.NUMBER, required=False)
    ],
    outputs=[Port("result", PortType.STRING)]
)
def replace_node(context: NodeContext) -> Any:
    """Replace occurrences of substring."""
    text = str(context.get_input("text", ""))
    old = str(context.get_input("old", ""))
    new = str(context.get_input("new", ""))
    count = context.get_input("count")
    
    if count is not None:
        count = int(count)
        result = text.replace(old, new, count)
    else:
        result = text.replace(old, new)
    
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="regex_replace",
    display_name="Regex Replace",
    category="String/Transform",
    description="Replace using regular expressions",
    icon="🎭",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("pattern", PortType.STRING, required=True),
        Port("replacement", PortType.STRING, required=True),
        Port("flags", PortType.STRING, required=False),
        Port("count", PortType.NUMBER, required=False)
    ],
    outputs=[Port("result", PortType.STRING)]
)
def regex_replace_node(context: NodeContext) -> Any:
    """Replace using regular expressions."""
    text = str(context.get_input("text", ""))
    pattern = str(context.get_input("pattern", ""))
    replacement = str(context.get_input("replacement", ""))
    flags_str = context.get_input("flags", "")
    count = context.get_input("count", 0)
    
    # Parse regex flags
    flags = 0
    if flags_str:
        flag_map = {
            'i': re.IGNORECASE,
            'm': re.MULTILINE,
            's': re.DOTALL,
            'x': re.VERBOSE
        }
        for flag_char in flags_str.lower():
            if flag_char in flag_map:
                flags |= flag_map[flag_char]
    
    try:
        if count and count > 0:
            result = re.sub(pattern, replacement, text, count=int(count), flags=flags)
        else:
            result = re.sub(pattern, replacement, text, flags=flags)
    except re.error as e:
        result = f"Regex error: {str(e)}"
    
    context.set_output("result", result)
    return result
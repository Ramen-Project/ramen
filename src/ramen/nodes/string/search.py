"""String search operations."""

import re
from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="string",
    node_type="contains",
    display_name="Contains",
    category="String/Search",
    description="Check if string contains substring",
    icon="🔍",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("substring", PortType.STRING, required=True),
        Port("case_sensitive", PortType.BOOLEAN, required=False)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def contains_node(context: NodeContext) -> Any:
    """Check if string contains substring."""
    text = str(context.get_input("text", ""))
    substring = str(context.get_input("substring", ""))
    case_sensitive = context.get_input("case_sensitive", True)
    
    if not case_sensitive:
        text = text.lower()
        substring = substring.lower()
    
    result = substring in text
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="starts_with",
    display_name="Starts With",
    category="String/Search",
    description="Check if string starts with prefix",
    icon="⬅️",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("prefix", PortType.STRING, required=True),
        Port("case_sensitive", PortType.BOOLEAN, required=False)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def starts_with_node(context: NodeContext) -> Any:
    """Check if string starts with prefix."""
    text = str(context.get_input("text", ""))
    prefix = str(context.get_input("prefix", ""))
    case_sensitive = context.get_input("case_sensitive", True)
    
    if not case_sensitive:
        text = text.lower()
        prefix = prefix.lower()
    
    result = text.startswith(prefix)
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="ends_with",
    display_name="Ends With",
    category="String/Search", 
    description="Check if string ends with suffix",
    icon="➡️",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("suffix", PortType.STRING, required=True),
        Port("case_sensitive", PortType.BOOLEAN, required=False)
    ],
    outputs=[Port("result", PortType.BOOLEAN)]
)
def ends_with_node(context: NodeContext) -> Any:
    """Check if string ends with suffix."""
    text = str(context.get_input("text", ""))
    suffix = str(context.get_input("suffix", ""))
    case_sensitive = context.get_input("case_sensitive", True)
    
    if not case_sensitive:
        text = text.lower()
        suffix = suffix.lower()
    
    result = text.endswith(suffix)
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="find",
    display_name="Find",
    category="String/Search",
    description="Find position of substring",
    icon="🎯",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("substring", PortType.STRING, required=True),
        Port("start", PortType.NUMBER, required=False),
        Port("case_sensitive", PortType.BOOLEAN, required=False)
    ],
    outputs=[Port("position", PortType.NUMBER)]
)
def find_node(context: NodeContext) -> Any:
    """Find position of substring (-1 if not found)."""
    text = str(context.get_input("text", ""))
    substring = str(context.get_input("substring", ""))
    start = context.get_input("start", 0)
    case_sensitive = context.get_input("case_sensitive", True)
    
    if not case_sensitive:
        text = text.lower()
        substring = substring.lower()
    
    if start:
        position = text.find(substring, int(start))
    else:
        position = text.find(substring)
    
    context.set_output("position", position)
    return position


@node(
    namespace="string",
    node_type="count",
    display_name="Count",
    category="String/Search",
    description="Count occurrences of substring",
    icon="🔢",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("substring", PortType.STRING, required=True),
        Port("case_sensitive", PortType.BOOLEAN, required=False)
    ],
    outputs=[Port("count", PortType.NUMBER)]
)
def count_node(context: NodeContext) -> Any:
    """Count occurrences of substring."""
    text = str(context.get_input("text", ""))
    substring = str(context.get_input("substring", ""))
    case_sensitive = context.get_input("case_sensitive", True)
    
    if not case_sensitive:
        text = text.lower()
        substring = substring.lower()
    
    count = text.count(substring)
    context.set_output("count", count)
    return count


@node(
    namespace="string",
    node_type="match",
    display_name="Match Regex",
    category="String/Search",
    description="Test if string matches regular expression",
    icon="🎭",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("pattern", PortType.STRING, required=True),
        Port("flags", PortType.STRING, required=False)
    ],
    outputs=[
        Port("matches", PortType.BOOLEAN),
        Port("groups", PortType.ARRAY)
    ]
)
def match_node(context: NodeContext) -> Any:
    """Test if string matches regular expression pattern."""
    text = str(context.get_input("text", ""))
    pattern = str(context.get_input("pattern", ""))
    flags_str = context.get_input("flags", "")
    
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
        match = re.search(pattern, text, flags)
        if match:
            matches = True
            groups = list(match.groups()) if match.groups() else [match.group(0)]
        else:
            matches = False
            groups = []
    except re.error:
        matches = False
        groups = []
    
    context.set_output("matches", matches)
    context.set_output("groups", groups)
    return matches
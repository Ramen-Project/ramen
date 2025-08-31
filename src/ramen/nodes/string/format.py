"""String formatting operations."""

from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="string",
    node_type="format",
    display_name="Format",
    category="String/Format",
    description="Format string with values",
    icon="📝",
    color="#FF5722",
    inputs=[
        Port("template", PortType.STRING, required=True),
        Port("values", PortType.OBJECT, required=True)
    ],
    outputs=[Port("result", PortType.STRING)]
)
def format_node(context: NodeContext) -> Any:
    """Format string using Python format syntax."""
    template = str(context.get_input("template", ""))
    values = context.get_input("values", {})
    
    try:
        if isinstance(values, dict):
            result = template.format(**values)
        elif isinstance(values, (list, tuple)):
            result = template.format(*values)
        else:
            result = template.format(values)
    except (KeyError, IndexError, ValueError) as e:
        result = f"Format error: {str(e)}"
    
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="template",
    display_name="Template",
    category="String/Format",
    description="Simple template substitution with ${var} syntax",
    icon="🎨",
    color="#FF5722",
    inputs=[
        Port("template", PortType.STRING, required=True),
        Port("variables", PortType.OBJECT, required=True)
    ],
    outputs=[Port("result", PortType.STRING)]
)
def template_node(context: NodeContext) -> Any:
    """Simple template substitution using ${var} syntax."""
    template = str(context.get_input("template", ""))
    variables = context.get_input("variables", {})
    
    if not isinstance(variables, dict):
        variables = {}
    
    result = template
    for key, value in variables.items():
        placeholder = f"${{{key}}}"
        result = result.replace(placeholder, str(value))
    
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="join",
    display_name="Join",
    category="String/Format",
    description="Join array elements into string",
    icon="🔗",
    color="#FF5722",
    inputs=[
        Port("array", PortType.ARRAY, required=True),
        Port("separator", PortType.STRING, required=False)
    ],
    outputs=[Port("result", PortType.STRING)]
)
def join_node(context: NodeContext) -> Any:
    """Join array elements with separator."""
    array = context.get_input("array", [])
    separator = context.get_input("separator", ",")
    
    if not isinstance(array, (list, tuple)):
        array = [array]
    
    result = separator.join(str(item) for item in array)
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="split",
    display_name="Split",
    category="String/Format",
    description="Split string into array",
    icon="✂️",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("separator", PortType.STRING, required=False),
        Port("max_splits", PortType.NUMBER, required=False)
    ],
    outputs=[Port("result", PortType.ARRAY)]
)
def split_node(context: NodeContext) -> Any:
    """Split string by separator."""
    text = str(context.get_input("text", ""))
    separator = context.get_input("separator")
    max_splits = context.get_input("max_splits")
    
    if max_splits is not None:
        max_splits = int(max_splits)
        if separator is None:
            result = text.split(None, max_splits)
        else:
            result = text.split(separator, max_splits)
    else:
        if separator is None:
            result = text.split()
        else:
            result = text.split(separator)
    
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="lines",
    display_name="Lines",
    category="String/Format",
    description="Split text into lines",
    icon="📄",
    color="#FF5722",
    inputs=[
        Port("text", PortType.STRING, required=True),
        Port("keep_ends", PortType.BOOLEAN, required=False)
    ],
    outputs=[Port("result", PortType.ARRAY)]
)
def lines_node(context: NodeContext) -> Any:
    """Split text into lines."""
    text = str(context.get_input("text", ""))
    keep_ends = context.get_input("keep_ends", False)
    
    if keep_ends:
        result = text.splitlines(True)
    else:
        result = text.splitlines()
    
    context.set_output("result", result)
    return result


@node(
    namespace="string",
    node_type="words",
    display_name="Words",
    category="String/Format",
    description="Split text into words",
    icon="📝",
    color="#FF5722",
    inputs=[Port("text", PortType.STRING, required=True)],
    outputs=[Port("result", PortType.ARRAY)]
)
def words_node(context: NodeContext) -> Any:
    """Split text into words (whitespace-separated)."""
    text = str(context.get_input("text", ""))
    result = text.split()
    context.set_output("result", result)
    return result
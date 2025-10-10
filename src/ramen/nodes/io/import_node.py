"""Import node - Receive input from parent graph.

This node allows a graph to define its input interface. When a graph contains
Import nodes, it can be automatically used as a subgraph/function in other graphs.
"""

from typing import Any
from ramen.nodes.base import node, NodeContext, Port, PortType


@node(
    namespace="graph",
    node_type="import",
    display_name="Import",
    category="Graph",
    description="Import a value from the parent graph (defines an input parameter)",
    icon="📥",
    color="#2196F3",
    inputs=[],  # No input ports - this is an entry point
    outputs=[
        Port("value", PortType.ANY, description="Imported value")
    ],
    properties={
        "import_name": {
            "type": "string",
            "default": "input",
            "description": "Name of the import (parameter name)"
        },
        "default_value": {
            "type": "any",
            "default": None,
            "description": "Default value if not provided by parent"
        },
        "required": {
            "type": "boolean",
            "default": True,
            "description": "Whether this import is required"
        },
        "description": {
            "type": "string",
            "default": "",
            "description": "Description of this import"
        }
    }
)
def import_node(context: NodeContext) -> Any:
    """
    Import a value from the parent graph.

    The imported value will be retrieved from the execution context's inputs
    dictionary, which is populated by the parent graph when executing this
    graph as a subgraph.

    Args:
        context: Node execution context containing:
            - import_name (property): Name of the import
            - default_value (property): Default value if not provided
            - required (property): Whether this import is required

    Returns:
        The imported value

    Raises:
        ValueError: If the import is required but not provided
    """
    import_name = context.get_property("import_name", "input")
    default_value = context.get_property("default_value", None)
    required = context.get_property("required", True)

    # Get value from execution context inputs
    exec_context = context.metadata.get("exec_context")
    value = None

    if exec_context and hasattr(exec_context, "inputs"):
        value = exec_context.inputs.get(import_name)
        if value is not None:
            print(f"📥 Imported '{import_name}': {type(value).__name__}")
        else:
            value = default_value
            if value is not None:
                print(f"📥 Import '{import_name}' using default value")
    else:
        value = default_value
        if exec_context:
            print(f"⚠️  Warning: No inputs found in execution context, using default for '{import_name}'")

    # Check if required value is missing
    if required and value is None:
        raise ValueError(
            f"Required import '{import_name}' not provided by parent graph"
        )

    context.set_output("value", value)
    return value

"""Pipeline operations for functional composition."""

from typing import Any
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="flow",
    node_type="pipe",
    display_name="Pipe",
    category="Flow/Pipeline",
    description="Pass value through a series of transformations",
    icon="🔧",
    color="#00BCD4",
    inputs=[
        Port("input", PortType.ANY, required=True),
        Port("functions", PortType.ARRAY, required=True)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def pipe_node(context: NodeContext) -> Any:
    """Pass value through a series of transformations."""
    input_value = context.get_input("input")
    functions = context.get_input("functions", [])
    
    result = input_value
    for i, func in enumerate(functions):
        try:
            if callable(func):
                result = func(result)
            elif isinstance(func, str):
                # Try to execute as subgraph
                try:
                    result = context.execute_subgraph(func, {"input": result})
                except NotImplementedError:
                    # Fallback to eval (unsafe, but for demo)
                    result = eval(func.replace("input", str(result)))
            else:
                # Skip non-callable items
                continue
        except Exception as e:
            result = f"Pipeline error at step {i}: {str(e)}"
            break
    
    context.set_output("result", result)
    return result


@node(
    namespace="flow",
    node_type="compose",
    display_name="Compose",
    category="Flow/Pipeline",
    description="Compose functions right-to-left",
    icon="🔄",
    color="#00BCD4",
    inputs=[
        Port("functions", PortType.ARRAY, required=True),
        Port("input", PortType.ANY, required=True)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def compose_node(context: NodeContext) -> Any:
    """Compose functions right-to-left."""
    functions = context.get_input("functions", [])
    input_value = context.get_input("input")
    
    # Apply functions in reverse order (right-to-left)
    result = input_value
    for func in reversed(functions):
        try:
            if callable(func):
                result = func(result)
            elif isinstance(func, str):
                try:
                    result = context.execute_subgraph(func, {"input": result})
                except NotImplementedError:
                    result = eval(func.replace("input", str(result)))
        except Exception as e:
            result = f"Compose error: {str(e)}"
            break
    
    context.set_output("result", result)
    return result


@node(
    namespace="flow",
    node_type="identity",
    display_name="Identity",
    category="Flow/Pipeline",
    description="Pass value through unchanged",
    icon="↔️",
    color="#00BCD4",
    inputs=[Port("value", PortType.ANY, required=True)],
    outputs=[Port("result", PortType.ANY)]
)
def identity_node(context: NodeContext) -> Any:
    """Pass value through unchanged."""
    value = context.get_input("value")
    context.set_output("result", value)
    return value


@node(
    namespace="flow",
    node_type="tap",
    display_name="Tap",
    category="Flow/Pipeline",
    description="Execute side effect and pass value through",
    icon="👁️",
    color="#00BCD4",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("side_effect", PortType.FUNCTION, required=True)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def tap_node(context: NodeContext) -> Any:
    """Execute side effect and pass value through."""
    value = context.get_input("value")
    side_effect = context.get_input("side_effect")
    
    # Execute side effect
    try:
        if callable(side_effect):
            side_effect(value)
        elif isinstance(side_effect, str):
            try:
                context.execute_subgraph(side_effect, {"input": value})
            except NotImplementedError:
                eval(side_effect.replace("input", str(value)))
    except Exception:
        # Ignore side effect errors
        pass
    
    # Pass through original value
    context.set_output("result", value)
    return value


@node(
    namespace="flow",
    node_type="branch",
    display_name="Branch",
    category="Flow/Pipeline",
    description="Split value to multiple processing paths",
    icon="🌿",
    color="#00BCD4",
    inputs=[
        Port("value", PortType.ANY, required=True),
        Port("branches", PortType.ARRAY, required=True)
    ],
    outputs=[Port("results", PortType.ARRAY)]
)
def branch_node(context: NodeContext) -> Any:
    """Split value to multiple processing paths."""
    value = context.get_input("value")
    branches = context.get_input("branches", [])
    
    results = []
    for branch in branches:
        try:
            if callable(branch):
                result = branch(value)
            elif isinstance(branch, str):
                try:
                    result = context.execute_subgraph(branch, {"input": value})
                except NotImplementedError:
                    result = eval(branch.replace("input", str(value)))
            else:
                result = value  # Pass through if not processable
            results.append(result)
        except Exception as e:
            results.append(f"Branch error: {str(e)}")
    
    context.set_output("results", results)
    return results


@node(
    namespace="flow",
    node_type="merge",
    display_name="Merge",
    category="Flow/Pipeline",
    description="Merge multiple values using a combiner function",
    icon="🔀",
    color="#00BCD4",
    inputs=[
        Port("values", PortType.ARRAY, required=True),
        Port("combiner", PortType.FUNCTION, required=True)
    ],
    outputs=[Port("result", PortType.ANY)]
)
def merge_node(context: NodeContext) -> Any:
    """Merge multiple values using a combiner function."""
    values = context.get_input("values", [])
    combiner = context.get_input("combiner")
    
    try:
        if callable(combiner):
            result = combiner(values)
        elif isinstance(combiner, str):
            try:
                result = context.execute_subgraph(combiner, {"input": values})
            except NotImplementedError:
                result = eval(combiner.replace("input", str(values)))
        else:
            # Default merge: just return the array
            result = values
    except Exception as e:
        result = f"Merge error: {str(e)}"
    
    context.set_output("result", result)
    return result
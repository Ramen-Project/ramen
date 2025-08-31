"""Debug validation and testing tools."""

from typing import Any, Callable
from ..base import node, NodeContext, Port, PortType


@node(
    namespace="debug",
    node_type="expect",
    display_name="Expect",
    category="Debug/Validate",
    description="Expect value to match condition",
    icon="🎯",
    color="#F44336",
    inputs=[
        Port("actual", PortType.ANY, required=True),
        Port("expected", PortType.ANY, required=True),
        Port("comparison", PortType.STRING, required=False),
        Port("message", PortType.STRING, required=False)
    ],
    outputs=[
        Port("actual", PortType.ANY),
        Port("passed", PortType.BOOLEAN),
        Port("message", PortType.STRING)
    ]
)
def expect_node(context: NodeContext) -> Any:
    """Expect value to match condition."""
    actual = context.get_input("actual")
    expected = context.get_input("expected")
    comparison = context.get_input("comparison", "equal")
    message = context.get_input("message", f"Expected {expected}, got {actual}")
    
    comparisons = {
        "equal": lambda a, e: a == e,
        "not_equal": lambda a, e: a != e,
        "greater": lambda a, e: a > e,
        "less": lambda a, e: a < e,
        "greater_equal": lambda a, e: a >= e,
        "less_equal": lambda a, e: a <= e,
        "contains": lambda a, e: e in a,
        "not_contains": lambda a, e: e not in a,
        "type": lambda a, e: type(a).__name__ == str(e),
        "truthy": lambda a, e: bool(a) == bool(e),
        "length": lambda a, e: len(a) == e if hasattr(a, "__len__") else False
    }
    
    comparison_func = comparisons.get(comparison, comparisons["equal"])
    
    try:
        passed = comparison_func(actual, expected)
    except Exception:
        passed = False
    
    if not passed:
        print(f"[EXPECT FAILED] {message}")
    
    context.set_output("actual", actual)
    context.set_output("passed", passed)
    context.set_output("message", message if not passed else "Expectation passed")
    return actual


@node(
    namespace="debug",
    node_type="test",
    display_name="Test",
    category="Debug/Validate",
    description="Run test case with operation and assertions",
    icon="🧪",
    color="#F44336",
    inputs=[
        Port("operation", PortType.FUNCTION, required=True),
        Port("input", PortType.ANY, required=True),
        Port("expected", PortType.ANY, required=True),
        Port("test_name", PortType.STRING, required=False)
    ],
    outputs=[
        Port("result", PortType.ANY),
        Port("passed", PortType.BOOLEAN),
        Port("test_report", PortType.OBJECT)
    ]
)
def test_node(context: NodeContext) -> Any:
    """Run test case with operation and assertions."""
    operation = context.get_input("operation")
    input_value = context.get_input("input")
    expected = context.get_input("expected")
    test_name = context.get_input("test_name", "Test case")
    
    import time
    start_time = time.time()
    
    try:
        if callable(operation):
            result = operation(input_value)
        elif isinstance(operation, str):
            try:
                result = context.execute_subgraph(operation, {"input": input_value})
            except NotImplementedError:
                result = eval(operation.replace("input", str(input_value)))
        else:
            result = input_value
        
        passed = result == expected
        error = None
    except Exception as e:
        result = None
        passed = False
        error = str(e)
    
    end_time = time.time()
    
    test_report = {
        "test_name": test_name,
        "passed": passed,
        "input": input_value,
        "expected": expected,
        "actual": result,
        "error": error,
        "execution_time": end_time - start_time,
        "timestamp": start_time
    }
    
    status = "PASSED" if passed else "FAILED"
    print(f"[TEST {status}] {test_name}: Expected {expected}, Got {result}")
    if error:
        print(f"  Error: {error}")
    
    context.set_output("result", result)
    context.set_output("passed", passed)
    context.set_output("test_report", test_report)
    return result


@node(
    namespace="debug",
    node_type="mock",
    display_name="Mock",
    category="Debug/Validate",
    description="Create a mock function that returns specified value",
    icon="🎭",
    color="#F44336",
    inputs=[
        Port("return_value", PortType.ANY, required=True),
        Port("name", PortType.STRING, required=False)
    ],
    outputs=[Port("mock_function", PortType.FUNCTION)]
)
def mock_node(context: NodeContext) -> Any:
    """Create a mock function that returns specified value."""
    return_value = context.get_input("return_value")
    name = context.get_input("name", "mock")
    
    def mock_function(*args, **kwargs):
        print(f"[MOCK] {name} called with args={args}, kwargs={kwargs}")
        return return_value
    
    mock_function.__name__ = name
    context.set_output("mock_function", mock_function)
    return mock_function


@node(
    namespace="debug",
    node_type="stub",
    display_name="Stub",
    category="Debug/Validate",
    description="Create a stub that records calls and returns values",
    icon="📝",
    color="#F44336",
    inputs=[
        Port("return_values", PortType.ARRAY, required=True),
        Port("name", PortType.STRING, required=False)
    ],
    outputs=[
        Port("stub_function", PortType.FUNCTION),
        Port("call_log", PortType.ARRAY)
    ]
)
def stub_node(context: NodeContext) -> Any:
    """Create a stub that records calls and returns values."""
    return_values = context.get_input("return_values", [])
    name = context.get_input("name", "stub")
    
    call_log = []
    call_count = [0]  # Use list to allow modification in nested function
    
    def stub_function(*args, **kwargs):
        call_info = {
            "call_number": call_count[0],
            "args": args,
            "kwargs": kwargs,
            "timestamp": __import__("time").time()
        }
        call_log.append(call_info)
        
        if call_count[0] < len(return_values):
            return_value = return_values[call_count[0]]
        else:
            return_value = return_values[-1] if return_values else None
        
        print(f"[STUB] {name} call #{call_count[0]} -> {return_value}")
        call_count[0] += 1
        
        return return_value
    
    stub_function.__name__ = name
    context.set_output("stub_function", stub_function)
    context.set_output("call_log", call_log)
    return stub_function
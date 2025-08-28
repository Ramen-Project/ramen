"""
Example of creating a custom topping with custom nodes.

This example shows how to:
1. Create custom node types with specific functionality
2. Define input/output ports with types
3. Register nodes in a topping
4. Use the topping in your graphs
"""

from typing import Any
from ramen.topping import (
    ToppingBase,
    NodeFunction,
    NodeMetadata,
    NodeContext,
    PortDefinition,
    PortType
)


# Custom Node 1: String Formatter
class StringFormatterNode(NodeFunction):
    """Format strings with template variables."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="custom",
            node_type="string_formatter",
            display_name="String Formatter",
            category="Custom/Text",
            description="Format strings using template variables",
            icon="📝",
            color="#4CAF50",
            inputs=[
                PortDefinition(
                    name="template",
                    port_type=PortType.STRING,
                    description="Template string with {variables}"
                ),
                PortDefinition(
                    name="variables",
                    port_type=PortType.OBJECT,
                    description="Variables to substitute"
                )
            ],
            outputs=[
                PortDefinition(
                    name="formatted",
                    port_type=PortType.STRING,
                    description="Formatted string"
                )
            ]
        )
    
    def execute(self, context: NodeContext) -> str:
        template = context.get_input("template", "")
        variables = context.get_input("variables", {})
        
        try:
            formatted = template.format(**variables)
        except KeyError as e:
            formatted = f"Error: Missing variable {e}"
        except Exception as e:
            formatted = f"Error: {str(e)}"
        
        context.set_output("formatted", formatted)
        return formatted


# Custom Node 2: JSON Parser
class JSONParserNode(NodeFunction):
    """Parse JSON strings to objects."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="custom",
            node_type="json_parser",
            display_name="JSON Parser",
            category="Custom/Data",
            description="Parse JSON strings to Python objects",
            icon="🔄",
            color="#2196F3",
            inputs=[
                PortDefinition(
                    name="json_string",
                    port_type=PortType.STRING,
                    description="JSON string to parse"
                )
            ],
            outputs=[
                PortDefinition(
                    name="object",
                    port_type=PortType.OBJECT,
                    description="Parsed object"
                ),
                PortDefinition(
                    name="error",
                    port_type=PortType.STRING,
                    required=False,
                    description="Error message if parsing fails"
                )
            ]
        )
    
    def execute(self, context: NodeContext) -> Any:
        import json
        
        json_string = context.get_input("json_string", "{}")
        
        try:
            obj = json.loads(json_string)
            context.set_output("object", obj)
            context.set_output("error", None)
            return obj
        except json.JSONDecodeError as e:
            error_msg = f"JSON decode error at line {e.lineno}, column {e.colno}: {e.msg}"
            context.set_output("object", None)
            context.set_output("error", error_msg)
            return None


# Custom Node 3: HTTP Request
class HTTPRequestNode(NodeFunction):
    """Make HTTP requests."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="custom",
            node_type="http_request",
            display_name="HTTP Request",
            category="Custom/Network",
            description="Make HTTP requests to APIs",
            icon="🌐",
            color="#FF9800",
            inputs=[
                PortDefinition(
                    name="url",
                    port_type=PortType.STRING,
                    description="URL to request"
                ),
                PortDefinition(
                    name="method",
                    port_type=PortType.STRING,
                    default="GET",
                    description="HTTP method (GET, POST, PUT, DELETE)"
                ),
                PortDefinition(
                    name="headers",
                    port_type=PortType.OBJECT,
                    required=False,
                    default={},
                    description="Request headers"
                ),
                PortDefinition(
                    name="body",
                    port_type=PortType.OBJECT,
                    required=False,
                    description="Request body (for POST/PUT)"
                ),
                PortDefinition(
                    name="timeout",
                    port_type=PortType.NUMBER,
                    default=30,
                    required=False,
                    description="Request timeout in seconds"
                )
            ],
            outputs=[
                PortDefinition(
                    name="response",
                    port_type=PortType.OBJECT,
                    description="Response object"
                ),
                PortDefinition(
                    name="status_code",
                    port_type=PortType.NUMBER,
                    description="HTTP status code"
                ),
                PortDefinition(
                    name="error",
                    port_type=PortType.STRING,
                    required=False,
                    description="Error message if request fails"
                )
            ]
        )
    
    def execute(self, context: NodeContext) -> Any:
        import requests
        
        url = context.get_input("url", "")
        method = context.get_input("method", "GET").upper()
        headers = context.get_input("headers", {})
        body = context.get_input("body")
        timeout = context.get_input("timeout", 30)
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == "POST":
                response = requests.post(url, json=body, headers=headers, timeout=timeout)
            elif method == "PUT":
                response = requests.put(url, json=body, headers=headers, timeout=timeout)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            # Try to parse JSON response
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            context.set_output("response", response_data)
            context.set_output("status_code", response.status_code)
            context.set_output("error", None)
            
            return response_data
            
        except requests.RequestException as e:
            error_msg = f"Request failed: {str(e)}"
            context.set_output("response", None)
            context.set_output("status_code", 0)
            context.set_output("error", error_msg)
            return None
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            context.set_output("response", None)
            context.set_output("status_code", 0)
            context.set_output("error", error_msg)
            return None


# Custom Node 4: Data Filter
class DataFilterNode(NodeFunction):
    """Filter data based on conditions."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="custom",
            node_type="data_filter",
            display_name="Data Filter",
            category="Custom/Data",
            description="Filter arrays or objects based on conditions",
            icon="🔍",
            color="#9C27B0",
            inputs=[
                PortDefinition(
                    name="data",
                    port_type=PortType.ARRAY,
                    description="Array of data to filter"
                ),
                PortDefinition(
                    name="field",
                    port_type=PortType.STRING,
                    required=False,
                    description="Field name to filter on (for objects)"
                ),
                PortDefinition(
                    name="operator",
                    port_type=PortType.STRING,
                    default="equals",
                    description="Filter operator (equals, contains, greater, less, regex)"
                ),
                PortDefinition(
                    name="value",
                    port_type=PortType.ANY,
                    description="Value to compare against"
                )
            ],
            outputs=[
                PortDefinition(
                    name="filtered",
                    port_type=PortType.ARRAY,
                    description="Filtered data"
                ),
                PortDefinition(
                    name="count",
                    port_type=PortType.NUMBER,
                    description="Number of items after filtering"
                )
            ]
        )
    
    def execute(self, context: NodeContext) -> Any:
        import re
        
        data = context.get_input("data", [])
        field = context.get_input("field")
        operator = context.get_input("operator", "equals")
        value = context.get_input("value")
        
        filtered = []
        
        for item in data:
            # Get the value to compare
            if field and isinstance(item, dict):
                compare_value = item.get(field)
            else:
                compare_value = item
            
            # Apply the filter
            if operator == "equals":
                if compare_value == value:
                    filtered.append(item)
            elif operator == "contains":
                if str(value) in str(compare_value):
                    filtered.append(item)
            elif operator == "greater":
                try:
                    if float(compare_value) > float(value):
                        filtered.append(item)
                except (ValueError, TypeError):
                    pass
            elif operator == "less":
                try:
                    if float(compare_value) < float(value):
                        filtered.append(item)
                except (ValueError, TypeError):
                    pass
            elif operator == "regex":
                try:
                    if re.match(str(value), str(compare_value)):
                        filtered.append(item)
                except re.error:
                    pass
        
        context.set_output("filtered", filtered)
        context.set_output("count", len(filtered))
        
        return filtered


# Custom Node 5: Aggregator
class AggregatorNode(NodeFunction):
    """Aggregate data using various functions."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="custom",
            node_type="aggregator",
            display_name="Data Aggregator",
            category="Custom/Data",
            description="Aggregate arrays of numbers",
            icon="📊",
            color="#FF5722",
            inputs=[
                PortDefinition(
                    name="data",
                    port_type=PortType.ARRAY,
                    description="Array of numbers to aggregate"
                ),
                PortDefinition(
                    name="operation",
                    port_type=PortType.STRING,
                    default="sum",
                    description="Aggregation operation (sum, mean, min, max, count)"
                )
            ],
            outputs=[
                PortDefinition(
                    name="result",
                    port_type=PortType.NUMBER,
                    description="Aggregated result"
                )
            ],
            properties={
                "operations": ["sum", "mean", "min", "max", "count", "median", "std"]
            }
        )
    
    def execute(self, context: NodeContext) -> Any:
        import statistics
        
        data = context.get_input("data", [])
        operation = context.get_input("operation", "sum")
        
        # Convert to numbers
        numbers = []
        for item in data:
            try:
                numbers.append(float(item))
            except (ValueError, TypeError):
                pass
        
        if not numbers and operation != "count":
            result = None
        elif operation == "sum":
            result = sum(numbers)
        elif operation == "mean":
            result = statistics.mean(numbers) if numbers else None
        elif operation == "min":
            result = min(numbers) if numbers else None
        elif operation == "max":
            result = max(numbers) if numbers else None
        elif operation == "count":
            result = len(data)
        elif operation == "median":
            result = statistics.median(numbers) if numbers else None
        elif operation == "std":
            result = statistics.stdev(numbers) if len(numbers) > 1 else None
        else:
            result = None
        
        context.set_output("result", result)
        return result


# Custom Topping
class CustomTopping(ToppingBase):
    """Custom topping with utility nodes."""
    
    def get_name(self) -> str:
        return "custom_utilities"
    
    def get_version(self) -> str:
        return "1.0.0"
    
    def get_description(self) -> str:
        return "Custom utility nodes for data processing, text manipulation, and networking"
    
    def initialize(self):
        """Register all custom nodes."""
        self.register_node(StringFormatterNode)
        self.register_node(JSONParserNode)
        self.register_node(HTTPRequestNode)
        self.register_node(DataFilterNode)
        self.register_node(AggregatorNode)


def get_topping() -> ToppingBase:
    """Get the custom topping instance."""
    return CustomTopping()


# Example usage
if __name__ == "__main__":
    from ramen.topping import ToppingRegistry, ToppingLoader
    
    # Create registry and loader
    registry = ToppingRegistry()
    loader = ToppingLoader(registry)
    
    # Create and register the custom topping
    topping = CustomTopping()
    topping.initialize()
    registry.register_topping(topping)
    
    # List available nodes
    print("Available nodes from custom topping:")
    for node_type in registry.get_all_nodes().keys():
        metadata = registry.get_node_metadata(node_type)
        print(f"  - {node_type}: {metadata.display_name}")
        print(f"    Category: {metadata.category}")
        print(f"    Description: {metadata.description}")
        print()
    
    # Example: Use the string formatter node
    print("Testing String Formatter Node:")
    context = NodeContext(
        node_id="test_1",
        inputs={
            "template": "Hello, {name}! You are {age} years old.",
            "variables": {"name": "Alice", "age": 30}
        },
        properties={}
    )
    result = registry.execute_node("custom.string_formatter", context)
    print(f"  Result: {result}")
    print()
    
    # Example: Use the JSON parser node
    print("Testing JSON Parser Node:")
    context = NodeContext(
        node_id="test_2",
        inputs={
            "json_string": '{"name": "Bob", "score": 85}'
        },
        properties={}
    )
    result = registry.execute_node("custom.json_parser", context)
    print(f"  Result: {result}")
    print()
    
    # Example: Use the data filter node
    print("Testing Data Filter Node:")
    context = NodeContext(
        node_id="test_3",
        inputs={
            "data": [
                {"name": "Alice", "age": 30},
                {"name": "Bob", "age": 25},
                {"name": "Charlie", "age": 35}
            ],
            "field": "age",
            "operator": "greater",
            "value": 28
        },
        properties={}
    )
    result = registry.execute_node("custom.data_filter", context)
    print(f"  Filtered: {result}")
    print(f"  Count: {context.outputs['count']}")
    print()
    
    # Example: Use the aggregator node
    print("Testing Aggregator Node:")
    context = NodeContext(
        node_id="test_4",
        inputs={
            "data": [10, 20, 30, 40, 50],
            "operation": "mean"
        },
        properties={}
    )
    result = registry.execute_node("custom.aggregator", context)
    print(f"  Mean: {result}")
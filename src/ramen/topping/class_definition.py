"""Class definition system for visual programming with Ramen."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Type, Callable, Union
from enum import Enum
import ast
import inspect
import textwrap

from .topping_base import NodeFunction, NodeMetadata, NodeContext, PortDefinition, PortType


class ClassType(Enum):
    """Types of class definitions supported."""
    GENERIC = "generic"  # Generic Python class
    PYTORCH_MODULE = "pytorch_module"  # PyTorch nn.Module
    PYDANTIC_MODEL = "pydantic_model"  # Pydantic BaseModel
    DATACLASS = "dataclass"  # Python dataclass
    ENUM = "enum"  # Python Enum


@dataclass
class PropertyDefinition:
    """Definition of a class property/attribute."""
    name: str
    property_type: str  # Type annotation as string
    default_value: Any = None
    is_required: bool = True
    description: str = ""
    validator: Optional[Callable] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MethodDefinition:
    """Definition of a class method."""
    name: str
    parameters: List[PortDefinition] = field(default_factory=list)
    return_type: Optional[str] = None
    is_static: bool = False
    is_class_method: bool = False
    is_abstract: bool = False
    body: Optional[str] = None  # Method body as string
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ClassMetadata:
    """Metadata for a class definition."""
    class_name: str
    class_type: ClassType
    namespace: str
    base_classes: List[str] = field(default_factory=list)
    properties: List[PropertyDefinition] = field(default_factory=list)
    methods: List[MethodDefinition] = field(default_factory=list)
    decorators: List[str] = field(default_factory=list)
    docstring: str = ""
    is_abstract: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def full_name(self) -> str:
        """Get the fully qualified class name."""
        return f"{self.namespace}.{self.class_name}"
    
    def get_input_ports(self) -> List[PortDefinition]:
        """Generate input ports from properties."""
        ports = []
        for prop in self.properties:
            port_type = self._type_to_port_type(prop.property_type)
            ports.append(PortDefinition(
                name=prop.name,
                port_type=port_type,
                required=prop.is_required,
                default=prop.default_value,
                description=prop.description
            ))
        return ports
    
    def get_output_ports(self) -> List[PortDefinition]:
        """Generate output ports based on class type."""
        if self.class_type == ClassType.PYTORCH_MODULE:
            # PyTorch modules typically output tensors
            return [PortDefinition(
                name="output",
                port_type=PortType.TENSOR,
                description="Module output"
            )]
        elif self.class_type == ClassType.PYDANTIC_MODEL:
            # Pydantic models output the validated model instance
            return [PortDefinition(
                name="model",
                port_type=PortType.OBJECT,
                description="Validated model instance"
            )]
        else:
            # Generic classes output an instance
            return [PortDefinition(
                name="instance",
                port_type=PortType.OBJECT,
                description=f"Instance of {self.class_name}"
            )]
    
    def _type_to_port_type(self, type_str: str) -> PortType:
        """Convert Python type string to PortType."""
        type_map = {
            "int": PortType.NUMBER,
            "float": PortType.NUMBER,
            "str": PortType.STRING,
            "bool": PortType.BOOLEAN,
            "list": PortType.ARRAY,
            "dict": PortType.OBJECT,
            "torch.Tensor": PortType.TENSOR,
            "pd.DataFrame": PortType.DATAFRAME,
            "np.ndarray": PortType.ARRAY,
        }
        
        # Simple type matching
        for key, value in type_map.items():
            if key in type_str.lower():
                return value
        return PortType.ANY


class ClassDefinitionNode(NodeFunction):
    """Base class for visual class definition nodes."""
    
    def __init__(self):
        super().__init__()
        self._class_metadata: Optional[ClassMetadata] = None
        self._generated_class: Optional[Type] = None
        self._instances: List[Any] = []
        
    @abstractmethod
    def build_class_metadata(self) -> ClassMetadata:
        """Build the class metadata from visual definition."""
        pass
    
    def get_metadata(self) -> NodeMetadata:
        """Get node metadata for the class definition."""
        if not self._class_metadata:
            self._class_metadata = self.build_class_metadata()
            
        return NodeMetadata(
            namespace=self._class_metadata.namespace,
            node_type=f"{self._class_metadata.class_name}_Definition",
            display_name=f"Class: {self._class_metadata.class_name}",
            category="Class Definitions",
            description=self._class_metadata.docstring or f"Definition of {self._class_metadata.class_name} class",
            icon="📋" if self._class_metadata.class_type == ClassType.PYDANTIC_MODEL else "🏗️",
            color="#9333EA",  # Purple for definitions
            inputs=self._class_metadata.get_input_ports(),
            outputs=self._class_metadata.get_output_ports(),
            properties={
                "class_type": self._class_metadata.class_type.value,
                "is_abstract": self._class_metadata.is_abstract,
                "base_classes": self._class_metadata.base_classes,
            }
        )
    
    def execute(self, context: NodeContext) -> Any:
        """Execute the class definition node (instantiate the class)."""
        if not self._generated_class:
            self._generated_class = self.generate_class()
        
        # Collect constructor arguments from inputs
        kwargs = {}
        for prop in self._class_metadata.properties:
            value = context.get_input(prop.name, prop.default_value)
            if value is not None or not prop.is_required:
                kwargs[prop.name] = value
        
        # Create instance
        try:
            instance = self._generated_class(**kwargs)
            self._instances.append(instance)
            
            # Set output
            output_name = list(self.get_metadata().outputs)[0].name
            context.set_output(output_name, instance)
            
            return instance
        except Exception as e:
            raise RuntimeError(f"Failed to instantiate {self._class_metadata.class_name}: {e}")
    
    def generate_class(self) -> Type:
        """Generate the Python class from metadata."""
        class_code = self.generate_class_code()
        
        # Create a namespace for execution
        namespace = {}
        
        # Add imports based on class type
        if self._class_metadata.class_type == ClassType.PYTORCH_MODULE:
            exec("import torch\nimport torch.nn as nn", namespace)
        elif self._class_metadata.class_type == ClassType.PYDANTIC_MODEL:
            exec("from pydantic import BaseModel, Field, validator", namespace)
        elif self._class_metadata.class_type == ClassType.DATACLASS:
            exec("from dataclasses import dataclass, field", namespace)
        
        # Execute the class definition
        exec(class_code, namespace)
        
        # Return the generated class
        return namespace[self._class_metadata.class_name]
    
    def generate_class_code(self) -> str:
        """Generate Python code for the class."""
        # Ensure we have metadata
        if not self._class_metadata:
            self._class_metadata = self.build_class_metadata()
            
        lines = []
        
        # Add decorators
        for decorator in self._class_metadata.decorators:
            lines.append(f"@{decorator}")
        
        # Class definition line
        base_classes = ", ".join(self._class_metadata.base_classes) if self._class_metadata.base_classes else ""
        if base_classes:
            lines.append(f"class {self._class_metadata.class_name}({base_classes}):")
        else:
            lines.append(f"class {self._class_metadata.class_name}:")
        
        # Docstring
        if self._class_metadata.docstring:
            lines.append(f'    """{self._class_metadata.docstring}"""')
        
        # Properties
        if self._class_metadata.properties:
            lines.append("    ")
            for prop in self._class_metadata.properties:
                if prop.default_value is not None:
                    if isinstance(prop.default_value, str):
                        default = f'"{prop.default_value}"'
                    else:
                        default = repr(prop.default_value)
                    lines.append(f"    {prop.name}: {prop.property_type} = {default}")
                else:
                    lines.append(f"    {prop.name}: {prop.property_type}")
        
        # Constructor for non-dataclass classes
        if self._class_metadata.class_type not in [ClassType.DATACLASS, ClassType.PYDANTIC_MODEL]:
            lines.append("    ")
            lines.append("    def __init__(self, **kwargs):")
            for prop in self._class_metadata.properties:
                lines.append(f"        self.{prop.name} = kwargs.get('{prop.name}', {repr(prop.default_value)})")
        
        # Methods
        for method in self._class_metadata.methods:
            lines.append("    ")
            
            # Method decorators
            if method.is_static:
                lines.append("    @staticmethod")
            elif method.is_class_method:
                lines.append("    @classmethod")
            
            # Method signature
            params = ["self"] if not method.is_static else []
            params.extend([p.name for p in method.parameters])
            params_str = ", ".join(params)
            
            if method.return_type:
                lines.append(f"    def {method.name}({params_str}) -> {method.return_type}:")
            else:
                lines.append(f"    def {method.name}({params_str}):")
            
            # Method body
            if method.body:
                for line in method.body.split("\n"):
                    lines.append(f"        {line}")
            elif method.is_abstract:
                lines.append("        raise NotImplementedError()")
            else:
                lines.append("        pass")
        
        # If no methods or properties, add pass
        if not self._class_metadata.properties and not self._class_metadata.methods:
            lines.append("    pass")
        
        return "\n".join(lines)
    
    def create_instance_node(self) -> 'ClassInstanceNode':
        """Create an instance node from this class definition."""
        return ClassInstanceNode(self)


class ClassInstanceNode(NodeFunction):
    """Node representing an instance of a defined class."""
    
    def __init__(self, definition: ClassDefinitionNode):
        super().__init__()
        self.definition = definition
        self._class_metadata = definition.build_class_metadata()
        
    def get_metadata(self) -> NodeMetadata:
        """Get metadata for the instance node."""
        return NodeMetadata(
            namespace=self._class_metadata.namespace,
            node_type=self._class_metadata.class_name,
            display_name=self._class_metadata.class_name,
            category=self._get_category(),
            description=f"Instance of {self._class_metadata.class_name}",
            icon=self._get_icon(),
            color=self._get_color(),
            inputs=self._class_metadata.get_input_ports(),
            outputs=self._class_metadata.get_output_ports(),
            properties={
                "class_name": self._class_metadata.class_name,
                "class_type": self._class_metadata.class_type.value,
            }
        )
    
    def execute(self, context: NodeContext) -> Any:
        """Execute the instance node."""
        return self.definition.execute(context)
    
    def _get_category(self) -> str:
        """Get category based on class type."""
        category_map = {
            ClassType.PYTORCH_MODULE: "Neural Network",
            ClassType.PYDANTIC_MODEL: "Data Models",
            ClassType.DATACLASS: "Data Classes",
            ClassType.ENUM: "Enumerations",
            ClassType.GENERIC: "Custom Classes",
        }
        return category_map.get(self._class_metadata.class_type, "Custom")
    
    def _get_icon(self) -> str:
        """Get icon based on class type."""
        icon_map = {
            ClassType.PYTORCH_MODULE: "🧠",
            ClassType.PYDANTIC_MODEL: "📋",
            ClassType.DATACLASS: "📦",
            ClassType.ENUM: "📝",
            ClassType.GENERIC: "🎯",
        }
        return icon_map.get(self._class_metadata.class_type, "📦")
    
    def _get_color(self) -> str:
        """Get color based on class type."""
        color_map = {
            ClassType.PYTORCH_MODULE: "#FF6B6B",  # Red
            ClassType.PYDANTIC_MODEL: "#4ECDC4",  # Teal
            ClassType.DATACLASS: "#45B7D1",  # Blue
            ClassType.ENUM: "#96CEB4",  # Green
            ClassType.GENERIC: "#9B59B6",  # Purple
        }
        return color_map.get(self._class_metadata.class_type, "#666666")


class ClassDefinitionRegistry:
    """Registry for class definitions and instances."""
    
    def __init__(self):
        self._definitions: Dict[str, ClassDefinitionNode] = {}
        self._instances: Dict[str, Type[ClassInstanceNode]] = {}
        
    def register_definition(self, definition: ClassDefinitionNode) -> None:
        """Register a class definition."""
        metadata = definition.build_class_metadata()
        self._definitions[metadata.full_name] = definition
        
        # Create and register the instance node type
        instance_node = definition.create_instance_node()
        self._instances[metadata.full_name] = type(instance_node)
    
    def get_definition(self, full_name: str) -> Optional[ClassDefinitionNode]:
        """Get a class definition by full name."""
        return self._definitions.get(full_name)
    
    def get_instance_node_type(self, full_name: str) -> Optional[Type[ClassInstanceNode]]:
        """Get the instance node type for a class."""
        return self._instances.get(full_name)
    
    def list_definitions(self) -> List[str]:
        """List all registered class definitions."""
        return list(self._definitions.keys())
    
    def list_instance_types(self) -> List[str]:
        """List all available instance node types."""
        return list(self._instances.keys())


# Global registry instance
class_registry = ClassDefinitionRegistry()
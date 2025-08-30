"""Pydantic Model definition support for Ramen visual programming."""

from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum

from .class_definition import (
    ClassDefinitionNode, ClassMetadata, ClassType,
    PropertyDefinition, MethodDefinition, PortDefinition, PortType,
    NodeContext, NodeMetadata
)


class FieldType(Enum):
    """Common Pydantic field types."""
    STRING = "str"
    INTEGER = "int"
    FLOAT = "float"
    BOOLEAN = "bool"
    LIST = "List"
    DICT = "Dict"
    DATETIME = "datetime"
    DATE = "date"
    TIME = "time"
    UUID = "UUID"
    EMAIL = "EmailStr"
    URL = "HttpUrl"
    JSON = "Json"
    ENUM = "Enum"
    OPTIONAL = "Optional"
    UNION = "Union"


@dataclass
class FieldDefinition:
    """Definition of a Pydantic model field."""
    name: str
    field_type: FieldType
    type_args: List[str] = field(default_factory=list)  # For generic types
    default: Any = None
    required: bool = True
    description: str = ""
    alias: Optional[str] = None
    title: Optional[str] = None
    gt: Optional[float] = None  # greater than
    ge: Optional[float] = None  # greater than or equal
    lt: Optional[float] = None  # less than
    le: Optional[float] = None  # less than or equal
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    regex: Optional[str] = None
    example: Any = None
    
    def to_property_definition(self) -> PropertyDefinition:
        """Convert to a PropertyDefinition."""
        type_str = self.field_type.value
        if self.type_args:
            type_str = f"{type_str}[{', '.join(self.type_args)}]"
        
        return PropertyDefinition(
            name=self.name,
            property_type=type_str,
            default_value=self.default,
            is_required=self.required,
            description=self.description
        )


@dataclass
class ValidatorDefinition:
    """Definition of a Pydantic validator."""
    name: str
    fields: List[str]  # Fields to validate
    pre: bool = False  # Pre-validator
    each_item: bool = False  # Validate each item in sequences
    always: bool = False  # Run even if value is None
    body: str = ""  # Validator function body
    description: str = ""


class PydanticModelDefinition(ClassDefinitionNode):
    """Visual definition node for Pydantic BaseModel classes."""
    
    def __init__(self, model_name: str = "CustomModel", namespace: str = "models"):
        super().__init__()
        self.model_name = model_name
        self.namespace = namespace
        self.fields: List[FieldDefinition] = []
        self.validators: List[ValidatorDefinition] = []
        self.config: Dict[str, Any] = {
            "validate_assignment": True,
            "use_enum_values": True,
            "arbitrary_types_allowed": False,
            "orm_mode": False,
            "allow_population_by_field_name": True,
            "json_encoders": {}
        }
        self.examples: List[Dict[str, Any]] = []
        
    def add_field(self, field: FieldDefinition) -> None:
        """Add a field to the model."""
        self.fields.append(field)
        
    def add_validator(self, validator: ValidatorDefinition) -> None:
        """Add a validator to the model."""
        self.validators.append(validator)
        
    def add_example(self, example: Dict[str, Any]) -> None:
        """Add an example instance."""
        self.examples.append(example)
        
    def set_config(self, **config_options) -> None:
        """Update model configuration."""
        self.config.update(config_options)
        
    def build_class_metadata(self) -> ClassMetadata:
        """Build metadata for the Pydantic model class."""
        properties = [field.to_property_definition() for field in self.fields]
        
        # Create validator methods
        methods = []
        for validator in self.validators:
            methods.append(self._create_validator_method(validator))
        
        # Add utility methods
        methods.extend([
            self._create_to_dict_method(),
            self._create_from_dict_method(),
            self._create_validate_method()
        ])
        
        # Add Config class decorator
        decorators = []
        if self.config.get("orm_mode"):
            decorators.append("validator")
        
        return ClassMetadata(
            class_name=self.model_name,
            class_type=ClassType.PYDANTIC_MODEL,
            namespace=self.namespace,
            base_classes=["BaseModel"],
            properties=properties,
            methods=methods,
            decorators=decorators,
            docstring=f"Pydantic model {self.model_name} defined visually in Ramen",
            metadata={
                "fields": [self._field_to_dict(f) for f in self.fields],
                "validators": [self._validator_to_dict(v) for v in self.validators],
                "config": self.config,
                "examples": self.examples
            }
        )
    
    def _create_validator_method(self, validator: ValidatorDefinition) -> MethodDefinition:
        """Create a validator method."""
        # Generate decorator
        fields_str = ", ".join([f'"{f}"' for f in validator.fields])
        decorator_args = [fields_str]
        if validator.pre:
            decorator_args.append("pre=True")
        if validator.each_item:
            decorator_args.append("each_item=True")
        if validator.always:
            decorator_args.append("always=True")
        
        # Default body if not provided
        if not validator.body:
            validator.body = "return v"
        
        return MethodDefinition(
            name=f"validate_{validator.name}",
            parameters=[
                PortDefinition(name="cls", port_type=PortType.OBJECT),
                PortDefinition(name="v", port_type=PortType.ANY),
                PortDefinition(name="values", port_type=PortType.OBJECT)
            ],
            return_type="Any",
            is_class_method=True,
            body=validator.body,
            description=validator.description or f"Validator for {', '.join(validator.fields)}"
        )
    
    def _create_to_dict_method(self) -> MethodDefinition:
        """Create a to_dict utility method."""
        return MethodDefinition(
            name="to_dict",
            parameters=[],
            return_type="Dict[str, Any]",
            body="return self.dict()",
            description="Convert model to dictionary"
        )
    
    def _create_from_dict_method(self) -> MethodDefinition:
        """Create a from_dict class method."""
        return MethodDefinition(
            name="from_dict",
            parameters=[
                PortDefinition(name="cls", port_type=PortType.OBJECT),
                PortDefinition(name="data", port_type=PortType.OBJECT)
            ],
            return_type=f"'{self.model_name}'",
            is_class_method=True,
            body="return cls(**data)",
            description="Create model instance from dictionary"
        )
    
    def _create_validate_method(self) -> MethodDefinition:
        """Create a custom validation method."""
        return MethodDefinition(
            name="validate_all",
            parameters=[],
            return_type="bool",
            body="try:\n    self.validate(self.dict())\n    return True\nexcept:\n    return False",
            description="Validate all fields"
        )
    
    def _field_to_dict(self, field: FieldDefinition) -> Dict[str, Any]:
        """Convert field definition to dictionary."""
        return {
            "name": field.name,
            "type": field.field_type.value,
            "type_args": field.type_args,
            "default": field.default,
            "required": field.required,
            "description": field.description,
            "alias": field.alias,
            "constraints": {
                "gt": field.gt,
                "ge": field.ge,
                "lt": field.lt,
                "le": field.le,
                "min_length": field.min_length,
                "max_length": field.max_length,
                "regex": field.regex
            },
            "example": field.example
        }
    
    def _validator_to_dict(self, validator: ValidatorDefinition) -> Dict[str, Any]:
        """Convert validator definition to dictionary."""
        return {
            "name": validator.name,
            "fields": validator.fields,
            "pre": validator.pre,
            "each_item": validator.each_item,
            "always": validator.always,
            "body": validator.body,
            "description": validator.description
        }
    
    def generate_class_code(self) -> str:
        """Generate Python code for the Pydantic model."""
        lines = []
        
        # Imports
        lines.append("from pydantic import BaseModel, Field, validator")
        lines.append("from typing import Optional, List, Dict, Any")
        lines.append("")
        
        # Class definition
        lines.append(f"class {self.model_name}(BaseModel):")
        
        # Docstring
        if self._class_metadata and self._class_metadata.docstring:
            lines.append(f'    """{self._class_metadata.docstring}"""')
            lines.append("")
        
        # Fields with Field() definitions
        for field in self.fields:
            field_def = self._generate_field_code(field)
            lines.append(f"    {field.name}: {field_def}")
        
        # Config class
        if self.config:
            lines.append("")
            lines.append("    class Config:")
            for key, value in self.config.items():
                lines.append(f"        {key} = {repr(value)}")
        
        # Validators
        for validator in self.validators:
            lines.append("")
            fields_str = ", ".join([f'"{f}"' for f in validator.fields])
            decorator_args = [fields_str]
            if validator.pre:
                decorator_args.append("pre=True")
            
            lines.append(f'    @validator({", ".join(decorator_args)})')
            lines.append(f"    def validate_{validator.name}(cls, v, values):")
            for line in validator.body.split("\n"):
                lines.append(f"        {line}")
        
        # Utility methods
        lines.append("")
        lines.append("    def to_dict(self) -> Dict[str, Any]:")
        lines.append("        return self.dict()")
        
        return "\n".join(lines)
    
    def _generate_field_code(self, field: FieldDefinition) -> str:
        """Generate code for a single field."""
        type_str = field.field_type.value
        if field.type_args:
            type_str = f"{type_str}[{', '.join(field.type_args)}]"
        
        if not field.required:
            type_str = f"Optional[{type_str}]"
        
        # Build Field() arguments
        field_args = []
        
        if field.default is not None:
            if isinstance(field.default, str):
                field_args.append(f"default='{field.default}'")
            else:
                field_args.append(f"default={field.default}")
        elif not field.required:
            field_args.append("default=None")
        else:
            field_args.append("...")
        
        if field.alias:
            field_args.append(f"alias='{field.alias}'")
        
        if field.title:
            field_args.append(f"title='{field.title}'")
        
        if field.description:
            field_args.append(f"description='{field.description}'")
        
        # Constraints
        if field.gt is not None:
            field_args.append(f"gt={field.gt}")
        if field.ge is not None:
            field_args.append(f"ge={field.ge}")
        if field.lt is not None:
            field_args.append(f"lt={field.lt}")
        if field.le is not None:
            field_args.append(f"le={field.le}")
        if field.min_length is not None:
            field_args.append(f"min_length={field.min_length}")
        if field.max_length is not None:
            field_args.append(f"max_length={field.max_length}")
        if field.regex:
            field_args.append(f"regex=r'{field.regex}'")
        
        if field.example is not None:
            if isinstance(field.example, str):
                field_args.append(f"example='{field.example}'")
            else:
                field_args.append(f"example={field.example}")
        
        return f"{type_str} = Field({', '.join(field_args)})"
    
    def get_metadata(self) -> NodeMetadata:
        """Get metadata for the model definition node."""
        metadata = super().get_metadata()
        metadata.icon = "📋"
        metadata.color = "#4ECDC4"
        metadata.category = "Data Model Definitions"
        
        # Add validation input
        metadata.inputs.append(
            PortDefinition(
                name="validation_data",
                port_type=PortType.OBJECT,
                required=False,
                description="Data to validate against the model"
            )
        )
        
        # Model-specific outputs
        metadata.outputs = [
            PortDefinition(
                name="model",
                port_type=PortType.OBJECT,
                description="Pydantic model instance"
            ),
            PortDefinition(
                name="validated_data",
                port_type=PortType.OBJECT,
                description="Validated data dictionary"
            ),
            PortDefinition(
                name="errors",
                port_type=PortType.ARRAY,
                description="Validation errors (if any)"
            )
        ]
        
        return metadata
    
    def execute(self, context: NodeContext) -> Any:
        """Execute the model definition node."""
        # Get validation data if provided
        validation_data = context.get_input("validation_data")
        
        # Generate and instantiate the model
        try:
            model_instance = super().execute(context)
            
            # Validate data if provided
            errors = []
            validated_data = {}
            
            if validation_data:
                try:
                    # Validate the data
                    validated_instance = model_instance.__class__(**validation_data)
                    validated_data = validated_instance.dict()
                except Exception as e:
                    errors.append(str(e))
            
            # Set outputs
            context.set_output("model", model_instance)
            context.set_output("validated_data", validated_data)
            context.set_output("errors", errors)
            
            return model_instance
            
        except Exception as e:
            context.set_output("errors", [str(e)])
            raise


# Pre-defined common model templates
class UserModelTemplate(PydanticModelDefinition):
    """Template for a User model."""
    
    def __init__(self):
        super().__init__("User", "models")
        
        # Add common user fields
        self.add_field(FieldDefinition(
            name="id",
            field_type=FieldType.INTEGER,
            required=True,
            description="User ID"
        ))
        self.add_field(FieldDefinition(
            name="username",
            field_type=FieldType.STRING,
            required=True,
            min_length=3,
            max_length=50,
            description="Username"
        ))
        self.add_field(FieldDefinition(
            name="email",
            field_type=FieldType.EMAIL,
            required=True,
            description="Email address"
        ))
        self.add_field(FieldDefinition(
            name="full_name",
            field_type=FieldType.STRING,
            required=False,
            description="Full name"
        ))
        self.add_field(FieldDefinition(
            name="is_active",
            field_type=FieldType.BOOLEAN,
            default=True,
            description="Is user active"
        ))
        self.add_field(FieldDefinition(
            name="created_at",
            field_type=FieldType.DATETIME,
            required=False,
            description="Creation timestamp"
        ))
        
        # Add email validator
        self.add_validator(ValidatorDefinition(
            name="email",
            fields=["email"],
            body="if '@' not in v:\n    raise ValueError('Invalid email')\nreturn v",
            description="Validate email format"
        ))


class APIRequestTemplate(PydanticModelDefinition):
    """Template for an API request model."""
    
    def __init__(self):
        super().__init__("APIRequest", "models")
        
        self.add_field(FieldDefinition(
            name="endpoint",
            field_type=FieldType.STRING,
            required=True,
            description="API endpoint"
        ))
        self.add_field(FieldDefinition(
            name="method",
            field_type=FieldType.STRING,
            default="GET",
            description="HTTP method"
        ))
        self.add_field(FieldDefinition(
            name="headers",
            field_type=FieldType.DICT,
            type_args=["str", "str"],
            default={},
            required=False,
            description="Request headers"
        ))
        self.add_field(FieldDefinition(
            name="body",
            field_type=FieldType.OPTIONAL,
            type_args=["Dict[str, Any]"],
            required=False,
            description="Request body"
        ))
        self.add_field(FieldDefinition(
            name="timeout",
            field_type=FieldType.INTEGER,
            default=30,
            gt=0,
            le=300,
            description="Request timeout in seconds"
        ))
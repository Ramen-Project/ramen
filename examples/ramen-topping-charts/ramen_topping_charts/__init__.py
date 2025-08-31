"""Ramen Topping: Interactive Charts with Frontend Components."""

from typing import Dict, Any, List
import pandas as pd
import numpy as np

from ramen.topping import (
    ToppingBase, NodeFunction, NodeMetadata, NodeContext,
    PortDefinition, PortType, FrontendComponent
)


class InteractiveScatterPlotNode(NodeFunction):
    """Interactive scatter plot with custom frontend component."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="charts",
            node_type="interactive_scatter",
            display_name="Interactive Scatter Plot",
            category="Data Visualization",
            description="Create an interactive scatter plot with selection and filtering",
            icon="📊",
            color="#4CAF50",
            inputs=[
                PortDefinition("data", PortType.DATAFRAME, description="Input DataFrame"),
                PortDefinition("x_column", PortType.STRING, description="X-axis column name"),
                PortDefinition("y_column", PortType.STRING, description="Y-axis column name"),
                PortDefinition("color_column", PortType.STRING, required=False, description="Color grouping column"),
                PortDefinition("size_column", PortType.STRING, required=False, description="Size column")
            ],
            outputs=[
                PortDefinition("chart_config", PortType.OBJECT, description="Chart configuration"),
                PortDefinition("selected_data", PortType.DATAFRAME, description="Selected data points")
            ],
            frontend_component=FrontendComponent(
                component_name="InteractiveScatterPlot",
                component_path="components/InteractiveScatterPlot.tsx",
                dependencies=["react", "recharts", "d3-scale"],
                props_schema={
                    "type": "object",
                    "properties": {
                        "data": {"type": "array"},
                        "xColumn": {"type": "string"},
                        "yColumn": {"type": "string"},
                        "colorColumn": {"type": "string"},
                        "onSelectionChange": {"type": "function"}
                    }
                }
            )
        )
    
    def execute(self, context: NodeContext) -> Any:
        """Execute the scatter plot node."""
        try:
            # Get inputs
            data = context.get_input("data")
            x_column = context.get_input("x_column")
            y_column = context.get_input("y_column")
            color_column = context.get_input("color_column", None)
            size_column = context.get_input("size_column", None)
            
            if not isinstance(data, pd.DataFrame):
                raise ValueError("Input data must be a pandas DataFrame")
            
            if x_column not in data.columns:
                raise ValueError(f"Column '{x_column}' not found in DataFrame")
            
            if y_column not in data.columns:
                raise ValueError(f"Column '{y_column}' not found in DataFrame")
            
            # Prepare chart configuration
            chart_config = {
                "data": data.to_dict("records"),
                "xColumn": x_column,
                "yColumn": y_column,
                "colorColumn": color_column,
                "sizeColumn": size_column,
                "width": 800,
                "height": 600
            }
            
            # Set outputs
            context.set_output("chart_config", chart_config)
            context.set_output("selected_data", pd.DataFrame())  # Initially empty
            
            return chart_config
            
        except Exception as e:
            raise RuntimeError(f"Failed to create scatter plot: {str(e)}")


class DataTableNode(NodeFunction):
    """Interactive data table with filtering and sorting."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="charts",
            node_type="data_table",
            display_name="Interactive Data Table",
            category="Data Visualization",
            description="Display data in an interactive table with sorting and filtering",
            icon="📋",
            color="#2196F3",
            inputs=[
                PortDefinition("data", PortType.DATAFRAME, description="Input DataFrame"),
                PortDefinition("page_size", PortType.NUMBER, default=20, description="Rows per page"),
                PortDefinition("searchable", PortType.BOOLEAN, default=True, description="Enable search")
            ],
            outputs=[
                PortDefinition("filtered_data", PortType.DATAFRAME, description="Filtered data"),
                PortDefinition("selected_rows", PortType.ARRAY, description="Selected row indices")
            ],
            frontend_component=FrontendComponent(
                component_name="InteractiveDataTable",
                component_path="components/InteractiveDataTable.tsx",
                dependencies=["react", "react-table", "styled-components"],
                props_schema={
                    "type": "object",
                    "properties": {
                        "data": {"type": "array"},
                        "pageSize": {"type": "number"},
                        "searchable": {"type": "boolean"},
                        "onFilterChange": {"type": "function"},
                        "onSelectionChange": {"type": "function"}
                    }
                }
            )
        )
    
    def execute(self, context: NodeContext) -> Any:
        """Execute the data table node."""
        try:
            # Get inputs
            data = context.get_input("data")
            page_size = context.get_input("page_size", 20)
            searchable = context.get_input("searchable", True)
            
            if not isinstance(data, pd.DataFrame):
                raise ValueError("Input data must be a pandas DataFrame")
            
            # Set outputs (initially same as input)
            context.set_output("filtered_data", data)
            context.set_output("selected_rows", [])
            
            return {
                "rows": len(data),
                "columns": len(data.columns),
                "page_size": page_size
            }
            
        except Exception as e:
            raise RuntimeError(f"Failed to create data table: {str(e)}")


class ChartsTopping(ToppingBase):
    """Topping that provides interactive chart components."""
    
    def get_name(self) -> str:
        return "Interactive Charts"
    
    def get_version(self) -> str:
        return "1.0.0"
    
    def get_description(self) -> str:
        return "Interactive data visualization components with rich frontend UI"
    
    def initialize(self):
        """Initialize the charts topping."""
        # Register nodes
        self.register_node(InteractiveScatterPlotNode)
        self.register_node(DataTableNode)


def get_topping() -> ChartsTopping:
    """Entry point for the charts topping."""
    return ChartsTopping()
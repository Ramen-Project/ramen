"""Example of advanced Node(StateClass) topping API."""

import pandas as pd
import numpy as np
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from ramen.topping import Node, on, ToppingBase, NodeMetadata, PortDefinition, PortType


# State model for CSV Reader
class CSVReaderState(BaseModel):
    """State model for advanced CSV reader node."""
    
    # UI State
    status: str = "ready"
    preview_columns: List[str] = Field(default_factory=list)
    error: Optional[str] = None
    row_count: Optional[int] = None
    file_ready: bool = False
    
    # Node Properties
    encoding: str = "utf-8"
    separator: str = ","
    show_preview: bool = True
    preview_rows: int = 5
    
    # Dynamic Ports
    dynamic_outputs: List[Dict[str, Any]] = Field(default_factory=list)


# Advanced CSV Reader with dynamic columns
class AdvancedCSVReader(Node(CSVReaderState)):
    """Advanced CSV reader with dynamic column outputs and preview."""
    
    def get_metadata(self) -> NodeMetadata:
        """Get basic node metadata."""
        return NodeMetadata(
            namespace="advanced",
            node_type="csv_reader",
            display_name="Advanced CSV Reader",
            category="Data I/O",
            description="CSV reader with preview and dynamic column outputs",
            icon="📄",
            color="#4CAF50",
            inputs=[
                PortDefinition("file_path", PortType.STRING, description="Path to CSV file"),
            ],
            outputs=[
                PortDefinition("dataframe", PortType.DATAFRAME, description="Full DataFrame"),
            ]
        )
    
    # Frontend components removed
    
    @on("input_changed")
    def handle_input_change(self, event_data: dict):
        """Handle file path changes with preview."""
        if event_data["port_name"] == "file_path":
            try:
                file_path = event_data["value"]
                
                # Load preview
                preview_df = pd.read_csv(
                    file_path, 
                    encoding=self.state.encoding,
                    sep=self.state.separator,
                    nrows=self.state.preview_rows
                )
                
                # Update state (automatically synced to frontend)
                self.state.preview_columns = preview_df.columns.tolist()
                self.state.status = "preview_ready"
                self.state.file_ready = True
                self.state.error = None
                
                # Create dynamic output ports for each column
                self.state.dynamic_outputs = [
                    {
                        "name": f"col_{col}",
                        "type": "array",
                        "description": f"Column: {col}"
                    }
                    for col in preview_df.columns
                ]
                
            except Exception as e:
                self.state.status = "error"
                self.state.error = str(e)
                self.state.file_ready = False
    
    @on("property_changed")
    def handle_property_change(self, event_data: dict):
        """Handle property changes from UI."""
        prop_name = event_data["property_name"]
        value = event_data["value"]
        
        # Update state with type safety
        if hasattr(self.state, prop_name):
            setattr(self.state, prop_name, value)
            
            # If encoding or separator changed, re-preview file
            if prop_name in ["encoding", "separator"] and self.state.file_ready:
                # Trigger re-preview with current file
                self.handle_input_change({
                    "port_name": "file_path",
                    "value": self.state.current_file_path
                })
    
    @on("execute")
    def handle_execute(self, inputs: dict):
        """Execute the CSV reading."""
        self.state.status = "executing"
        
        file_path = inputs.get("file_path")
        
        try:
            # Load full CSV
            df = pd.read_csv(
                file_path,
                encoding=self.state.encoding,
                sep=self.state.separator
            )
            
            # Prepare outputs
            result = {"dataframe": df}
            
            # Add column outputs if they exist
            for col in df.columns:
                result[f"col_{col}"] = df[col].values
            
            # Update final state
            self.state.status = "completed"
            self.state.row_count = len(df)
            
            return result
            
        except Exception as e:
            self.state.status = "error"
            self.state.error = str(e)
            raise


# State model for Interactive Chart
class InteractiveChartState(BaseModel):
    """State for interactive chart node."""
    
    chart_type: str = "scatter"
    x_column: str = ""
    y_column: str = ""
    
    # UI interaction state
    selected_points: List[int] = Field(default_factory=list)
    brush_selection: Optional[Dict[str, Any]] = None
    
    # Chart display state
    title: str = "Interactive Chart"
    show_legend: bool = True
    color_scheme: str = "viridis"


class InteractiveChart(Node(InteractiveChartState)):
    """Interactive chart with selection capabilities."""
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            namespace="advanced",
            node_type="interactive_chart",
            display_name="Interactive Chart",
            category="Visualization",
            description="Interactive chart with selection",
            icon="📊",
            color="#9C27B0",
            inputs=[
                PortDefinition("data", PortType.DATAFRAME, description="Input data"),
            ],
            outputs=[
                PortDefinition("chart", PortType.IMAGE, description="Chart image"),
                PortDefinition("selected_data", PortType.DATAFRAME, description="Selected data points"),
            ]
        )
    
    # Frontend components removed
    
    @on("ui_interaction")
    def handle_ui_interaction(self, event_data: dict):
        """Handle chart interactions from frontend."""
        interaction_type = event_data["type"]
        
        if interaction_type == "point_click":
            point_index = event_data["point_index"]
            if point_index not in self.state.selected_points:
                self.state.selected_points.append(point_index)
            else:
                self.state.selected_points.remove(point_index)
        
        elif interaction_type == "brush_selection":
            self.state.brush_selection = event_data["selection"]
        
        elif interaction_type == "clear_selection":
            self.state.selected_points.clear()
            self.state.brush_selection = None
    
    @on("property_changed") 
    def handle_property_change(self, event_data: dict):
        """Handle chart property changes."""
        prop_name = event_data["property_name"]
        value = event_data["value"]
        
        if hasattr(self.state, prop_name):
            setattr(self.state, prop_name, value)
    
    @on("execute")
    def handle_execute(self, inputs: dict):
        """Generate chart and return selected data."""
        data = inputs.get("data")
        
        if data is None or data.empty:
            return {"chart": None, "selected_data": pd.DataFrame()}
        
        # Generate chart based on state
        # (This would create actual chart using matplotlib/plotly)
        chart_image = self._create_chart(data)
        
        # Extract selected data
        if self.state.selected_points:
            selected_data = data.iloc[self.state.selected_points]
        else:
            selected_data = pd.DataFrame()
        
        return {
            "chart": chart_image,
            "selected_data": selected_data
        }
    
    def _create_chart(self, data):
        """Create chart based on current state (placeholder)."""
        # This would implement actual charting logic
        return f"Chart: {self.state.chart_type} of {self.state.x_column} vs {self.state.y_column}"


# Topping class to register advanced nodes
class AdvancedExampleTopping(ToppingBase):
    """Example topping with advanced nodes."""
    
    def get_name(self) -> str:
        return "advanced_example"
    
    def get_version(self) -> str:
        return "1.0.0"
    
    def get_description(self) -> str:
        return "Advanced topping examples with Node(StateClass) API"
    
    def initialize(self):
        """Register advanced nodes."""
        self.register_node(AdvancedCSVReader)
        self.register_node(InteractiveChart)


def get_topping() -> ToppingBase:
    """Return the topping instance."""
    return AdvancedExampleTopping()
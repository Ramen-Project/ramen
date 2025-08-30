"""
Plots Topping - 資料視覺化節點
"""

from typing import Any, Dict, List, Optional, Union
import matplotlib.pyplot as plt
import matplotlib.figure as mpl_figure
import seaborn as sns
import numpy as np
import pandas as pd
from io import BytesIO
import base64

from ramen.topping import (
    ToppingBase,
    NodeFunction,
    NodeMetadata,
    NodeContext,
    PortDefinition,
    PortType
)


class LinePlotNode(NodeFunction):
    """線圖節點"""
    
    def execute(self, context: NodeContext) -> Any:
        x = context.get_input("x")
        y = context.get_input("y")
        title = context.get_input("title", "Line Plot")
        xlabel = context.get_input("xlabel", "X")
        ylabel = context.get_input("ylabel", "Y")
        figsize = context.get_input("figsize", (10, 6))
        style = context.get_input("style", "-")
        color = context.get_input("color", None)
        
        # 建立圖形
        fig, ax = plt.subplots(figsize=figsize)
        ax.plot(x, y, style, color=color)
        ax.set_title(title)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        ax.grid(True, alpha=0.3)
        
        # 儲存為 base64 圖片
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)
        
        context.set_output("figure", fig)
        context.set_output("image", image_base64)
        context.set_output("image_url", f"data:image/png;base64,{image_base64}")
        return fig
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Line Plot",
            description="建立線圖",
            inputs=[
                PortDefinition(name="x", port_type=PortType.GENERIC, description="X 軸資料"),
                PortDefinition(name="y", port_type=PortType.GENERIC, description="Y 軸資料"),
                PortDefinition(name="title", port_type=PortType.STRING, description="標題"),
                PortDefinition(name="xlabel", port_type=PortType.STRING, description="X 軸標籤"),
                PortDefinition(name="ylabel", port_type=PortType.STRING, description="Y 軸標籤"),
                PortDefinition(name="figsize", port_type=PortType.GENERIC, description="圖形大小"),
                PortDefinition(name="style", port_type=PortType.STRING, description="線條樣式"),
                PortDefinition(name="color", port_type=PortType.STRING, description="顏色")
            ],
            outputs=[
                PortDefinition(name="figure", port_type=PortType.GENERIC, description="圖形物件"),
                PortDefinition(name="image", port_type=PortType.STRING, description="Base64 圖片"),
                PortDefinition(name="image_url", port_type=PortType.STRING, description="圖片 URL")
            ]
        )


class ScatterPlotNode(NodeFunction):
    """散點圖節點"""
    
    def execute(self, context: NodeContext) -> Any:
        x = context.get_input("x")
        y = context.get_input("y")
        title = context.get_input("title", "Scatter Plot")
        xlabel = context.get_input("xlabel", "X")
        ylabel = context.get_input("ylabel", "Y")
        figsize = context.get_input("figsize", (10, 6))
        color = context.get_input("color", None)
        size = context.get_input("size", None)
        alpha = context.get_input("alpha", 0.6)
        
        # 建立圖形
        fig, ax = plt.subplots(figsize=figsize)
        scatter = ax.scatter(x, y, c=color, s=size, alpha=alpha)
        ax.set_title(title)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        ax.grid(True, alpha=0.3)
        
        # 如果有顏色映射，加入顏色條
        if color is not None and not isinstance(color, str):
            plt.colorbar(scatter, ax=ax)
        
        # 儲存為 base64 圖片
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)
        
        context.set_output("figure", fig)
        context.set_output("image", image_base64)
        context.set_output("image_url", f"data:image/png;base64,{image_base64}")
        return fig
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Scatter Plot",
            description="建立散點圖",
            inputs=[
                PortDefinition(name="x", port_type=PortType.GENERIC, description="X 軸資料"),
                PortDefinition(name="y", port_type=PortType.GENERIC, description="Y 軸資料"),
                PortDefinition(name="title", port_type=PortType.STRING, description="標題"),
                PortDefinition(name="xlabel", port_type=PortType.STRING, description="X 軸標籤"),
                PortDefinition(name="ylabel", port_type=PortType.STRING, description="Y 軸標籤"),
                PortDefinition(name="figsize", port_type=PortType.GENERIC, description="圖形大小"),
                PortDefinition(name="color", port_type=PortType.GENERIC, description="顏色"),
                PortDefinition(name="size", port_type=PortType.GENERIC, description="點大小"),
                PortDefinition(name="alpha", port_type=PortType.NUMBER, description="透明度")
            ],
            outputs=[
                PortDefinition(name="figure", port_type=PortType.GENERIC, description="圖形物件"),
                PortDefinition(name="image", port_type=PortType.STRING, description="Base64 圖片"),
                PortDefinition(name="image_url", port_type=PortType.STRING, description="圖片 URL")
            ]
        )


class BarPlotNode(NodeFunction):
    """長條圖節點"""
    
    def execute(self, context: NodeContext) -> Any:
        x = context.get_input("x")
        y = context.get_input("y")
        title = context.get_input("title", "Bar Plot")
        xlabel = context.get_input("xlabel", "Categories")
        ylabel = context.get_input("ylabel", "Values")
        figsize = context.get_input("figsize", (10, 6))
        color = context.get_input("color", "steelblue")
        orientation = context.get_input("orientation", "vertical")
        
        # 建立圖形
        fig, ax = plt.subplots(figsize=figsize)
        
        if orientation == "horizontal":
            ax.barh(x, y, color=color)
        else:
            ax.bar(x, y, color=color)
        
        ax.set_title(title)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        ax.grid(True, alpha=0.3, axis='y' if orientation == 'vertical' else 'x')
        
        # 旋轉 x 軸標籤（如果是垂直長條圖）
        if orientation == "vertical" and isinstance(x[0], str):
            plt.xticks(rotation=45, ha='right')
        
        # 儲存為 base64 圖片
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)
        
        context.set_output("figure", fig)
        context.set_output("image", image_base64)
        context.set_output("image_url", f"data:image/png;base64,{image_base64}")
        return fig
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Bar Plot",
            description="建立長條圖",
            inputs=[
                PortDefinition(name="x", port_type=PortType.GENERIC, description="類別資料"),
                PortDefinition(name="y", port_type=PortType.GENERIC, description="數值資料"),
                PortDefinition(name="title", port_type=PortType.STRING, description="標題"),
                PortDefinition(name="xlabel", port_type=PortType.STRING, description="X 軸標籤"),
                PortDefinition(name="ylabel", port_type=PortType.STRING, description="Y 軸標籤"),
                PortDefinition(name="figsize", port_type=PortType.GENERIC, description="圖形大小"),
                PortDefinition(name="color", port_type=PortType.STRING, description="顏色"),
                PortDefinition(name="orientation", port_type=PortType.STRING, description="方向")
            ],
            outputs=[
                PortDefinition(name="figure", port_type=PortType.GENERIC, description="圖形物件"),
                PortDefinition(name="image", port_type=PortType.STRING, description="Base64 圖片"),
                PortDefinition(name="image_url", port_type=PortType.STRING, description="圖片 URL")
            ]
        )


class HistogramNode(NodeFunction):
    """直方圖節點"""
    
    def execute(self, context: NodeContext) -> Any:
        data = context.get_input("data")
        bins = context.get_input("bins", 30)
        title = context.get_input("title", "Histogram")
        xlabel = context.get_input("xlabel", "Values")
        ylabel = context.get_input("ylabel", "Frequency")
        figsize = context.get_input("figsize", (10, 6))
        color = context.get_input("color", "steelblue")
        alpha = context.get_input("alpha", 0.7)
        density = context.get_input("density", False)
        
        # 建立圖形
        fig, ax = plt.subplots(figsize=figsize)
        n, bins_edges, patches = ax.hist(data, bins=bins, color=color, alpha=alpha, 
                                         density=density, edgecolor='black')
        ax.set_title(title)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        ax.grid(True, alpha=0.3)
        
        # 加入統計資訊
        mean_val = np.mean(data)
        ax.axvline(mean_val, color='red', linestyle='dashed', linewidth=2, label=f'Mean: {mean_val:.2f}')
        ax.legend()
        
        # 儲存為 base64 圖片
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)
        
        context.set_output("figure", fig)
        context.set_output("image", image_base64)
        context.set_output("image_url", f"data:image/png;base64,{image_base64}")
        context.set_output("counts", n)
        context.set_output("bin_edges", bins_edges)
        return fig
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Histogram",
            description="建立直方圖",
            inputs=[
                PortDefinition(name="data", port_type=PortType.GENERIC, description="資料"),
                PortDefinition(name="bins", port_type=PortType.NUMBER, description="區間數"),
                PortDefinition(name="title", port_type=PortType.STRING, description="標題"),
                PortDefinition(name="xlabel", port_type=PortType.STRING, description="X 軸標籤"),
                PortDefinition(name="ylabel", port_type=PortType.STRING, description="Y 軸標籤"),
                PortDefinition(name="figsize", port_type=PortType.GENERIC, description="圖形大小"),
                PortDefinition(name="color", port_type=PortType.STRING, description="顏色"),
                PortDefinition(name="alpha", port_type=PortType.NUMBER, description="透明度"),
                PortDefinition(name="density", port_type=PortType.BOOLEAN, description="密度圖")
            ],
            outputs=[
                PortDefinition(name="figure", port_type=PortType.GENERIC, description="圖形物件"),
                PortDefinition(name="image", port_type=PortType.STRING, description="Base64 圖片"),
                PortDefinition(name="image_url", port_type=PortType.STRING, description="圖片 URL"),
                PortDefinition(name="counts", port_type=PortType.GENERIC, description="計數"),
                PortDefinition(name="bin_edges", port_type=PortType.GENERIC, description="區間邊界")
            ]
        )


class HeatmapNode(NodeFunction):
    """熱力圖節點"""
    
    def execute(self, context: NodeContext) -> Any:
        data = context.get_input("data")
        title = context.get_input("title", "Heatmap")
        xlabel = context.get_input("xlabel", "")
        ylabel = context.get_input("ylabel", "")
        figsize = context.get_input("figsize", (10, 8))
        cmap = context.get_input("cmap", "coolwarm")
        annot = context.get_input("annot", True)
        fmt = context.get_input("fmt", ".2f")
        
        # 建立圖形
        fig, ax = plt.subplots(figsize=figsize)
        
        # 如果是 DataFrame，使用 seaborn
        if isinstance(data, pd.DataFrame):
            sns.heatmap(data, annot=annot, fmt=fmt, cmap=cmap, ax=ax, cbar=True)
        else:
            # 否則使用 matplotlib
            im = ax.imshow(data, cmap=cmap, aspect='auto')
            plt.colorbar(im, ax=ax)
            
            # 加入註釋
            if annot:
                for i in range(len(data)):
                    for j in range(len(data[0])):
                        text = ax.text(j, i, f"{data[i][j]:{fmt}}", 
                                     ha="center", va="center", color="white")
        
        ax.set_title(title)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        
        # 儲存為 base64 圖片
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)
        
        context.set_output("figure", fig)
        context.set_output("image", image_base64)
        context.set_output("image_url", f"data:image/png;base64,{image_base64}")
        return fig
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Heatmap",
            description="建立熱力圖",
            inputs=[
                PortDefinition(name="data", port_type=PortType.GENERIC, description="2D 資料"),
                PortDefinition(name="title", port_type=PortType.STRING, description="標題"),
                PortDefinition(name="xlabel", port_type=PortType.STRING, description="X 軸標籤"),
                PortDefinition(name="ylabel", port_type=PortType.STRING, description="Y 軸標籤"),
                PortDefinition(name="figsize", port_type=PortType.GENERIC, description="圖形大小"),
                PortDefinition(name="cmap", port_type=PortType.STRING, description="色彩映射"),
                PortDefinition(name="annot", port_type=PortType.BOOLEAN, description="顯示數值"),
                PortDefinition(name="fmt", port_type=PortType.STRING, description="數值格式")
            ],
            outputs=[
                PortDefinition(name="figure", port_type=PortType.GENERIC, description="圖形物件"),
                PortDefinition(name="image", port_type=PortType.STRING, description="Base64 圖片"),
                PortDefinition(name="image_url", port_type=PortType.STRING, description="圖片 URL")
            ]
        )


class BoxPlotNode(NodeFunction):
    """箱形圖節點"""
    
    def execute(self, context: NodeContext) -> Any:
        data = context.get_input("data")
        labels = context.get_input("labels", None)
        title = context.get_input("title", "Box Plot")
        xlabel = context.get_input("xlabel", "")
        ylabel = context.get_input("ylabel", "Values")
        figsize = context.get_input("figsize", (10, 6))
        showfliers = context.get_input("showfliers", True)
        
        # 建立圖形
        fig, ax = plt.subplots(figsize=figsize)
        
        # 處理不同格式的資料
        if isinstance(data, pd.DataFrame):
            data.boxplot(ax=ax)
        else:
            ax.boxplot(data, labels=labels, showfliers=showfliers)
        
        ax.set_title(title)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        ax.grid(True, alpha=0.3)
        
        # 儲存為 base64 圖片
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)
        
        context.set_output("figure", fig)
        context.set_output("image", image_base64)
        context.set_output("image_url", f"data:image/png;base64,{image_base64}")
        return fig
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Box Plot",
            description="建立箱形圖",
            inputs=[
                PortDefinition(name="data", port_type=PortType.GENERIC, description="資料"),
                PortDefinition(name="labels", port_type=PortType.GENERIC, description="標籤"),
                PortDefinition(name="title", port_type=PortType.STRING, description="標題"),
                PortDefinition(name="xlabel", port_type=PortType.STRING, description="X 軸標籤"),
                PortDefinition(name="ylabel", port_type=PortType.STRING, description="Y 軸標籤"),
                PortDefinition(name="figsize", port_type=PortType.GENERIC, description="圖形大小"),
                PortDefinition(name="showfliers", port_type=PortType.BOOLEAN, description="顯示離群值")
            ],
            outputs=[
                PortDefinition(name="figure", port_type=PortType.GENERIC, description="圖形物件"),
                PortDefinition(name="image", port_type=PortType.STRING, description="Base64 圖片"),
                PortDefinition(name="image_url", port_type=PortType.STRING, description="圖片 URL")
            ]
        )


class SubplotNode(NodeFunction):
    """子圖節點"""
    
    def execute(self, context: NodeContext) -> Any:
        nrows = context.get_input("nrows", 1)
        ncols = context.get_input("ncols", 1)
        figsize = context.get_input("figsize", (12, 8))
        title = context.get_input("title", "")
        
        # 建立子圖
        fig, axes = plt.subplots(nrows, ncols, figsize=figsize)
        
        if title:
            fig.suptitle(title)
        
        # 調整子圖間距
        plt.tight_layout()
        
        # 儲存為 base64 圖片（空白子圖）
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        
        context.set_output("figure", fig)
        context.set_output("axes", axes)
        context.set_output("image", image_base64)
        context.set_output("image_url", f"data:image/png;base64,{image_base64}")
        
        # 不關閉圖形，讓其他節點可以繼續使用
        return fig
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Subplot",
            description="建立子圖布局",
            inputs=[
                PortDefinition(name="nrows", port_type=PortType.NUMBER, description="列數"),
                PortDefinition(name="ncols", port_type=PortType.NUMBER, description="行數"),
                PortDefinition(name="figsize", port_type=PortType.GENERIC, description="圖形大小"),
                PortDefinition(name="title", port_type=PortType.STRING, description="總標題")
            ],
            outputs=[
                PortDefinition(name="figure", port_type=PortType.GENERIC, description="圖形物件"),
                PortDefinition(name="axes", port_type=PortType.GENERIC, description="子圖軸物件"),
                PortDefinition(name="image", port_type=PortType.STRING, description="Base64 圖片"),
                PortDefinition(name="image_url", port_type=PortType.STRING, description="圖片 URL")
            ]
        )


class SavePlotNode(NodeFunction):
    """儲存圖形節點"""
    
    def execute(self, context: NodeContext) -> Any:
        figure = context.get_input("figure")
        filepath = context.get_input("filepath")
        dpi = context.get_input("dpi", 100)
        format = context.get_input("format", "png")
        bbox_inches = context.get_input("bbox_inches", "tight")
        
        # 儲存圖形
        if isinstance(figure, mpl_figure.Figure):
            figure.savefig(filepath, dpi=dpi, format=format, bbox_inches=bbox_inches)
        else:
            plt.savefig(filepath, dpi=dpi, format=format, bbox_inches=bbox_inches)
        
        context.set_output("filepath", filepath)
        context.set_output("success", True)
        return filepath
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="Save Plot",
            description="儲存圖形到檔案",
            inputs=[
                PortDefinition(name="figure", port_type=PortType.GENERIC, description="圖形物件"),
                PortDefinition(name="filepath", port_type=PortType.STRING, description="檔案路徑"),
                PortDefinition(name="dpi", port_type=PortType.NUMBER, description="解析度"),
                PortDefinition(name="format", port_type=PortType.STRING, description="檔案格式"),
                PortDefinition(name="bbox_inches", port_type=PortType.STRING, description="邊界設定")
            ],
            outputs=[
                PortDefinition(name="filepath", port_type=PortType.STRING, description="檔案路徑"),
                PortDefinition(name="success", port_type=PortType.BOOLEAN, description="儲存成功")
            ]
        )


class PlotsTopping(ToppingBase):
    """資料視覺化節點集合"""
    
    def get_nodes(self) -> List[NodeFunction]:
        return [
            LinePlotNode(),
            ScatterPlotNode(),
            BarPlotNode(),
            HistogramNode(),
            HeatmapNode(),
            BoxPlotNode(),
            SubplotNode(),
            SavePlotNode()
        ]
    
    def get_namespace(self) -> str:
        return "plots"
    
    def get_description(self) -> str:
        return "資料視覺化節點"
    
    def get_dependencies(self) -> List[str]:
        return ["matplotlib", "seaborn", "numpy", "pandas"]


# Entry point for topping loader
def get_topping() -> ToppingBase:
    """取得 Plots topping 實例"""
    return PlotsTopping()
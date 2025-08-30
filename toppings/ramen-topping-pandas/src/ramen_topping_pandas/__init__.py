"""
Pandas Topping - DataFrame操作節點
"""

from typing import Any, Dict, List, Optional
import pandas as pd
import numpy as np

from ramen.topping import (
    ToppingBase,
    NodeFunction,
    NodeMetadata,
    NodeContext,
    PortDefinition,
    PortType
)


class DataFrameCreateNode(NodeFunction):
    """建立 DataFrame 節點"""
    
    def execute(self, context: NodeContext) -> Any:
        data = context.get_input("data", {})
        columns = context.get_input("columns", None)
        index = context.get_input("index", None)
        
        df = pd.DataFrame(data, columns=columns, index=index)
        context.set_output("dataframe", df)
        return df
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="DataFrame Create",
            description="建立 pandas DataFrame",
            inputs=[
                PortDefinition(name="data", port_type=PortType.GENERIC, description="資料"),
                PortDefinition(name="columns", port_type=PortType.GENERIC, description="欄位名稱"),
                PortDefinition(name="index", port_type=PortType.GENERIC, description="索引")
            ],
            outputs=[
                PortDefinition(name="dataframe", port_type=PortType.GENERIC, description="DataFrame")
            ]
        )


class CSVReaderNode(NodeFunction):
    """讀取 CSV 檔案節點"""
    
    def execute(self, context: NodeContext) -> Any:
        filepath = context.get_input("filepath")
        encoding = context.get_input("encoding", "utf-8")
        sep = context.get_input("separator", ",")
        header = context.get_input("header", "infer")
        
        df = pd.read_csv(filepath, encoding=encoding, sep=sep, header=header)
        context.set_output("dataframe", df)
        context.set_output("shape", df.shape)
        context.set_output("columns", df.columns.tolist())
        return df
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="CSV Reader",
            description="讀取 CSV 檔案為 DataFrame",
            inputs=[
                PortDefinition(name="filepath", port_type=PortType.STRING, description="檔案路徑"),
                PortDefinition(name="encoding", port_type=PortType.STRING, description="編碼"),
                PortDefinition(name="separator", port_type=PortType.STRING, description="分隔符號"),
                PortDefinition(name="header", port_type=PortType.GENERIC, description="標頭列")
            ],
            outputs=[
                PortDefinition(name="dataframe", port_type=PortType.GENERIC, description="DataFrame"),
                PortDefinition(name="shape", port_type=PortType.GENERIC, description="維度"),
                PortDefinition(name="columns", port_type=PortType.GENERIC, description="欄位列表")
            ]
        )


class DataFrameFilterNode(NodeFunction):
    """過濾 DataFrame 節點"""
    
    def execute(self, context: NodeContext) -> Any:
        df = context.get_input("dataframe")
        column = context.get_input("column")
        operator = context.get_input("operator", "==")
        value = context.get_input("value")
        
        if not isinstance(df, pd.DataFrame):
            raise ValueError("Input must be a pandas DataFrame")
        
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found in DataFrame")
        
        # 執行過濾
        if operator == "==":
            filtered_df = df[df[column] == value]
        elif operator == "!=":
            filtered_df = df[df[column] != value]
        elif operator == ">":
            filtered_df = df[df[column] > value]
        elif operator == "<":
            filtered_df = df[df[column] < value]
        elif operator == ">=":
            filtered_df = df[df[column] >= value]
        elif operator == "<=":
            filtered_df = df[df[column] <= value]
        elif operator == "contains":
            filtered_df = df[df[column].str.contains(value, na=False)]
        else:
            raise ValueError(f"Unknown operator: {operator}")
        
        context.set_output("dataframe", filtered_df)
        context.set_output("count", len(filtered_df))
        return filtered_df
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="DataFrame Filter",
            description="過濾 DataFrame 資料",
            inputs=[
                PortDefinition(name="dataframe", port_type=PortType.GENERIC, description="輸入 DataFrame"),
                PortDefinition(name="column", port_type=PortType.STRING, description="欄位名稱"),
                PortDefinition(name="operator", port_type=PortType.STRING, description="運算子"),
                PortDefinition(name="value", port_type=PortType.GENERIC, description="比較值")
            ],
            outputs=[
                PortDefinition(name="dataframe", port_type=PortType.GENERIC, description="過濾後的 DataFrame"),
                PortDefinition(name="count", port_type=PortType.NUMBER, description="資料筆數")
            ]
        )


class DataFrameGroupByNode(NodeFunction):
    """GroupBy 聚合節點"""
    
    def execute(self, context: NodeContext) -> Any:
        df = context.get_input("dataframe")
        by = context.get_input("by")  # 欄位名稱或欄位列表
        agg_func = context.get_input("agg_func", "mean")
        agg_columns = context.get_input("agg_columns", None)
        
        if not isinstance(df, pd.DataFrame):
            raise ValueError("Input must be a pandas DataFrame")
        
        # 執行 groupby
        grouped = df.groupby(by)
        
        # 選擇要聚合的欄位
        if agg_columns:
            grouped = grouped[agg_columns]
        
        # 執行聚合
        if agg_func == "mean":
            result = grouped.mean()
        elif agg_func == "sum":
            result = grouped.sum()
        elif agg_func == "count":
            result = grouped.count()
        elif agg_func == "min":
            result = grouped.min()
        elif agg_func == "max":
            result = grouped.max()
        elif agg_func == "std":
            result = grouped.std()
        elif agg_func == "var":
            result = grouped.var()
        elif isinstance(agg_func, dict):
            result = grouped.agg(agg_func)
        else:
            result = grouped.agg(agg_func)
        
        context.set_output("result", result)
        context.set_output("groups", list(grouped.groups.keys()))
        return result
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="DataFrame GroupBy",
            description="GroupBy 聚合操作",
            inputs=[
                PortDefinition(name="dataframe", port_type=PortType.GENERIC, description="輸入 DataFrame"),
                PortDefinition(name="by", port_type=PortType.GENERIC, description="分組欄位"),
                PortDefinition(name="agg_func", port_type=PortType.GENERIC, description="聚合函數"),
                PortDefinition(name="agg_columns", port_type=PortType.GENERIC, description="聚合欄位")
            ],
            outputs=[
                PortDefinition(name="result", port_type=PortType.GENERIC, description="聚合結果"),
                PortDefinition(name="groups", port_type=PortType.GENERIC, description="分組列表")
            ]
        )


class DataFrameMergeNode(NodeFunction):
    """合併 DataFrame 節點"""
    
    def execute(self, context: NodeContext) -> Any:
        left = context.get_input("left")
        right = context.get_input("right")
        on = context.get_input("on", None)
        left_on = context.get_input("left_on", None)
        right_on = context.get_input("right_on", None)
        how = context.get_input("how", "inner")  # inner, outer, left, right
        
        if not isinstance(left, pd.DataFrame) or not isinstance(right, pd.DataFrame):
            raise ValueError("Both inputs must be pandas DataFrames")
        
        # 執行合併
        if on:
            merged = pd.merge(left, right, on=on, how=how)
        elif left_on and right_on:
            merged = pd.merge(left, right, left_on=left_on, right_on=right_on, how=how)
        else:
            merged = pd.merge(left, right, how=how)
        
        context.set_output("dataframe", merged)
        context.set_output("shape", merged.shape)
        return merged
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="DataFrame Merge",
            description="合併兩個 DataFrame",
            inputs=[
                PortDefinition(name="left", port_type=PortType.GENERIC, description="左側 DataFrame"),
                PortDefinition(name="right", port_type=PortType.GENERIC, description="右側 DataFrame"),
                PortDefinition(name="on", port_type=PortType.GENERIC, description="合併鍵"),
                PortDefinition(name="left_on", port_type=PortType.GENERIC, description="左側鍵"),
                PortDefinition(name="right_on", port_type=PortType.GENERIC, description="右側鍵"),
                PortDefinition(name="how", port_type=PortType.STRING, description="合併方式")
            ],
            outputs=[
                PortDefinition(name="dataframe", port_type=PortType.GENERIC, description="合併後的 DataFrame"),
                PortDefinition(name="shape", port_type=PortType.GENERIC, description="維度")
            ]
        )


class DataFramePivotNode(NodeFunction):
    """Pivot 透視表節點"""
    
    def execute(self, context: NodeContext) -> Any:
        df = context.get_input("dataframe")
        index = context.get_input("index")
        columns = context.get_input("columns")
        values = context.get_input("values")
        agg_func = context.get_input("agg_func", "mean")
        
        if not isinstance(df, pd.DataFrame):
            raise ValueError("Input must be a pandas DataFrame")
        
        # 建立透視表
        pivot = pd.pivot_table(
            df, 
            values=values, 
            index=index, 
            columns=columns, 
            aggfunc=agg_func,
            fill_value=0
        )
        
        context.set_output("pivot_table", pivot)
        context.set_output("shape", pivot.shape)
        return pivot
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="DataFrame Pivot",
            description="建立透視表",
            inputs=[
                PortDefinition(name="dataframe", port_type=PortType.GENERIC, description="輸入 DataFrame"),
                PortDefinition(name="index", port_type=PortType.GENERIC, description="索引欄位"),
                PortDefinition(name="columns", port_type=PortType.GENERIC, description="欄位"),
                PortDefinition(name="values", port_type=PortType.GENERIC, description="值欄位"),
                PortDefinition(name="agg_func", port_type=PortType.GENERIC, description="聚合函數")
            ],
            outputs=[
                PortDefinition(name="pivot_table", port_type=PortType.GENERIC, description="透視表"),
                PortDefinition(name="shape", port_type=PortType.GENERIC, description="維度")
            ]
        )


class CSVWriterNode(NodeFunction):
    """寫入 CSV 檔案節點"""
    
    def execute(self, context: NodeContext) -> Any:
        df = context.get_input("dataframe")
        filepath = context.get_input("filepath")
        index = context.get_input("index", False)
        encoding = context.get_input("encoding", "utf-8")
        
        if not isinstance(df, pd.DataFrame):
            raise ValueError("Input must be a pandas DataFrame")
        
        # 寫入 CSV
        df.to_csv(filepath, index=index, encoding=encoding)
        
        context.set_output("filepath", filepath)
        context.set_output("rows_written", len(df))
        return filepath
    
    def get_metadata(self) -> NodeMetadata:
        return NodeMetadata(
            name="CSV Writer",
            description="將 DataFrame 寫入 CSV 檔案",
            inputs=[
                PortDefinition(name="dataframe", port_type=PortType.GENERIC, description="DataFrame"),
                PortDefinition(name="filepath", port_type=PortType.STRING, description="檔案路徑"),
                PortDefinition(name="index", port_type=PortType.BOOLEAN, description="寫入索引"),
                PortDefinition(name="encoding", port_type=PortType.STRING, description="編碼")
            ],
            outputs=[
                PortDefinition(name="filepath", port_type=PortType.STRING, description="檔案路徑"),
                PortDefinition(name="rows_written", port_type=PortType.NUMBER, description="寫入筆數")
            ]
        )


class PandasTopping(ToppingBase):
    """Pandas DataFrame 操作節點集合"""
    
    def get_nodes(self) -> List[NodeFunction]:
        return [
            DataFrameCreateNode(),
            CSVReaderNode(),
            DataFrameFilterNode(),
            DataFrameGroupByNode(),
            DataFrameMergeNode(),
            DataFramePivotNode(),
            CSVWriterNode()
        ]
    
    def get_namespace(self) -> str:
        return "pandas"
    
    def get_description(self) -> str:
        return "Pandas DataFrame 操作節點"
    
    def get_dependencies(self) -> List[str]:
        return ["pandas", "numpy"]


# Entry point for topping loader
def get_topping() -> ToppingBase:
    """取得 Pandas topping 實例"""
    return PandasTopping()
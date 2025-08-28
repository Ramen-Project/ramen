import click
import uvicorn
from pathlib import Path
import sys


@click.group()
def main():
    """Ramen Visual Programming Environment"""
    pass


@main.command()
@click.option('--port', default=8000, help='Server port')
@click.option('--host', default='127.0.0.1', help='Server host')
@click.option('--debug', is_flag=True, help='Enable debug mode')
def server(port: int, host: str, debug: bool):
    """Start the Ramen API server"""
    try:
        from ramen.main_api import app
        
        print(f"Starting Ramen server on {host}:{port}")
        if debug:
            print("Debug mode enabled")
        
        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level="debug" if debug else "info",
            reload=debug
        )
    except ImportError as e:
        print(f"Error importing Ramen API: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)


@main.command()
@click.argument('graph_path', type=click.Path(exists=True))
@click.option('--inputs', '-i', help='Input variables as JSON string')
@click.option('--output', '-o', help='Output file path for results')
@click.option('--compile-mode', type=click.Choice(['JIT', 'AOT']), default='JIT', help='Compilation mode')
@click.option('--verbose', '-v', is_flag=True, help='Verbose output')
def run(graph_path: str, inputs: str = None, output: str = None, compile_mode: str = 'JIT', verbose: bool = False):
    """Execute a Ramen graph file
    
    Examples:
        ramen-cli run graph.ramen
        ramen-cli run graph.ramen -i '{"x": 10, "y": 20}'
        ramen-cli run graph.ramen --compile-mode AOT -v
    """
    import json
    from pathlib import Path
    from ramen.loader import GraphLoader
    from ramen.engine import GraphExecutor, GraphCompiler, ExecutionContext
    from ramen.nodes import get_all_nodes
    
    try:
        # 載入圖形
        graph_file = Path(graph_path)
        if verbose:
            print(f"Loading graph from: {graph_file}")
        
        if not graph_file.suffix in ['.ramen', '.json']:
            print(f"Error: Unsupported file format. Use .ramen or .json files")
            sys.exit(1)
        
        # 使用 GraphLoader 載入圖形
        loader = GraphLoader()
        graph = loader.load_graph(str(graph_file))
        if verbose:
            print(f"Loaded graph: {graph.metadata.name} (ID: {graph.id})")
            print(f"Nodes: {len(graph.nodes)}, Edges: {len(graph.edges)}")
        
        # 解析輸入變數
        input_vars = {}
        if inputs:
            try:
                input_vars = json.loads(inputs)
                if verbose:
                    print(f"Input variables: {input_vars}")
            except json.JSONDecodeError as e:
                print(f"Error parsing inputs JSON: {e}")
                sys.exit(1)
        
        # 建立執行器並註冊節點
        executor = GraphExecutor(enable_async=False)
        for node_type, node_func in get_all_nodes().items():
            executor.register_node(node_type, node_func)
            if verbose:
                print(f"Registered node: {node_type}")
        
        # 註冊子圖形節點
        from ramen.nodes.subgraph import subgraph_node
        executor.register_node("builtin.subgraph", subgraph_node)
        if verbose:
            print(f"Registered node: builtin.subgraph")
        
        # 編譯圖形（如果需要）
        compiler = None
        if compile_mode:
            compiler = GraphCompiler(enable_cache=True)
            if verbose:
                print(f"Compiling graph with {compile_mode} mode...")
            compiled = compiler.compile(graph, mode=compile_mode)
            if verbose:
                print(f"Compilation completed")
        
        # 執行圖形
        if verbose:
            print(f"Executing graph...")
        
        context = ExecutionContext(graph_id=graph.id)
        result = executor.execute(graph, inputs=input_vars, context=context)
        
        # 輸出結果
        if result.success:
            print(f"✓ Execution completed successfully")
            
            # 顯示輸出
            if result.outputs:
                print("\nOutputs:")
                for node_id, outputs in result.outputs.items():
                    print(f"  {node_id}:")
                    for key, value in outputs.items():
                        print(f"    {key}: {value}")
            
            # 保存到檔案
            if output:
                output_data = {
                    "success": True,
                    "execution_id": result.context.execution_id,
                    "outputs": result.outputs,
                    "execution_time": result.context.execution_time
                }
                with open(output, 'w') as f:
                    json.dump(output_data, f, indent=2)
                print(f"\nResults saved to: {output}")
        else:
            print(f"✗ Execution failed")
            if result.errors:
                print("\nErrors:")
                for error in result.errors:
                    print(f"  - {error}")
            sys.exit(1)
        
        if verbose:
            print(f"\nExecution time: {result.context.execution_time:.3f}s")
            print(f"Nodes executed: {len(result.context.executed_nodes)}/{len(graph.nodes)}")
            
    except FileNotFoundError:
        print(f"Error: Graph file not found: {graph_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error executing graph: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
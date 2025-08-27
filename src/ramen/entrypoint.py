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
@click.argument('graph_name')
@click.option('--kwargs', help='Graph execution arguments as JSON')
def run(graph_name: str, kwargs: str = None):
    """Execute a Ramen graph"""
    print(f"Executing graph: {graph_name}")
    if kwargs:
        print(f"Arguments: {kwargs}")
    
    # TODO: Implement graph execution
    print("Graph execution not yet implemented")


if __name__ == "__main__":
    main()
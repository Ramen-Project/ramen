#!/usr/bin/env python
"""
Kernel Runtime - Executes inside isolated subprocess.

This module runs inside the kernel subprocess and handles graph execution.
"""

import argparse
import asyncio
import json
import logging
import sys
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

# Import execution components
from .compiler import GraphCompiler
from .context import ExecutionContext
from .executor import GraphExecutor
from ..core.models import ExecutionMode, RamenGraph
from ..topping import ToppingLoader, get_registry

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class KernelRuntime:
    """Runtime environment for kernel execution."""
    
    kernel_id: str
    project_path: Path
    debug: bool = False
    executor: Optional[GraphExecutor] = None
    compiler: Optional[GraphCompiler] = None
    topping_loader: Optional[ToppingLoader] = None
    
    def __post_init__(self):
        """Initialize runtime components."""
        self.compiler = GraphCompiler()
        self.executor = GraphExecutor()
        self.topping_loader = ToppingLoader()
        
    async def initialize(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Initialize kernel runtime.
        
        Args:
            config: Runtime configuration
            
        Returns:
            Initialization result
        """
        try:
            # Set up project environment
            sys.path.insert(0, str(self.project_path))
            
            # Load toppings from entry points
            loaded_toppings = []
            try:
                loaded_toppings = self.topping_loader.load_from_entry_points()
                logger.info(f"Loaded {len(loaded_toppings)} toppings from entry points")
            except Exception as e:
                logger.warning(f"Failed to load toppings from entry points: {e}")
            
            # External toppings are disabled to keep runtime lightweight
            # Only built-in nodes are available by default
            logger.info("External toppings disabled - using built-in nodes only")
            
            # Get available nodes from registry
            registry = get_registry()
            available_nodes = list(registry.get_all_nodes().keys())
            
            return {
                "status": "ready",
                "kernel_id": self.kernel_id,
                "project_path": str(self.project_path),
                "loaded_toppings": loaded_toppings,
                "available_nodes": available_nodes
            }
        except Exception as e:
            logger.error(f"Initialization failed: {e}")
            return {
                "error": str(e),
                "traceback": traceback.format_exc() if self.debug else None
            }
            
    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute graph.
        
        Args:
            params: Execution parameters including graph, variables, mode
            
        Returns:
            Execution result
        """
        try:
            # Parse graph
            graph_data = params.get("graph", {})
            graph = RamenGraph(**graph_data)
            
            # Get execution parameters
            variables = params.get("variables", {})
            mode = ExecutionMode(params.get("mode", "jit"))
            
            # Compile graph
            compiled_graph = await self.compiler.compile(graph, mode)
            
            # Create execution context
            context = ExecutionContext(
                graph=graph,
                variables=variables,
                mode=mode
            )
            
            # Execute graph
            result = await self.executor.execute(
                compiled_graph=compiled_graph,
                context=context
            )
            
            # Return results
            return {
                "success": True,
                "outputs": result.outputs,
                "execution_time": result.execution_time,
                "node_count": len(graph.nodes),
                "edge_count": len(graph.edges)
            }
            
        except Exception as e:
            logger.error(f"Execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__,
                "traceback": traceback.format_exc() if self.debug else None
            }
            
    async def shutdown(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Shutdown kernel runtime.
        
        Args:
            params: Shutdown parameters
            
        Returns:
            Shutdown result
        """
        logger.info("Shutting down kernel runtime")
        return {"status": "shutdown"}
        
    async def handle_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming message.
        
        Args:
            message: JSON-RPC message
            
        Returns:
            Response object
        """
        msg_id = message.get("id", "")
        method = message.get("method", "")
        params = message.get("params", {})
        
        try:
            # Route to handler
            if method == "initialize":
                result = await self.initialize(params)
            elif method == "execute":
                result = await self.execute(params)
            elif method == "shutdown":
                result = await self.shutdown(params)
            else:
                raise ValueError(f"Unknown method: {method}")
                
            # Return success response
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": result
            }
            
        except Exception as e:
            # Return error response
            logger.error(f"Message handling failed: {e}")
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {
                    "code": -32603,
                    "message": str(e),
                    "data": {
                        "traceback": traceback.format_exc() if self.debug else None
                    }
                }
            }


async def run_kernel(kernel_id: str, project_path: Path, debug: bool = False):
    """Run kernel event loop.
    
    Args:
        kernel_id: Kernel identifier
        project_path: Project root path
        debug: Enable debug mode
    """
    # Create runtime
    runtime = KernelRuntime(
        kernel_id=kernel_id,
        project_path=project_path,
        debug=debug
    )
    
    logger.info(f"Starting kernel runtime {kernel_id}")
    
    # Read messages from stdin
    loop = asyncio.get_event_loop()
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await loop.connect_read_pipe(lambda: protocol, sys.stdin)
    
    try:
        while True:
            # Read line from stdin
            line = await reader.readline()
            if not line:
                break
                
            line = line.decode().strip()
            if not line:
                continue
                
            try:
                # Parse message
                message = json.loads(line)
                
                # Handle message
                response = await runtime.handle_message(message)
                
                # Send response
                print(json.dumps(response), flush=True)
                
                # Check for shutdown
                if message.get("method") == "shutdown":
                    break
                    
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON: {e}")
                error_response = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {
                        "code": -32700,
                        "message": "Parse error",
                        "data": str(e)
                    }
                }
                print(json.dumps(error_response), flush=True)
            except Exception as e:
                logger.error(f"Unhandled error: {e}")
                if debug:
                    traceback.print_exc()
                    
    except KeyboardInterrupt:
        logger.info("Kernel interrupted")
    except Exception as e:
        logger.error(f"Kernel runtime error: {e}")
        if debug:
            traceback.print_exc()
    finally:
        logger.info("Kernel runtime stopped")


def main():
    """Main entry point for kernel runtime."""
    parser = argparse.ArgumentParser(description="Ramen Kernel Runtime")
    parser.add_argument("--kernel-id", required=True, help="Kernel identifier")
    parser.add_argument("--project-path", required=True, help="Project root path")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    
    args = parser.parse_args()
    
    # Run kernel
    asyncio.run(run_kernel(
        kernel_id=args.kernel_id,
        project_path=Path(args.project_path),
        debug=args.debug
    ))


if __name__ == "__main__":
    main()
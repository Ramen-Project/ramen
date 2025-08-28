"""
Kernel Process Manager for Ramen execution.

Manages isolated Python processes for graph execution with uv environment support.
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
import uuid
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from ..core.models import ExecutionMode, RamenGraph

logger = logging.getLogger(__name__)


class KernelState(Enum):
    """Kernel process states."""
    IDLE = "idle"
    STARTING = "starting"
    READY = "ready"
    EXECUTING = "executing"
    ERROR = "error"
    TERMINATED = "terminated"


@dataclass
class KernelConfig:
    """Configuration for kernel process."""
    project_path: Path
    python_executable: Optional[Path] = None
    timeout: float = 300.0  # 5 minutes default
    memory_limit: Optional[int] = None  # MB
    env_vars: Dict[str, str] = field(default_factory=dict)
    debug: bool = False


@dataclass
class KernelMessage:
    """Message for kernel communication."""
    id: str
    method: str
    params: Dict[str, Any]
    
    def to_json(self) -> str:
        """Convert message to JSON string."""
        return json.dumps({
            "jsonrpc": "2.0",
            "id": self.id,
            "method": self.method,
            "params": self.params
        })
    
    @classmethod
    def from_json(cls, data: str) -> "KernelMessage":
        """Parse JSON string to message."""
        obj = json.loads(data)
        return cls(
            id=obj.get("id", ""),
            method=obj.get("method", ""),
            params=obj.get("params", {})
        )


@dataclass
class KernelResponse:
    """Response from kernel process."""
    id: str
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    
    @classmethod
    def from_json(cls, data: str) -> "KernelResponse":
        """Parse JSON string to response."""
        obj = json.loads(data)
        return cls(
            id=obj.get("id", ""),
            result=obj.get("result"),
            error=obj.get("error")
        )


class KernelManager:
    """Manages kernel subprocess lifecycle and communication."""
    
    def __init__(self, config: KernelConfig):
        """Initialize kernel manager.
        
        Args:
            config: Kernel configuration
        """
        self.config = config
        self.state = KernelState.IDLE
        self.process: Optional[subprocess.Popen] = None
        self.kernel_id = str(uuid.uuid4())
        self._message_counter = 0
        self._pending_responses: Dict[str, asyncio.Future] = {}
        self._reader_task: Optional[asyncio.Task] = None
        self._writer_lock = asyncio.Lock()
        
    async def start(self) -> None:
        """Start kernel process in project environment."""
        if self.state != KernelState.IDLE:
            raise RuntimeError(f"Kernel already in state: {self.state}")
            
        self.state = KernelState.STARTING
        logger.info(f"\u555f\u52d5 kernel {self.kernel_id}")
        
        try:
            # Get Python executable from uv environment
            python_exec = self._get_python_executable()
            
            # Prepare kernel runtime module path
            kernel_runtime = Path(__file__).parent / "kernel_runtime.py"
            
            # Build command
            cmd = [
                str(python_exec),
                "-u",  # Unbuffered output
                str(kernel_runtime),
                "--kernel-id", self.kernel_id,
                "--project-path", str(self.config.project_path)
            ]
            
            if self.config.debug:
                cmd.append("--debug")
            
            # Prepare environment
            env = os.environ.copy()
            env.update(self.config.env_vars)
            env["PYTHONUNBUFFERED"] = "1"
            
            # Start subprocess
            self.process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                cwd=str(self.config.project_path),
                text=True
            )
            
            # Start reader task
            self._reader_task = asyncio.create_task(self._read_output())
            
            # Send initialization message
            response = await self._send_message("initialize", {
                "project_path": str(self.config.project_path),
                "config": {
                    "timeout": self.config.timeout,
                    "memory_limit": self.config.memory_limit,
                    "debug": self.config.debug
                }
            })
            
            if response.error:
                raise RuntimeError(f"Kernel initialization failed: {response.error}")
                
            self.state = KernelState.READY
            logger.info(f"Kernel {self.kernel_id} \u555f\u52d5\u6210\u529f")
            
        except Exception as e:
            self.state = KernelState.ERROR
            logger.error(f"Kernel \u555f\u52d5\u5931\u6557: {e}")
            await self.terminate()
            raise
    
    async def execute_graph(
        self,
        graph: RamenGraph,
        variables: Dict[str, Any],
        mode: ExecutionMode = ExecutionMode.JIT
    ) -> Dict[str, Any]:
        """Execute graph in kernel.
        
        Args:
            graph: Graph to execute
            variables: Input variables
            mode: Execution mode (JIT or AOT)
            
        Returns:
            Execution results
        """
        if self.state != KernelState.READY:
            raise RuntimeError(f"Kernel not ready: {self.state}")
            
        self.state = KernelState.EXECUTING
        
        try:
            # Send execution request
            response = await self._send_message("execute", {
                "graph": graph.model_dump(),
                "variables": variables,
                "mode": mode.value
            })
            
            if response.error:
                raise RuntimeError(f"Execution failed: {response.error}")
                
            self.state = KernelState.READY
            return response.result
            
        except Exception as e:
            self.state = KernelState.ERROR
            logger.error(f"Graph \u57f7\u884c\u5931\u6557: {e}")
            raise
            
    async def terminate(self) -> None:
        """Terminate kernel process."""
        if self.state == KernelState.TERMINATED:
            return
            
        logger.info(f"\u7d42\u6b62 kernel {self.kernel_id}")
        
        # Cancel reader task
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass
                
        # Send shutdown message if possible
        if self.state in (KernelState.READY, KernelState.EXECUTING):
            try:
                await self._send_message("shutdown", {}, timeout=5.0)
            except:
                pass
                
        # Terminate process
        if self.process:
            try:
                self.process.terminate()
                try:
                    await asyncio.wait_for(
                        asyncio.create_task(self._wait_process()),
                        timeout=5.0
                    )
                except asyncio.TimeoutError:
                    self.process.kill()
                    await self._wait_process()
            except:
                pass
                
            self.process = None
            
        self.state = KernelState.TERMINATED
        logger.info(f"Kernel {self.kernel_id} \u5df2\u7d42\u6b62")
        
    async def _send_message(
        self,
        method: str,
        params: Dict[str, Any],
        timeout: Optional[float] = None
    ) -> KernelResponse:
        """Send message to kernel and wait for response.
        
        Args:
            method: Method name
            params: Method parameters
            timeout: Response timeout
            
        Returns:
            Kernel response
        """
        if not self.process or not self.process.stdin:
            raise RuntimeError("Kernel process not running")
            
        # Generate message ID
        self._message_counter += 1
        msg_id = f"{self.kernel_id}-{self._message_counter}"
        
        # Create message
        message = KernelMessage(id=msg_id, method=method, params=params)
        
        # Create response future
        future = asyncio.Future()
        self._pending_responses[msg_id] = future
        
        try:
            # Send message
            async with self._writer_lock:
                self.process.stdin.write(message.to_json() + "\n")
                self.process.stdin.flush()
            
            # Wait for response
            if timeout:
                response = await asyncio.wait_for(future, timeout)
            else:
                response = await future
                
            return response
            
        except asyncio.TimeoutError:
            del self._pending_responses[msg_id]
            raise TimeoutError(f"Kernel response timeout for {method}")
        except Exception:
            if msg_id in self._pending_responses:
                del self._pending_responses[msg_id]
            raise
            
    async def _read_output(self) -> None:
        """Read and process kernel output."""
        if not self.process or not self.process.stdout:
            return
            
        try:
            while True:
                # Read line from stdout
                line = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self.process.stdout.readline
                )
                
                if not line:
                    break
                    
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    # Parse response
                    response = KernelResponse.from_json(line)
                    
                    # Find pending future
                    future = self._pending_responses.pop(response.id, None)
                    if future and not future.done():
                        future.set_result(response)
                        
                except json.JSONDecodeError:
                    # Handle non-JSON output (logs, prints, etc.)
                    logger.debug(f"Kernel output: {line}")
                except Exception as e:
                    logger.error(f"Error processing kernel output: {e}")
                    
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Reader task error: {e}")
            
    async def _wait_process(self) -> int:
        """Wait for process to terminate."""
        if not self.process:
            return 0
            
        return await asyncio.get_event_loop().run_in_executor(
            None,
            self.process.wait
        )
        
    def _get_python_executable(self) -> Path:
        """Get Python executable from uv environment.
        
        Returns:
            Path to Python executable
        """
        if self.config.python_executable:
            return self.config.python_executable
            
        # Try to find uv venv
        venv_path = self.config.project_path / ".venv"
        if venv_path.exists():
            if sys.platform == "win32":
                python_exec = venv_path / "Scripts" / "python.exe"
            else:
                python_exec = venv_path / "bin" / "python"
                
            if python_exec.exists():
                return python_exec
                
        # Fallback to system Python
        return Path(sys.executable)
        
    @property
    def is_running(self) -> bool:
        """Check if kernel is running."""
        return self.process is not None and self.process.poll() is None
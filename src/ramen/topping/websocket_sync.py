"""WebSocket state synchronization for advanced nodes."""

import json
import asyncio
from typing import Dict, List, Any, Optional, Set
from weakref import WeakSet
from fastapi import WebSocket
from datetime import datetime
import uuid
import logging

from ramen.topping.performance import (
    get_node_registry, get_state_batcher, get_performance_monitor,
    performance_timer
)

logger = logging.getLogger(__name__)


class NodeStateManager:
    """Manages state synchronization for individual nodes."""
    
    def __init__(self, node_id: str):
        self.node_id = node_id
        self.node_instance = None
        self.connections: Set[WebSocket] = set()
        self.last_state = {}
        
    def register_node(self, node_instance):
        """Register a node instance for state management."""
        self.node_instance = node_instance
        
        # Override the sync method
        if hasattr(node_instance, '_sync_state_to_frontend'):
            node_instance._sync_state_to_frontend = self._sync_state_to_frontend
            
    def add_connection(self, websocket: WebSocket):
        """Add a WebSocket connection for this node."""
        self.connections.add(websocket)
        
        # Send initial state if available
        if self.node_instance and hasattr(self.node_instance, 'state'):
            asyncio.create_task(self._send_initial_state(websocket))
    
    def remove_connection(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        self.connections.discard(websocket)
    
    async def _send_initial_state(self, websocket: WebSocket):
        """Send initial state to a new connection."""
        try:
            if self.node_instance and hasattr(self.node_instance, 'state'):
                state_data = self.node_instance.state.dict()
                await websocket.send_json({
                    "type": "node_state_init",
                    "node_id": self.node_id,
                    "state": state_data,
                    "timestamp": datetime.now().isoformat()
                })
        except Exception as e:
            logger.error(f"Failed to send initial state: {e}")
    
    def _sync_state_to_frontend(self):
        """Sync current state to all connected clients."""
        if not self.node_instance or not hasattr(self.node_instance, 'state'):
            return
            
        try:
            current_state = self.node_instance.state.dict()
            
            # Only send if state has changed
            if current_state != self.last_state:
                asyncio.create_task(self._broadcast_state_update(current_state))
                self.last_state = current_state.copy()
                
        except Exception as e:
            logger.error(f"State sync error: {e}")
    
    async def _broadcast_state_update(self, state_data: dict):
        """Broadcast state update to all connections."""
        if not self.connections:
            return
            
        message = {
            "type": "node_state_update", 
            "node_id": self.node_id,
            "state": state_data,
            "timestamp": datetime.now().isoformat()
        }
        
        # Send to all connections, remove failed ones
        failed_connections = set()
        for websocket in self.connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
                failed_connections.add(websocket)
        
        # Clean up failed connections
        self.connections -= failed_connections


class WebSocketStateManager:
    """Global manager for WebSocket state synchronization."""
    
    def __init__(self):
        self.node_managers: Dict[str, NodeStateManager] = {}
        self.connection_to_nodes: Dict[WebSocket, Set[str]] = {}
        
    def register_node(self, node_id: str, node_instance):
        """Register a node for state management."""
        if node_id not in self.node_managers:
            self.node_managers[node_id] = NodeStateManager(node_id)
        
        self.node_managers[node_id].register_node(node_instance)
        logger.info(f"Registered node {node_id} for state sync")
    
    def subscribe_to_node(self, websocket: WebSocket, node_id: str):
        """Subscribe a WebSocket connection to a node's state updates."""
        if node_id not in self.node_managers:
            self.node_managers[node_id] = NodeStateManager(node_id)
        
        self.node_managers[node_id].add_connection(websocket)
        
        # Track connection to nodes mapping
        if websocket not in self.connection_to_nodes:
            self.connection_to_nodes[websocket] = set()
        self.connection_to_nodes[websocket].add(node_id)
        
        logger.debug(f"WebSocket subscribed to node {node_id}")
    
    def unsubscribe_from_node(self, websocket: WebSocket, node_id: str):
        """Unsubscribe a WebSocket connection from a node."""
        if node_id in self.node_managers:
            self.node_managers[node_id].remove_connection(websocket)
        
        if websocket in self.connection_to_nodes:
            self.connection_to_nodes[websocket].discard(node_id)
    
    def disconnect_websocket(self, websocket: WebSocket):
        """Handle WebSocket disconnection."""
        if websocket in self.connection_to_nodes:
            # Unsubscribe from all nodes
            for node_id in self.connection_to_nodes[websocket].copy():
                self.unsubscribe_from_node(websocket, node_id)
            
            del self.connection_to_nodes[websocket]
        
        logger.debug("WebSocket disconnected from state sync")
    
    async def handle_event(self, websocket: WebSocket, message: dict):
        """Handle incoming events from frontend."""
        try:
            event_type = message.get("type")
            node_id = message.get("node_id")
            
            if event_type == "subscribe_node" and node_id:
                self.subscribe_to_node(websocket, node_id)
                
            elif event_type == "unsubscribe_node" and node_id:
                self.unsubscribe_from_node(websocket, node_id)
                
            elif event_type == "node_event" and node_id:
                # Forward event to node
                await self._forward_event_to_node(node_id, message)
                
        except Exception as e:
            logger.error(f"Error handling WebSocket event: {e}")
            await websocket.send_json({
                "type": "error",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            })
    
    async def _forward_event_to_node(self, node_id: str, message: dict):
        """Forward an event to the appropriate node."""
        if node_id not in self.node_managers:
            return
        
        node_manager = self.node_managers[node_id]
        if not node_manager.node_instance:
            return
        
        # Extract event details
        event_name = message.get("event_name")
        event_data = message.get("event_data", {})
        
        if hasattr(node_manager.node_instance, 'handle_event'):
            try:
                # Handle event synchronously for now
                result = node_manager.node_instance.handle_event(event_name, event_data)
                logger.debug(f"Event {event_name} handled for node {node_id}")
            except Exception as e:
                logger.error(f"Error handling event {event_name} for node {node_id}: {e}")


# Global state manager instance
state_manager = WebSocketStateManager()


def get_state_manager() -> WebSocketStateManager:
    """Get the global state manager instance."""
    return state_manager
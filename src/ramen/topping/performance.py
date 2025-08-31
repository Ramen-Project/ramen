"""Performance optimizations for topping system."""

import functools
import weakref
import gc
import time
import logging
from typing import Dict, Any, Optional, Set, Callable
from collections import defaultdict, deque
from threading import RLock

logger = logging.getLogger(__name__)


class LRUCache:
    """Thread-safe LRU Cache for topping metadata and components."""
    
    def __init__(self, max_size: int = 128):
        self.max_size = max_size
        self.cache: Dict[str, Any] = {}
        self.access_order = deque()
        self.lock = RLock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache."""
        with self.lock:
            if key in self.cache:
                # Move to end (most recent)
                self.access_order.remove(key)
                self.access_order.append(key)
                return self.cache[key]
            return None
    
    def set(self, key: str, value: Any) -> None:
        """Set item in cache."""
        with self.lock:
            if key in self.cache:
                # Update existing
                self.access_order.remove(key)
            elif len(self.cache) >= self.max_size:
                # Evict least recently used
                oldest_key = self.access_order.popleft()
                del self.cache[oldest_key]
            
            self.cache[key] = value
            self.access_order.append(key)
    
    def clear(self) -> None:
        """Clear cache."""
        with self.lock:
            self.cache.clear()
            self.access_order.clear()
    
    def size(self) -> int:
        """Get current cache size."""
        return len(self.cache)


class WeakNodeRegistry:
    """Weak reference registry for node instances to prevent memory leaks."""
    
    def __init__(self):
        self.nodes: Dict[str, weakref.ref] = {}
        self.lock = RLock()
    
    def register(self, node_id: str, node_instance) -> None:
        """Register a node with weak reference."""
        with self.lock:
            # Clean up dead references first
            self._cleanup_dead_references()
            
            # Create weak reference with cleanup callback
            def cleanup_callback(ref):
                with self.lock:
                    if node_id in self.nodes and self.nodes[node_id] is ref:
                        del self.nodes[node_id]
                        logger.debug(f"Cleaned up dead reference for node {node_id}")
            
            self.nodes[node_id] = weakref.ref(node_instance, cleanup_callback)
    
    def get(self, node_id: str):
        """Get node instance if still alive."""
        with self.lock:
            if node_id in self.nodes:
                node_ref = self.nodes[node_id]
                node_instance = node_ref()
                if node_instance is not None:
                    return node_instance
                else:
                    # Dead reference, clean up
                    del self.nodes[node_id]
            return None
    
    def _cleanup_dead_references(self) -> None:
        """Remove dead weak references."""
        dead_keys = []
        for node_id, node_ref in self.nodes.items():
            if node_ref() is None:
                dead_keys.append(node_id)
        
        for key in dead_keys:
            del self.nodes[key]
    
    def cleanup(self) -> int:
        """Manual cleanup of dead references."""
        with self.lock:
            initial_size = len(self.nodes)
            self._cleanup_dead_references()
            cleaned = initial_size - len(self.nodes)
            if cleaned > 0:
                logger.info(f"Cleaned up {cleaned} dead node references")
            return cleaned
    
    def size(self) -> int:
        """Get number of registered nodes."""
        return len(self.nodes)


class StateUpdateBatcher:
    """Batch state updates to reduce WebSocket traffic."""
    
    def __init__(self, batch_size: int = 10, flush_interval: float = 0.1):
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.pending_updates: Dict[str, Dict[str, Any]] = {}
        self.last_flush = time.time()
        self.lock = RLock()
        self.flush_callbacks: list[Callable] = []
    
    def add_update(self, node_id: str, state_update: Dict[str, Any]) -> None:
        """Add a state update to the batch."""
        with self.lock:
            if node_id not in self.pending_updates:
                self.pending_updates[node_id] = {}
            
            # Merge updates
            self.pending_updates[node_id].update(state_update)
            
            # Check if we should flush
            if (len(self.pending_updates) >= self.batch_size or
                time.time() - self.last_flush >= self.flush_interval):
                self._flush()
    
    def add_flush_callback(self, callback: Callable) -> None:
        """Add callback to be called when flushing."""
        self.flush_callbacks.append(callback)
    
    def _flush(self) -> None:
        """Flush pending updates."""
        if not self.pending_updates:
            return
        
        updates_to_send = self.pending_updates.copy()
        self.pending_updates.clear()
        self.last_flush = time.time()
        
        # Call flush callbacks
        for callback in self.flush_callbacks:
            try:
                callback(updates_to_send)
            except Exception as e:
                logger.error(f"Error in flush callback: {e}")
    
    def force_flush(self) -> None:
        """Force flush all pending updates."""
        with self.lock:
            self._flush()


class PerformanceMonitor:
    """Monitor performance metrics of the topping system."""
    
    def __init__(self):
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.start_times: Dict[str, float] = {}
        self.lock = RLock()
    
    def start_timing(self, operation: str) -> None:
        """Start timing an operation."""
        self.start_times[operation] = time.time()
    
    def end_timing(self, operation: str) -> float:
        """End timing an operation and record the duration."""
        if operation not in self.start_times:
            return 0.0
        
        duration = time.time() - self.start_times[operation]
        del self.start_times[operation]
        
        with self.lock:
            self.metrics[operation].append(duration)
        
        return duration
    
    def record_metric(self, name: str, value: float) -> None:
        """Record a custom metric."""
        with self.lock:
            self.metrics[name].append(value)
    
    def get_average(self, metric: str) -> float:
        """Get average value for a metric."""
        with self.lock:
            values = list(self.metrics[metric])
            return sum(values) / len(values) if values else 0.0
    
    def get_stats(self) -> Dict[str, Dict[str, float]]:
        """Get comprehensive stats for all metrics."""
        stats = {}
        with self.lock:
            for metric, values in self.metrics.items():
                if values:
                    values_list = list(values)
                    stats[metric] = {
                        "count": len(values_list),
                        "average": sum(values_list) / len(values_list),
                        "min": min(values_list),
                        "max": max(values_list),
                        "recent": values_list[-1] if values_list else 0.0
                    }
        return stats


def performance_timer(metric_name: str):
    """Decorator to time function execution."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            monitor = get_performance_monitor()
            monitor.start_timing(metric_name)
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = monitor.end_timing(metric_name)
                if duration > 0.1:  # Log slow operations
                    logger.debug(f"Slow operation {metric_name}: {duration:.3f}s")
        return wrapper
    return decorator


def memory_efficient_cache(max_size: int = 128):
    """Decorator for memory-efficient caching."""
    cache = LRUCache(max_size)
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from arguments
            key = str(hash((args, tuple(sorted(kwargs.items())))))
            
            # Try cache first
            result = cache.get(key)
            if result is not None:
                return result
            
            # Compute and cache result
            result = func(*args, **kwargs)
            cache.set(key, result)
            return result
        
        # Add cache management methods
        wrapper.cache_clear = cache.clear
        wrapper.cache_size = cache.size
        return wrapper
    return decorator


# Global instances
_metadata_cache = LRUCache(max_size=256)
_component_cache = LRUCache(max_size=128)
_node_registry = WeakNodeRegistry()
_state_batcher = StateUpdateBatcher()
_performance_monitor = PerformanceMonitor()


def get_metadata_cache() -> LRUCache:
    """Get global metadata cache."""
    return _metadata_cache


def get_component_cache() -> LRUCache:
    """Get global component cache."""
    return _component_cache


def get_node_registry() -> WeakNodeRegistry:
    """Get global node registry."""
    return _node_registry


def get_state_batcher() -> StateUpdateBatcher:
    """Get global state update batcher."""
    return _state_batcher


def get_performance_monitor() -> PerformanceMonitor:
    """Get global performance monitor."""
    return _performance_monitor


def cleanup_memory() -> Dict[str, int]:
    """Perform comprehensive memory cleanup."""
    stats = {}
    
    # Clean up node registry
    stats['dead_nodes_cleaned'] = _node_registry.cleanup()
    
    # Force garbage collection
    before_gc = len(gc.get_objects())
    collected = gc.collect()
    after_gc = len(gc.get_objects())
    
    stats['gc_collected'] = collected
    stats['objects_before_gc'] = before_gc
    stats['objects_after_gc'] = after_gc
    stats['objects_freed'] = before_gc - after_gc
    
    # Cache stats
    stats['metadata_cache_size'] = _metadata_cache.size()
    stats['component_cache_size'] = _component_cache.size()
    
    logger.info(f"Memory cleanup completed: {stats}")
    return stats


def get_system_stats() -> Dict[str, Any]:
    """Get comprehensive system statistics."""
    return {
        "performance": _performance_monitor.get_stats(),
        "caches": {
            "metadata_cache_size": _metadata_cache.size(),
            "component_cache_size": _component_cache.size(),
        },
        "nodes": {
            "registered_nodes": _node_registry.size(),
        },
        "state_updates": {
            "pending_updates": len(_state_batcher.pending_updates),
        },
        "memory": {
            "gc_objects": len(gc.get_objects()),
        }
    }
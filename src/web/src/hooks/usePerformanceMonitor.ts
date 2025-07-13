import { useCallback, useRef, useState, useEffect } from 'react';
import { PerformanceConfig, PerformanceAlert, DEFAULT_PERFORMANCE_CONFIG } from '../types/performance';

interface PerformanceMetrics {
  dragDuration: number;
  frameRate: number;
  memoryUsage: number;
  operationCount: number;
  slowOperations: number;
  averageDragTime: number;
  alerts: PerformanceAlert[];
}

interface DragSession {
  startTime: number;
  operations: number;
  slowOps: number;
  totalTime: number;
}

export function usePerformanceMonitor(config: Partial<PerformanceConfig> = {}) {
  const finalConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    dragDuration: 0,
    frameRate: 0,
    memoryUsage: 0,
    operationCount: 0,
    slowOperations: 0,
    averageDragTime: 0,
    alerts: []
  });

  const sessionRef = useRef<DragSession | null>(null);
  const historyRef = useRef<number[]>([]);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const alertsRef = useRef<PerformanceAlert[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const addAlert = useCallback((alert: PerformanceAlert) => {
    if (alertsRef.current.length >= 50) {
      alertsRef.current.shift(); // Keep only last 50 alerts
    }
    alertsRef.current.push(alert);
    setMetrics(prev => ({ ...prev, alerts: [...alertsRef.current] }));
  }, []);

  const getMemoryUsage = useCallback(() => {
    try {
      // Check if performance.memory is available (Chrome/Edge only)
      if (typeof performance !== 'undefined' && 
          'memory' in performance && 
          performance.memory && 
          'usedJSHeapSize' in performance.memory) {
        return (performance.memory as any).usedJSHeapSize / 1024 / 1024; // MB
      }
    } catch (error) {
      // Silently handle any errors accessing performance.memory
      console.debug('Performance memory API not available:', error);
    }
    return 0; // Return 0 if memory API is not available
  }, []);

  const updateFrameRate = useCallback(() => {
    if (!finalConfig.enabled) return;
    
    frameCountRef.current++;
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    
    if (delta >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / delta);
      
      // Check for low FPS warning
      if (finalConfig.warnOnLowFPS && fps < finalConfig.fpsThreshold) {
        addAlert({
          type: 'warning',
          message: `Low frame rate detected: ${fps} FPS`,
          timestamp: now,
          operation: 'frameRate'
        });
      }
      
      setMetrics(prev => ({ ...prev, frameRate: fps }));
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
  }, [finalConfig.enabled, finalConfig.warnOnLowFPS, finalConfig.fpsThreshold, addAlert]);

  // Continuous frame rate monitoring
  const frameRateLoop = useCallback(() => {
    if (!finalConfig.enabled) return;
    
    updateFrameRate();
    animationFrameRef.current = requestAnimationFrame(frameRateLoop);
  }, [finalConfig.enabled, updateFrameRate]);

  // Start/stop frame rate monitoring
  useEffect(() => {
    if (finalConfig.enabled) {
      frameCountRef.current = 0;
      lastFrameTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(frameRateLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [finalConfig.enabled, frameRateLoop]);

  const startDragSession = useCallback(() => {
    if (!finalConfig.enabled || Math.random() > finalConfig.sampleRate) return;
    
    sessionRef.current = {
      startTime: performance.now(),
      operations: 0,
      slowOps: 0,
      totalTime: 0
    };
  }, [finalConfig.enabled, finalConfig.sampleRate]);

  const trackOperation = useCallback((operationName: string, fn: () => void) => {
    if (!finalConfig.enabled || !sessionRef.current) {
      fn();
      return;
    }

    const startTime = performance.now();
    fn();
    const duration = performance.now() - startTime;
    
    sessionRef.current.operations++;
    sessionRef.current.totalTime += duration;
    
    if (duration > finalConfig.slowThreshold) {
      sessionRef.current.slowOps++;
      
      if (finalConfig.warnOnSlowDrag) {
        addAlert({
          type: 'warning',
          message: `Slow operation: ${operationName}`,
          timestamp: performance.now(),
          operation: operationName,
          duration
        });
      }
      
      console.warn(`Slow drag operation: ${operationName} took ${duration.toFixed(2)}ms`);
    }
  }, [finalConfig.enabled, finalConfig.slowThreshold, finalConfig.warnOnSlowDrag, addAlert]);

  const endDragSession = useCallback(() => {
    if (!finalConfig.enabled || !sessionRef.current) return;
    
    const totalDuration = performance.now() - sessionRef.current.startTime;
    const session = sessionRef.current;
    
    // Update history
    historyRef.current.push(totalDuration);
    if (historyRef.current.length > finalConfig.maxHistorySize) {
      historyRef.current.shift();
    }
    
    // Calculate average
    const avgTime = historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length;
    const memoryUsage = getMemoryUsage();
    
    // Check memory usage warning (only if memory API is available)
    if (memoryUsage > 0 && memoryUsage > finalConfig.memoryWarningThreshold) {
      addAlert({
        type: 'warning',
        message: `High memory usage: ${memoryUsage.toFixed(1)}MB`,
        timestamp: performance.now(),
        operation: 'memory'
      });
    }
    
    setMetrics(prev => ({
      ...prev,
      dragDuration: totalDuration,
      operationCount: session.operations,
      slowOperations: session.slowOps,
      averageDragTime: avgTime,
      memoryUsage
    }));
    
    if (totalDuration > finalConfig.slowThreshold * 3) {
      if (finalConfig.warnOnSlowDrag) {
        addAlert({
          type: 'error',
          message: `Very slow drag session: ${totalDuration.toFixed(2)}ms`,
          timestamp: performance.now(),
          operation: 'dragSession',
          duration: totalDuration
        });
      }
      console.warn(`Slow drag session: ${totalDuration.toFixed(2)}ms with ${session.slowOps} slow operations`);
    }
    
    sessionRef.current = null;
  }, [finalConfig.enabled, finalConfig.slowThreshold, finalConfig.maxHistorySize, finalConfig.memoryWarningThreshold, finalConfig.warnOnSlowDrag, getMemoryUsage, addAlert]);

  const measureAsync = useCallback(async <T>(operationName: string, fn: () => Promise<T>): Promise<T> => {
    if (!finalConfig.enabled || !sessionRef.current) {
      return fn();
    }

    const startTime = performance.now();
    const result = await fn();
    const duration = performance.now() - startTime;
    
    sessionRef.current.operations++;
    sessionRef.current.totalTime += duration;
    
    if (duration > finalConfig.slowThreshold) {
      sessionRef.current.slowOps++;
      console.warn(`Slow async drag operation: ${operationName} took ${duration.toFixed(2)}ms`);
    }

    return result;
  }, [finalConfig.enabled, finalConfig.slowThreshold]);

  const reset = useCallback(() => {
    historyRef.current = [];
    alertsRef.current = [];
    frameCountRef.current = 0;
    lastFrameTimeRef.current = performance.now();
    setMetrics({
      dragDuration: 0,
      frameRate: 0,
      memoryUsage: 0,
      operationCount: 0,
      slowOperations: 0,
      averageDragTime: 0,
      alerts: []
    });
  }, []);

  return {
    metrics,
    startDragSession,
    trackOperation,
    endDragSession,
    measureAsync,
    reset,
    isEnabled: finalConfig.enabled
  };
}

export type { PerformanceMetrics };
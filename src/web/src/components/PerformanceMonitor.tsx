import React, { useState, useCallback } from 'react';
import { PerformanceMetrics } from '../hooks/usePerformanceMonitor';

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics;
  isEnabled: boolean;
  onReset: () => void;
  className?: string;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  metrics,
  isEnabled,
  onReset,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDuration = useCallback((ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }, []);

  const formatMemory = useCallback((mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)}KB`;
    if (mb < 1024) return `${mb.toFixed(1)}MB`;
    return `${(mb / 1024).toFixed(2)}GB`;
  }, []);

  const getPerformanceColor = useCallback((value: number, threshold: number) => {
    if (value < threshold * 0.5) return '#22c55e'; // green
    if (value < threshold) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  }, []);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className={`performance-monitor ${className}`} style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '11px',
      fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      zIndex: 1000,
      minWidth: '220px',
      backdropFilter: 'blur(6px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        marginBottom: isExpanded ? '8px' : '0'
      }} onClick={() => setIsExpanded(!isExpanded)}>
        <span style={{ fontWeight: 'bold' }}>Performance Monitor</span>
        <span>{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div style={{ lineHeight: '1.4' }}>
          <div style={{ marginBottom: '6px' }}>
            <div style={{ 
              color: getPerformanceColor(metrics.dragDuration, 100),
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Last Drag:</span>
              <span>{formatDuration(metrics.dragDuration)}</span>
            </div>
          </div>

          <div style={{ marginBottom: '6px' }}>
            <div style={{ 
              color: getPerformanceColor(metrics.averageDragTime, 50),
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Avg Drag:</span>
              <span>{formatDuration(metrics.averageDragTime)}</span>
            </div>
          </div>

          <div style={{ marginBottom: '6px' }}>
            <div style={{ 
              color: metrics.frameRate < 30 ? '#ef4444' : metrics.frameRate < 50 ? '#f59e0b' : '#22c55e',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Frame Rate:</span>
              <span>{metrics.frameRate} FPS</span>
            </div>
          </div>

          <div style={{ marginBottom: '6px' }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Memory:</span>
              <span>{formatMemory(metrics.memoryUsage)}</span>
            </div>
          </div>

          <div style={{ marginBottom: '6px' }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Operations:</span>
              <span>{metrics.operationCount}</span>
            </div>
          </div>

          {metrics.slowOperations > 0 && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ 
                color: '#ef4444',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Slow Ops:</span>
                <span>{metrics.slowOperations}</span>
              </div>
            </div>
          )}

          {metrics.alerts && metrics.alerts.length > 0 && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ 
                color: '#f59e0b',
                marginBottom: '2px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                Recent Alerts ({metrics.alerts.length}):
              </div>
              <div style={{ 
                maxHeight: '80px',
                overflowY: 'auto',
                fontSize: '10px',
                lineHeight: '1.2'
              }}>
                {metrics.alerts.slice(-3).reverse().map((alert, index) => (
                  <div key={index} style={{ 
                    color: alert.type === 'error' ? '#ef4444' : '#f59e0b',
                    marginBottom: '2px',
                    padding: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px'
                  }}>
                    <div>{alert.message}</div>
                    {alert.duration && (
                      <div style={{ color: '#9ca3af' }}>
                        {formatDuration(alert.duration)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ 
            borderTop: '1px solid #374151',
            paddingTop: '6px',
            marginTop: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              style={{
                background: '#374151',
                border: 'none',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
            
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>
              16ms budget
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
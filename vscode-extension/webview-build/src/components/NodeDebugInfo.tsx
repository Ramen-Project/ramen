import React, { useState, useCallback } from 'react';
import { Node } from '@xyflow/react';

interface NodeDebugInfoProps {
  selectedNode: Node | null;
  isEnabled: boolean;
  className?: string;
}

const NodeDebugInfo: React.FC<NodeDebugInfoProps> = ({
  selectedNode,
  isEnabled,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatJSON = useCallback((obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return String(obj);
    }
  }, []);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className={`node-debug-info ${className}`} style={{
      position: 'absolute',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '11px',
      fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      zIndex: 1000,
      minWidth: '280px',
      maxWidth: '400px',
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
        <span style={{ fontWeight: 'bold' }}>Node Debug Info</span>
        <span>{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div style={{ lineHeight: '1.4' }}>
          {!selectedNode ? (
            <div style={{
              color: '#9ca3af',
              fontStyle: 'italic',
              padding: '10px 0',
              textAlign: 'center'
            }}>
              No node selected
            </div>
          ) : (
            <>
              {/* Basic Info Section */}
              <div style={{
                borderBottom: '1px solid #374151',
                paddingBottom: '6px',
                marginBottom: '6px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '2px'
                }}>
                  <span style={{ color: '#60a5fa' }}>ID:</span>
                  <span style={{
                    color: '#fff',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>{selectedNode.id}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '2px'
                }}>
                  <span style={{ color: '#60a5fa' }}>Type:</span>
                  <span style={{ color: '#22c55e' }}>{selectedNode.type || 'default'}</span>
                </div>
                {selectedNode.data?.name && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '2px'
                  }}>
                    <span style={{ color: '#60a5fa' }}>Name:</span>
                    <span>{selectedNode.data.name}</span>
                  </div>
                )}
                {selectedNode.data?.namespace && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '2px'
                  }}>
                    <span style={{ color: '#60a5fa' }}>Namespace:</span>
                    <span style={{ color: '#f59e0b' }}>{selectedNode.data.namespace}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '2px'
                }}>
                  <span style={{ color: '#60a5fa' }}>Position:</span>
                  <span>({selectedNode.position.x.toFixed(0)}, {selectedNode.position.y.toFixed(0)})</span>
                </div>
              </div>

              {/* Inputs/Outputs Section */}
              {(selectedNode.data?.inputs || selectedNode.data?.outputs) && (
                <div style={{
                  borderBottom: '1px solid #374151',
                  paddingBottom: '6px',
                  marginBottom: '6px'
                }}>
                  {selectedNode.data.inputs && (
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{
                        color: '#60a5fa',
                        fontWeight: 'bold',
                        marginBottom: '2px'
                      }}>
                        Inputs: {selectedNode.data.inputs.length}
                      </div>
                      {selectedNode.data.inputs.map((input: any, idx: number) => (
                        <div key={idx} style={{
                          marginLeft: '10px',
                          fontSize: '10px',
                          color: '#d1d5db'
                        }}>
                          • {input.name}: <span style={{ color: '#f59e0b' }}>{input.type || input.typeId || 'any'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedNode.data.outputs && (
                    <div>
                      <div style={{
                        color: '#60a5fa',
                        fontWeight: 'bold',
                        marginBottom: '2px'
                      }}>
                        Outputs: {selectedNode.data.outputs.length}
                      </div>
                      {selectedNode.data.outputs.map((output: any, idx: number) => (
                        <div key={idx} style={{
                          marginLeft: '10px',
                          fontSize: '10px',
                          color: '#d1d5db'
                        }}>
                          • {output.name}: <span style={{ color: '#22c55e' }}>{output.type || output.typeId || 'any'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Custom Data Section */}
              {selectedNode.data && Object.keys(selectedNode.data).length > 0 && (
                <div>
                  <div style={{
                    color: '#60a5fa',
                    fontWeight: 'bold',
                    marginBottom: '4px'
                  }}>
                    Custom Data:
                  </div>
                  <pre style={{
                    margin: 0,
                    padding: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '4px',
                    fontSize: '9px',
                    lineHeight: '1.3',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    color: '#d1d5db',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {formatJSON(selectedNode.data)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NodeDebugInfo;

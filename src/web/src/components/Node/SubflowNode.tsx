import React from 'react';
import { NodeProps } from '@xyflow/react';
import { SubflowNodeData } from './types';
import './SubflowNode.css';

const SubflowNode: React.FC<NodeProps> = ({ data, selected }) => {
  const subflowData = data as SubflowNodeData;

  return (
    <div
      className={`subflow-node ${selected ? 'selected' : ''}`}
      style={{
        width: subflowData.width || 300,
        height: subflowData.height || 200,
        backgroundColor: subflowData.backgroundColor || 'rgba(255, 193, 7, 0.1)',
        border: `2px solid ${selected ? '#ff6b6b' : '#ffc107'}`,
        borderRadius: '8px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px',
        boxShadow: selected ? '0 0 10px rgba(255, 107, 107, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Subflow Title */}
      <div
        className="subflow-title"
        style={{
          position: 'absolute',
          top: '-12px',
          left: '12px',
          backgroundColor: '#ffc107',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          color: 'white',
          border: `1px solid ${selected ? '#ff6b6b' : '#ffc107'}`,
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        {subflowData.label || 'Subflow'}
      </div>

      {/* Subflow Content Area */}
      <div
        className="subflow-content-area subflow-content"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '14px',
          fontStyle: 'italic',
          marginTop: '8px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div>子流程</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            {subflowData.childCount ? `${subflowData.childCount} 個節點` : '空子流程'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubflowNode; 
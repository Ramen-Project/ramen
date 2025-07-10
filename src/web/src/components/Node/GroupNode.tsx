import React from 'react';
import { NodeProps } from '@xyflow/react';
import { GroupNodeData } from './types';

const GroupNode: React.FC<NodeProps> = ({ data, selected }) => {
  const groupData = data as GroupNodeData;
  return (
    <div
      className={`group-node ${selected ? 'selected' : ''}`}
      style={{
        width: groupData.width || 300,
        height: groupData.height || 200,
        backgroundColor: groupData.backgroundColor || 'rgba(0, 150, 255, 0.1)',
        border: `2px solid ${selected ? '#ff6b6b' : '#0096ff'}`,
        borderRadius: '8px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px',
        boxShadow: selected ? '0 0 10px rgba(255, 107, 107, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Group Title */}
      <div
        style={{
          position: 'absolute',
          top: '-12px',
          left: '12px',
          backgroundColor: '#fff',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#0096ff',
          border: `1px solid ${selected ? '#ff6b6b' : '#0096ff'}`,
          zIndex: 10,
          pointerEvents: 'auto', // 標題可選中
        }}
      >
        {groupData.label || 'Group'}
      </div>

      {/* Group Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '14px',
          fontStyle: 'italic',
        }}
      >
        {groupData.childCount ? `${groupData.childCount} nodes` : 'Empty group'}
      </div>


    </div>
  );
};

export default GroupNode; 
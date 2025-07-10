import React from 'react';
import { Node } from '@xyflow/react';

interface ToolbarProps {
  selectedNodeIds: string[];
  nodes: Node[];
  onCreateSubflow: () => void;
  onUngroupSubflow: () => void;
  onAutoResizeSubflow: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  selectedNodeIds,
  nodes,
  onCreateSubflow,
  onUngroupSubflow,
  onAutoResizeSubflow
}) => {
  const hasSelectedSubflow = selectedNodeIds.some(id => 
    nodes.find(node => node.id === id)?.type === 'subflow'
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1000,
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        gap: '8px',
        flexDirection: 'column'
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>
        子流程工具
      </div>
      
      <button
        onClick={onCreateSubflow}
        disabled={selectedNodeIds.length < 2}
        title="創建子流程 (Ctrl+G)"
        style={{
          padding: '6px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#4CAF50',
          color: 'white',
          cursor: selectedNodeIds.length >= 2 ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          opacity: selectedNodeIds.length >= 2 ? 1 : 0.5
        }}
      >
        創建子流程
      </button>
      
      <button
        onClick={onUngroupSubflow}
        disabled={!hasSelectedSubflow}
        title="解散子流程 (Ctrl+U)"
        style={{
          padding: '6px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#ff6b6b',
          color: 'white',
          cursor: hasSelectedSubflow ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          opacity: hasSelectedSubflow ? 1 : 0.5
        }}
      >
        解散子流程
      </button>
      
      <button
        onClick={onAutoResizeSubflow}
        disabled={!hasSelectedSubflow}
        title="自動調整大小 (Ctrl+R)"
        style={{
          padding: '6px 12px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#ffc107',
          color: 'white',
          cursor: hasSelectedSubflow ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          opacity: hasSelectedSubflow ? 1 : 0.5
        }}
      >
        自動調整大小
      </button>
      
      <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
        已選中: {selectedNodeIds.length} 個節點
      </div>
    </div>
  );
};

export default Toolbar; 
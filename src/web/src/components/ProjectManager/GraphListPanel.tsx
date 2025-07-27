import React, { useState } from 'react';
import styled from 'styled-components';
import { RamenGraph } from '../../types/graph';
import { useProjectStore } from '../../stores/ProjectStore';
import { useGraphStore } from '../../stores/GraphStore';

const Panel = styled.div`
  flex: 1;
  padding: 16px;
  background: var(--color-background);
  overflow-y: auto;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const AddButton = styled.button`
  padding: 4px 8px;
  background: var(--color-primary);
  border: none;
  border-radius: 3px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  
  &:hover {
    background: var(--color-primary-hover);
  }
`;

const GraphList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const GraphItem = styled.div<{ $isActive: boolean }>`
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$isActive ? 'var(--color-primary-light)' : 'var(--color-background)'};
  border-color: ${props => props.$isActive ? 'var(--color-primary)' : 'var(--color-border)'};
  
  &:hover {
    background: ${props => props.$isActive ? 'var(--color-primary-light)' : 'var(--color-background-hover)'};
    border-color: ${props => props.$isActive ? 'var(--color-primary)' : 'var(--color-border-hover)'};
  }
`;

const GraphName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 4px;
`;

const GraphInfo = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const GraphStats = styled.span`
  font-size: 11px;
`;

const GraphDate = styled.span`
  font-size: 11px;
`;

const GraphActions = styled.div`
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  
  ${GraphItem}:hover & {
    opacity: 1;
  }
`;

const ActionButton = styled.button<{ variant?: 'danger' }>`
  padding: 2px 6px;
  border: 1px solid;
  border-radius: 2px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.variant === 'danger' ? `
    background: var(--color-danger);
    border-color: var(--color-danger);
    color: white;
    
    &:hover {
      background: var(--color-danger-hover);
      border-color: var(--color-danger-hover);
    }
  ` : `
    background: var(--color-background);
    border-color: var(--color-border);
    color: var(--color-text);
    
    &:hover {
      background: var(--color-background-hover);
      border-color: var(--color-border-hover);
    }
  `}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
  font-size: 14px;
  
  p {
    margin: 0 0 16px 0;
  }
`;

interface GraphListPanelProps {
  graphs: RamenGraph[];
  onGraphSelect: (graphId: string) => void;
}

export const GraphListPanel: React.FC<GraphListPanelProps> = ({ 
  graphs, 
  onGraphSelect 
}) => {
  const [editingGraphId, setEditingGraphId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  
  const { activeGraphId } = useGraphStore();
  const { 
    addGraphToProject, 
    removeGraphFromProject, 
    updateGraphInProject 
  } = useProjectStore();
  
  const handleAddGraph = () => {
    const graphId = addGraphToProject({
      metadata: {
        name: `Graph ${graphs.length + 1}`,
        description: '',
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        version: '1.0.0'
      }
    });
    onGraphSelect(graphId);
  };
  
  const handleGraphClick = (graphId: string) => {
    if (editingGraphId !== graphId) {
      onGraphSelect(graphId);
    }
  };
  
  const handleRename = (graph: RamenGraph) => {
    setEditingGraphId(graph.id);
    setTempName(graph.metadata.name);
  };
  
  const handleRenameSubmit = (graphId: string) => {
    if (tempName.trim()) {
      updateGraphInProject(graphId, {
        metadata: {
          name: tempName.trim(),
          last_modified: new Date().toISOString()
        }
      });
    }
    setEditingGraphId(null);
    setTempName('');
  };
  
  const handleRenameCancel = () => {
    setEditingGraphId(null);
    setTempName('');
  };
  
  const handleDelete = (graphId: string) => {
    if (graphs.length <= 1) {
      alert('Cannot delete the last graph in the project.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this graph? This action cannot be undone.')) {
      removeGraphFromProject(graphId);
      
      // 如果刪除的是當前活動圖形，切換到另一個圖形
      if (activeGraphId === graphId && graphs.length > 1) {
        const remainingGraph = graphs.find(g => g.id !== graphId);
        if (remainingGraph) {
          onGraphSelect(remainingGraph.id);
        }
      }
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };
  
  if (graphs.length === 0) {
    return (
      <Panel>
        <PanelHeader>
          <PanelTitle>Graphs</PanelTitle>
          <AddButton onClick={handleAddGraph}>Add Graph</AddButton>
        </PanelHeader>
        
        <EmptyState>
          <p>No graphs in this project yet.</p>
          <AddButton onClick={handleAddGraph}>Create First Graph</AddButton>
        </EmptyState>
      </Panel>
    );
  }
  
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Graphs ({graphs.length})</PanelTitle>
        <AddButton onClick={handleAddGraph}>Add Graph</AddButton>
      </PanelHeader>
      
      <GraphList>
        {graphs.map((graph) => (
          <GraphItem
            key={graph.id}
            $isActive={activeGraphId === graph.id}
            onClick={() => handleGraphClick(graph.id)}
          >
            {editingGraphId === graph.id ? (
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(graph.id);
                    if (e.key === 'Escape') handleRenameCancel();
                  }}
                  onBlur={() => handleRenameSubmit(graph.id)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '2px 4px',
                    border: '1px solid var(--color-primary)',
                    borderRadius: '2px',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                />
              </div>
            ) : (
              <>
                <GraphName>{graph.metadata.name}</GraphName>
                <GraphInfo>
                  <GraphStats>
                    {graph.nodes.length} nodes, {graph.edges.length} edges
                  </GraphStats>
                  <GraphDate>
                    {formatDate(graph.metadata.last_modified)}
                  </GraphDate>
                </GraphInfo>
                <GraphActions onClick={(e) => e.stopPropagation()}>
                  <ActionButton onClick={() => handleRename(graph)}>
                    Rename
                  </ActionButton>
                  <ActionButton 
                    variant="danger" 
                    onClick={() => handleDelete(graph.id)}
                  >
                    Delete
                  </ActionButton>
                </GraphActions>
              </>
            )}
          </GraphItem>
        ))}
      </GraphList>
    </Panel>
  );
};
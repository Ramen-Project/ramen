import React from 'react';
import { Node, Edge } from '@xyflow/react';
import styled from 'styled-components';
import { Text } from '@radix-ui/themes';
import { FiFolder, FiCircle, FiArrowRight, FiLayers, FiChevronDown, FiChevronRight } from 'react-icons/fi';

const StructureContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--gray-6);
  margin-bottom: 8px;
  
  svg {
    color: var(--gray-9);
  }
`;

const TreeNode = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isSelected'
})<{ depth: number; isSelected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin-left: ${props => props.depth * 16}px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  background: ${props => props.isSelected ? 'var(--accent-3)' : 'transparent'};
  color: ${props => props.isSelected ? 'var(--accent-11)' : 'var(--gray-11)'};
  
  &:hover {
    background: ${props => props.isSelected ? 'var(--accent-4)' : 'var(--gray-4)'};
  }
  
  svg {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
  }
`;

const NodeText = styled.span`
  font-size: 13px;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NodeCount = styled.span`
  font-size: 11px;
  color: var(--gray-9);
  margin-left: auto;
`;

const EdgeItem = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isSelected'
})<{ isSelected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  margin-left: 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  background: ${props => props.isSelected ? 'var(--accent-3)' : 'transparent'};
  color: ${props => props.isSelected ? 'var(--accent-11)' : 'var(--gray-10)'};
  
  &:hover {
    background: ${props => props.isSelected ? 'var(--accent-4)' : 'var(--gray-4)'};
  }
  
  svg {
    flex-shrink: 0;
    width: 12px;
    height: 12px;
  }
`;

const EdgeText = styled.span`
  font-size: 12px;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: var(--gray-9);
  text-align: center;
  gap: 8px;
  
  svg {
    width: 24px;
    height: 24px;
    opacity: 0.5;
  }
`;

interface GraphStructureProps {
  nodes?: Node[];
  edges?: Edge[];
}

export default function GraphStructure({ nodes = [], edges = [] }: GraphStructureProps) {
  
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());

  const groupNodes = nodes.filter(node => node.type === 'group');
  const topLevelNodes = nodes.filter(node => !node.parentId && node.type !== 'group');
  
  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(selectedNodeId === nodeId ? null : nodeId);
    setSelectedEdgeId(null);
    
    // Focus on the node in the graph
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      // You could emit an event here or use a callback prop to focus the node
      console.log('Focus node:', nodeId);
    }
  };
  
  const handleEdgeClick = (edgeId: string) => {
    setSelectedEdgeId(selectedEdgeId === edgeId ? null : edgeId);
    setSelectedNodeId(null);
    
    // Focus on the edge in the graph
    console.log('Focus edge:', edgeId);
  };
  
  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };
  
  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'group':
        return <FiLayers />;
      case 'operator':
        return <FiCircle />;
      case 'reference':
        return <FiCircle />;
      default:
        return <FiCircle />;
    }
  };
  
  const getGroupChildren = (groupId: string) => {
    return nodes.filter(node => node.parentId === groupId);
  };
  
  const renderGroupNode = (groupNode: any, depth = 0) => {
    const isExpanded = expandedGroups.has(groupNode.id);
    const children = getGroupChildren(groupNode.id);
    const isSelected = selectedNodeId === groupNode.id;
    
    return (
      <React.Fragment key={groupNode.id}>
        <TreeNode
          depth={depth}
          isSelected={isSelected}
          onClick={() => {
            toggleGroup(groupNode.id);
            handleNodeClick(groupNode.id);
          }}
        >
          {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
          <FiFolder />
          <NodeText>{groupNode.data?.label || `Group ${groupNode.id}`}</NodeText>
          <NodeCount>{children.length}</NodeCount>
        </TreeNode>
        {isExpanded && children.map(child => (
          <TreeNode
            key={child.id}
            depth={depth + 1}
            isSelected={selectedNodeId === child.id}
            onClick={() => handleNodeClick(child.id)}
          >
            {getNodeIcon(child.type)}
            <NodeText>{child.data?.name || child.id}</NodeText>
          </TreeNode>
        ))}
      </React.Fragment>
    );
  };
  
  const renderRegularNode = (node: any, depth = 0) => {
    const isSelected = selectedNodeId === node.id;
    
    return (
      <TreeNode
        key={node.id}
        depth={depth}
        isSelected={isSelected}
        onClick={() => handleNodeClick(node.id)}
      >
        {getNodeIcon(node.type)}
        <NodeText>{node.data?.name || node.id}</NodeText>
      </TreeNode>
    );
  };

  if (nodes.length === 0) {
    return (
      <EmptyState>
        <FiLayers />
        <Text size="2" color="gray">No nodes in the graph</Text>
      </EmptyState>
    );
  }

  return (
    <StructureContainer>
      {/* Nodes Section */}
      <SectionHeader>
        <FiLayers />
        <Text size="2" weight="medium">Nodes ({nodes.length})</Text>
      </SectionHeader>
      
      {/* Groups */}
      {groupNodes.map(groupNode => renderGroupNode(groupNode))}
      
      {/* Top-level nodes */}
      {topLevelNodes.map(node => renderRegularNode(node))}
      
      {/* Edges Section */}
      {edges.length > 0 && (
        <>
          <SectionHeader style={{ marginTop: '16px' }}>
            <FiArrowRight />
            <Text size="2" weight="medium">Connections ({edges.length})</Text>
          </SectionHeader>
          
          {edges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            const isSelected = selectedEdgeId === edge.id;
            
            return (
              <EdgeItem
                key={edge.id}
                isSelected={isSelected}
                onClick={() => handleEdgeClick(edge.id)}
              >
                <FiArrowRight />
                <EdgeText>
                  {sourceNode?.data?.name || edge.source} → {targetNode?.data?.name || edge.target}
                </EdgeText>
              </EdgeItem>
            );
          })}
        </>
      )}
    </StructureContainer>
  );
}
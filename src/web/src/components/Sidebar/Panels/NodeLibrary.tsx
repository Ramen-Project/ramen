import React from 'react';
import styled from 'styled-components';
import { Text, Box, ScrollArea, Badge } from '@radix-ui/themes';
import { 
  FileTextIcon, 
  MixIcon, 
  GearIcon,
  PlusIcon
} from '@radix-ui/react-icons';

const PanelContainer = styled.div`
  margin-bottom: 24px;
`;

const PanelHeader = styled.div`
  margin-bottom: 12px;
`;

const NodeCategory = styled.div`
  margin-bottom: 16px;
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 4px 0;
`;

const NodeItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--gray-3);
  margin-bottom: 4px;
  cursor: grab;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--gray-4);
    transform: translateY(-1px);
  }
  
  &:active {
    cursor: grabbing;
    transform: translateY(0);
  }
`;

const NodeIcon = styled.div.attrs<{ $color: string }>(({ $color }) => ({
  style: { background: $color }
}))`
  width: 16px;
  height: 16px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
`;

const NodeInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const NodeName = styled(Text)`
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-12);
  display: block;
`;

const NodeDescription = styled(Text)`
  font-size: 11px;
  color: var(--gray-11);
  display: block;
  margin-top: 2px;
`;

const nodeCategories = [
  {
    name: 'File I/O',
    icon: <FileTextIcon />,
    color: '#3b82f6',
    nodes: [
      { name: 'Read Excel', description: 'Read data from Excel files' },
      { name: 'Read CSV', description: 'Read data from CSV files' },
      { name: 'Write JSON', description: 'Write data to JSON files' },
      { name: 'Write CSV', description: 'Write data to CSV files' },
    ]
  },
  {
    name: 'Data Operations',
    icon: <MixIcon />,
    color: '#f59e42',
    nodes: [
      { name: 'Join Tables', description: 'Join two tables on a key' },
      { name: 'Group By', description: 'Group and aggregate data' },
      { name: 'Filter', description: 'Filter rows by condition' },
      { name: 'Sort', description: 'Sort data by columns' },
    ]
  },
  {
    name: 'Math & Statistics',
    icon: <PlusIcon />,
    color: '#a259e6',
    nodes: [
      { name: 'Calculate Mean', description: 'Calculate mean of columns' },
      { name: 'Calculate Sum', description: 'Calculate sum of columns' },
      { name: 'Correlation', description: 'Calculate correlation matrix' },
      { name: 'Regression', description: 'Perform linear regression' },
    ]
  },
  {
    name: 'Utilities',
    icon: <GearIcon />,
    color: '#10b981',
    nodes: [
      { name: 'Data Validation', description: 'Validate data integrity' },
      { name: 'Data Cleaning', description: 'Clean and normalize data' },
      { name: 'Data Sampling', description: 'Sample data randomly' },
      { name: 'Data Export', description: 'Export to various formats' },
    ]
  }
];

export default function NodeLibrary() {
  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'operator',
      name: nodeType,
      position: { x: 0, y: 0 }
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <PanelContainer>
      <PanelHeader>
        <Text size="4" weight="bold">Node Library</Text>
      </PanelHeader>
      
      <ScrollArea style={{ height: 'calc(100vh - 180px)' }}>
        {nodeCategories.map((category) => (
          <NodeCategory key={category.name}>
            <CategoryHeader>
              <Box style={{ color: category.color }}>
                {category.icon}
              </Box>
              <Text size="2" weight="medium" color="gray">
                {category.name}
              </Text>
              <Badge variant="soft" size="1">
                {category.nodes.length}
              </Badge>
            </CategoryHeader>
            
            {category.nodes.map((node) => (
              <NodeItem
                key={node.name}
                draggable
                onDragStart={(e) => handleDragStart(e, node.name)}
              >
                <NodeIcon $color={category.color}>
                  <PlusIcon />
                </NodeIcon>
                <NodeInfo>
                  <NodeName>{node.name}</NodeName>
                  <NodeDescription>{node.description}</NodeDescription>
                </NodeInfo>
              </NodeItem>
            ))}
          </NodeCategory>
        ))}
      </ScrollArea>
    </PanelContainer>
  );
} 
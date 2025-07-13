import React, { useState } from 'react';
import styled from 'styled-components';
import { Text, Box, ScrollArea, Badge } from '@radix-ui/themes';
import { 
  ChevronDownIcon,
  ChevronRightIcon,
} from '@radix-ui/react-icons';

import NodePreviewItem from '../../Node/NodePreviewWrapper';
import { useNodeDefinitionStore } from '../../../stores/NodeDefinitionStore';

const PanelContainer = styled.div`
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
`;


// const PanelHeader = styled.div`
//   margin-bottom: 12px;
// `;

const NodeCategory = styled.div`
  margin-bottom: 16px;
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 4px 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
`;

// Add styled component for category name with hover brightness
const CategoryName = styled(Text)`
  transition: color 0.2s ease;

  ${CategoryHeader}:hover & {
    color: var(--gray-12);
  }
`;

const CollapseIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--gray-10);
  transition: transform 0.2s ease;
`;




export default function NodeLibrary() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { getAllCategories, getNodeDefinition } = useNodeDefinitionStore();
  const categories = getAllCategories();

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    console.log('Drag started for:', nodeType);
    // Use the global drag start handler from Graph component
    if ((window as any).graphOnDragStart) {
      (window as any).graphOnDragStart(event, nodeType);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setActiveCategory(prev => prev === categoryName ? null : categoryName);
  };

  return (
    <PanelContainer>
      <ScrollArea style={{ height: 'calc(100vh - 120px)' }}>
        {categories.map((category) => {
          const isExpanded = activeCategory === category.name;
          return (
            <NodeCategory key={category.name}>
              <CategoryHeader onClick={() => toggleCategory(category.name)}>
                <CollapseIcon>
                  {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                </CollapseIcon>
                <Box style={{ color: category.color }}>
                  <category.icon />
                </Box>
                <CategoryName size="2" weight="medium" color="gray">
                  {category.name}
                </CategoryName>
                <Badge color="gray" variant="soft">
                  {category.nodes.length}
                </Badge>
              </CategoryHeader>
              {isExpanded && category.nodes.map((node) => {
                const nodeDefinition = getNodeDefinition(node.name);
                if (!nodeDefinition) return null;
                
                const previewData = {
                  name: nodeDefinition.name,
                  namespace: nodeDefinition.namespace,
                  brief: nodeDefinition.description,
                  inputs: nodeDefinition.inputs,
                  outputs: nodeDefinition.outputs
                };
                
                return (
                  <NodePreviewItem
                    key={node.name}
                    nodeData={previewData} 
                    scale={0.9} 
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, node.name)}
                  />
                );
              })}
            </NodeCategory>
          );
        })}
      </ScrollArea>
    </PanelContainer>
  );
} 
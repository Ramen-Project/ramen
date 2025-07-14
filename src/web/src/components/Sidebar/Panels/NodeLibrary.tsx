import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Text, Box, ScrollArea, Badge, TextField } from '@radix-ui/themes';
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';

import StandaloneNodePreview from '../../Node/StandaloneNodePreview';
import { useNodeDefinitionStore } from '../../../stores/NodeDefinitionStore';

const PanelContainer = styled.div`
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const SearchContainer = styled.div`
  padding: 16px;
  background-color: var(--gray-2);
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
  const [searchQuery, setSearchQuery] = useState('');
  const { getAllCategories, getNodeDefinition } = useNodeDefinitionStore();
  const allCategories = getAllCategories();

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

  // Filter categories and nodes based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCategories;
    }

    const query = searchQuery.toLowerCase();
    return allCategories.map(category => {
      const filteredNodes = category.nodes.filter(node => {
        const nodeDefinition = getNodeDefinition(node.name);
        if (!nodeDefinition) return false;
        
        // Search in basic properties
        const matchesBasic = (
          nodeDefinition.name.toLowerCase().includes(query) ||
          nodeDefinition.description.toLowerCase().includes(query) ||
          nodeDefinition.namespace.toLowerCase().includes(query)
        );
        
        // Search in input types
        const matchesInputs = nodeDefinition.inputs.some(input => 
          (input.typeId && input.typeId.toLowerCase().includes(query)) ||
          (input.name && input.name.toLowerCase().includes(query))
        );
        
        // Search in output types
        const matchesOutputs = nodeDefinition.outputs.some(output => 
          (output.typeId && output.typeId.toLowerCase().includes(query)) ||
          (output.name && output.name.toLowerCase().includes(query))
        );
        
        return matchesBasic || matchesInputs || matchesOutputs;
      });

      return {
        ...category,
        nodes: filteredNodes
      };
    }).filter(category => category.nodes.length > 0);
  }, [allCategories, searchQuery, getNodeDefinition]);

  return (
    <PanelContainer>
      <SearchContainer>
        <TextField.Root
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="2"
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
      </SearchContainer>
      
      <ScrollArea style={{ height: 'calc(100vh - 180px)' }}>
        {filteredCategories.map((category) => {
          // Auto-expand categories when searching, otherwise use manual toggle
          const isExpanded = searchQuery.trim() ? true : activeCategory === category.name;
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
                  <StandaloneNodePreview
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
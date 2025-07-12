
import styled from 'styled-components';
import { Text, TextField, TextArea, Button, Badge } from '@radix-ui/themes';
import { 
  GearIcon, 
  InputIcon, 
  Cross2Icon,
  ArrowRightIcon
} from '@radix-ui/react-icons';
import { Node, Edge } from '@xyflow/react';
import { useSelectionStore } from '../../../stores/SelectionStore';

const PanelContainer = styled.div`
  margin-bottom: 24px;
`;

const PanelHeader = styled.div`
  margin-bottom: 12px;
`;

const PropertyGroup = styled.div`
  margin-bottom: 16px;
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 4px 0;
`;

const PropertyItem = styled.div`
  margin-bottom: 12px;
`;

const PropertyLabel = styled(Text)`
  font-size: 12px;
  font-weight: 500;
  color: var(--gray-11);
  display: block;
  margin-bottom: 4px;
`;

const InputOutputItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--gray-3);
  border-radius: 6px;
  margin-bottom: 4px;
`;

const InputOutputInfo = styled.div`
  flex: 1;
`;

const InputOutputName = styled(Text)`
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-12);
  display: block;
`;

const InputOutputType = styled(Badge)`
  margin-top: 2px;
`;

const RemoveButton = styled(Button)`
  padding: 2px;
  width: 20px;
  height: 20px;
  border-radius: 3px;
`;

const AddButton = styled(Button)`
  width: 100%;
  margin-top: 8px;
`;

interface NodeData {
  name?: string;
  brief?: string;
  inputs?: Array<{ name: string; typeId: string }>;
  outputs?: Array<{ name: string; typeId: string }>;
  namespace?: string;
}

interface PropertiesProps {
  selectedNode?: Node | null;
  selectedEdge?: Edge | null;
  onUpdateNode?: (nodeId: string, data: Partial<NodeData>) => void;
}

export default function Properties({ onUpdateNode }: Omit<PropertiesProps, 'selectedNode' | 'selectedEdge'>) {
  // Get selection from store instead of props
  const { selectedNode, selectedEdge } = useSelectionStore();
  
  // If an edge is selected, show edge properties
  if (selectedEdge) {
    return (
      <PanelContainer>

        <PropertyGroup>
          <GroupHeader>
            <ArrowRightIcon />
            <Text size="2" weight="medium" color="gray">Connection</Text>
          </GroupHeader>
          
          <PropertyItem>
            <PropertyLabel>Source</PropertyLabel>
            <Text size="2" style={{ 
              padding: '8px 12px', 
              background: 'var(--gray-3)', 
              borderRadius: '6px',
              display: 'block'
            }}>
              {selectedEdge.source}
              {selectedEdge.sourceHandle && (
                <Badge variant="soft" size="1" style={{ marginLeft: '8px' }}>
                  {selectedEdge.sourceHandle}
                </Badge>
              )}
            </Text>
          </PropertyItem>

          <PropertyItem>
            <PropertyLabel>Target</PropertyLabel>
            <Text size="2" style={{ 
              padding: '8px 12px', 
              background: 'var(--gray-3)', 
              borderRadius: '6px',
              display: 'block'
            }}>
              {selectedEdge.target}
              {selectedEdge.targetHandle && (
                <Badge variant="soft" size="1" style={{ marginLeft: '8px' }}>
                  {selectedEdge.targetHandle}
                </Badge>
              )}
            </Text>
          </PropertyItem>

          <PropertyItem>
            <PropertyLabel>Type</PropertyLabel>
            <Text size="2" style={{ 
              padding: '8px 12px', 
              background: 'var(--gray-3)', 
              borderRadius: '6px',
              display: 'block'
            }}>
              {selectedEdge.type || 'default'}
            </Text>
          </PropertyItem>

          {selectedEdge.animated && (
            <PropertyItem>
              <PropertyLabel>Animated</PropertyLabel>
              <Badge variant="soft" color="green">Yes</Badge>
            </PropertyItem>
          )}

          {selectedEdge.label && (
            <PropertyItem>
              <PropertyLabel>Label</PropertyLabel>
              <Text size="2" style={{ 
                padding: '8px 12px', 
                background: 'var(--gray-3)', 
                borderRadius: '6px',
                display: 'block'
              }}>
                {selectedEdge.label}
              </Text>
            </PropertyItem>
          )}
        </PropertyGroup>
      </PanelContainer>
    );
  }

  // If no node is selected, show default message
  if (!selectedNode) {
    return (
      <PanelContainer>
        <Text size="2" color="gray">
          Select a node or edge to view its properties
        </Text>
      </PanelContainer>
    );
  }

  const handleNameChange = (value: string) => {
    onUpdateNode?.(selectedNode.id, { name: value });
  };

  const handleBriefChange = (value: string) => {
    onUpdateNode?.(selectedNode.id, { brief: value });
  };

  const handleNamespaceChange = (value: string) => {
    onUpdateNode?.(selectedNode.id, { namespace: value });
  };

  const addInput = () => {
    const newInputs = [...(selectedNode.data?.inputs || []), { name: 'new_input', typeId: 'str' }];
    onUpdateNode?.(selectedNode.id, { inputs: newInputs });
  };

  const removeInput = (index: number) => {
    const newInputs = selectedNode.data?.inputs?.filter((_, i) => i !== index);
    onUpdateNode?.(selectedNode.id, { inputs: newInputs });
  };

  const addOutput = () => {
    const newOutputs = [...(selectedNode.data?.outputs || []), { name: 'new_output', typeId: 'str' }];
    onUpdateNode?.(selectedNode.id, { outputs: newOutputs });
  };

  const removeOutput = (index: number) => {
    const newOutputs = selectedNode.data?.outputs?.filter((_, i) => i !== index);
    onUpdateNode?.(selectedNode.id, { outputs: newOutputs });
  };

  return (
    <PanelContainer>

      <PropertyGroup>
        <GroupHeader>
          <GearIcon />
          <Text size="2" weight="medium" color="gray">
            {selectedNode.type === 'group' ? 'Group' : 'Node'} • {selectedNode.id}
          </Text>
        </GroupHeader>
        
        <PropertyItem>
          <PropertyLabel>Name</PropertyLabel>
          <TextField.Root
            value={selectedNode.data?.name || ''}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Node name"
            size="2"
          />
        </PropertyItem>

        <PropertyItem>
          <PropertyLabel>Description</PropertyLabel>
          <TextArea
            value={selectedNode.data?.brief || ''}
            onChange={(e) => handleBriefChange(e.target.value)}
            placeholder="Brief description"
            size="2"
            rows={3}
          />
        </PropertyItem>

        <PropertyItem>
          <PropertyLabel>Namespace</PropertyLabel>
          <TextField.Root
            value={selectedNode.data?.namespace || ''}
            onChange={(e) => handleNamespaceChange(e.target.value)}
            placeholder="Namespace"
            size="2"
          />
        </PropertyItem>
      </PropertyGroup>

      <PropertyGroup>
        <GroupHeader>
          <GearIcon />
          <Text size="2" weight="medium" color="gray">Layout</Text>
        </GroupHeader>
        
        <PropertyItem>
          <PropertyLabel>Position</PropertyLabel>
          <Text size="2" style={{ 
            padding: '8px 12px', 
            background: 'var(--gray-3)', 
            borderRadius: '6px',
            display: 'block'
          }}>
            X: {Math.round(selectedNode.position.x)}, Y: {Math.round(selectedNode.position.y)}
          </Text>
        </PropertyItem>

        {selectedNode.measured && (
          <PropertyItem>
            <PropertyLabel>Size</PropertyLabel>
            <Text size="2" style={{ 
              padding: '8px 12px', 
              background: 'var(--gray-3)', 
              borderRadius: '6px',
              display: 'block'
            }}>
              {Math.round(selectedNode.measured.width)} × {Math.round(selectedNode.measured.height)}
            </Text>
          </PropertyItem>
        )}

        {selectedNode.parentId && (
          <PropertyItem>
            <PropertyLabel>Parent Group</PropertyLabel>
            <Text size="2" style={{ 
              padding: '8px 12px', 
              background: 'var(--gray-3)', 
              borderRadius: '6px',
              display: 'block'
            }}>
              {selectedNode.parentId}
            </Text>
          </PropertyItem>
        )}

        <PropertyItem>
          <PropertyLabel>Selection State</PropertyLabel>
          <Badge variant="soft" color={selectedNode.selected ? "green" : "gray"}>
            {selectedNode.selected ? "Selected" : "Not Selected"}
          </Badge>
        </PropertyItem>
      </PropertyGroup>

      <PropertyGroup>
        <GroupHeader>
          <InputIcon />
          <Text size="2" weight="medium" color="gray">Inputs</Text>
          <Badge variant="soft" size="1">
            {selectedNode.data?.inputs?.length || 0}
          </Badge>
        </GroupHeader>
        
        {selectedNode.data?.inputs?.map((input, index) => (
          <InputOutputItem key={index}>
            <InputOutputInfo>
              <InputOutputName>{input.name}</InputOutputName>
              <InputOutputType variant="soft" size="1">
                {input.typeId}
              </InputOutputType>
            </InputOutputInfo>
            <RemoveButton 
              variant="ghost" 
              size="1" 
              onClick={() => removeInput(index)}
            >
              <Cross2Icon />
            </RemoveButton>
          </InputOutputItem>
        ))}
        
        <AddButton variant="outline" size="2" onClick={addInput}>
          Add Input
        </AddButton>
      </PropertyGroup>

      <PropertyGroup>
        <GroupHeader>
          <InputIcon />
          <Text size="2" weight="medium" color="gray">Outputs</Text>
          <Badge variant="soft" size="1">
            {selectedNode.data?.outputs?.length || 0}
          </Badge>
        </GroupHeader>
        
        {selectedNode.data?.outputs?.map((output, index) => (
          <InputOutputItem key={index}>
            <InputOutputInfo>
              <InputOutputName>{output.name}</InputOutputName>
              <InputOutputType variant="soft" size="1">
                {output.typeId}
              </InputOutputType>
            </InputOutputInfo>
            <RemoveButton 
              variant="ghost" 
              size="1" 
              onClick={() => removeOutput(index)}
            >
              <Cross2Icon />
            </RemoveButton>
          </InputOutputItem>
        ))}
        
        <AddButton variant="outline" size="2" onClick={addOutput}>
          Add Output
        </AddButton>
      </PropertyGroup>
    </PanelContainer>
  );
} 
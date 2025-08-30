import React, { useState, useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import styled from 'styled-components';
import { ChevronDown, ChevronUp, Plus, X, Brain, Database, Package, Code } from 'lucide-react';

interface PropertyDefinition {
  name: string;
  type: string;
  defaultValue?: any;
  required: boolean;
  description?: string;
}

interface MethodDefinition {
  name: string;
  parameters: string[];
  returnType?: string;
  body?: string;
  description?: string;
}

interface ClassDefinitionData {
  className: string;
  classType: 'pytorch_module' | 'pydantic_model' | 'dataclass' | 'generic';
  baseClasses: string[];
  properties: PropertyDefinition[];
  methods: MethodDefinition[];
  docstring?: string;
  isExpanded: boolean;
  innerNodes?: string[]; // IDs of nodes inside this definition
}

const Container = styled.div<{ $isExpanded: boolean }>`
  background: var(--vscode-editor-background);
  border: 2px solid var(--vscode-panel-border);
  border-radius: 8px;
  min-width: 300px;
  max-width: 600px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  padding: 12px 16px;
  background: var(--vscode-sideBar-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  user-select: none;
`;

const ClassInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ClassTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--vscode-editor-foreground);
`;

const ClassIcon = styled.span`
  font-size: 20px;
`;

const ClassMeta = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-top: 4px;
`;

const Badge = styled.span`
  padding: 2px 8px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 10px;
  font-size: 10px;
`;

const Content = styled.div<{ $isExpanded: boolean }>`
  max-height: ${props => props.$isExpanded ? '800px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
`;

const Section = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border);

  &:last-child {
    border-bottom: none;
  }
`;

const SectionTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-symbolIcon-variableForeground);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PropertyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Property = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--vscode-input-background);
  border-radius: 4px;
  font-size: 12px;
`;

const PropertyName = styled.span`
  color: var(--vscode-symbolIcon-propertyForeground);
  font-weight: 500;
`;

const PropertyType = styled.span`
  color: var(--vscode-symbolIcon-typeParameterForeground);
  font-family: 'Courier New', monospace;
`;

const PropertyRequired = styled.span`
  color: var(--vscode-errorForeground);
  font-size: 10px;
`;

const Method = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  background: var(--vscode-input-background);
  border-radius: 4px;
  font-size: 12px;
`;

const MethodSignature = styled.div`
  color: var(--vscode-symbolIcon-methodForeground);
  font-family: 'Courier New', monospace;
`;

const MethodDescription = styled.div`
  color: var(--vscode-descriptionForeground);
  font-size: 11px;
  font-style: italic;
`;

const InnerGraphArea = styled.div`
  min-height: 200px;
  background: var(--vscode-editor-background);
  border: 1px dashed var(--vscode-panel-border);
  border-radius: 4px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--vscode-button-hoverBackground);
  }
`;

const RemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  color: var(--vscode-errorForeground);
  border: none;
  cursor: pointer;
  border-radius: 2px;
  transition: background 0.2s;

  &:hover {
    background: var(--vscode-inputValidation-errorBackground);
  }
`;

const StyledHandle = styled(Handle)`
  width: 12px;
  height: 12px;
  background: var(--vscode-progressBar-background);
  border: 2px solid var(--vscode-panel-border);
`;

export const ClassDefinitionEditor: React.FC<NodeProps<ClassDefinitionData>> = ({ 
  data, 
  id,
  selected 
}) => {
  const [isExpanded, setIsExpanded] = useState(data.isExpanded ?? true);
  const [properties, setProperties] = useState(data.properties || []);
  const [methods, setMethods] = useState(data.methods || []);

  const classIcon = useMemo(() => {
    switch (data.classType) {
      case 'pytorch_module':
        return '🧠';
      case 'pydantic_model':
        return '📋';
      case 'dataclass':
        return '📦';
      default:
        return '🎯';
    }
  }, [data.classType]);

  const classTypeLabel = useMemo(() => {
    switch (data.classType) {
      case 'pytorch_module':
        return 'PyTorch Module';
      case 'pydantic_model':
        return 'Pydantic Model';
      case 'dataclass':
        return 'Data Class';
      default:
        return 'Class';
    }
  }, [data.classType]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleAddProperty = useCallback(() => {
    const newProperty: PropertyDefinition = {
      name: `property_${properties.length + 1}`,
      type: 'Any',
      required: false,
      description: ''
    };
    setProperties([...properties, newProperty]);
  }, [properties]);

  const handleRemoveProperty = useCallback((index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  }, [properties]);

  const handleAddMethod = useCallback(() => {
    const newMethod: MethodDefinition = {
      name: `method_${methods.length + 1}`,
      parameters: ['self'],
      returnType: 'None',
      body: 'pass',
      description: ''
    };
    setMethods([...methods, newMethod]);
  }, [methods]);

  const handleRemoveMethod = useCallback((index: number) => {
    setMethods(methods.filter((_, i) => i !== index));
  }, [methods]);

  return (
    <Container $isExpanded={isExpanded}>
      <StyledHandle type="target" position={Position.Top} />
      
      <Header onClick={handleToggleExpand}>
        <ClassInfo>
          <ClassTitle>
            <ClassIcon>{classIcon}</ClassIcon>
            <span>{data.className || 'NewClass'}</span>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </ClassTitle>
          <Badge>{classTypeLabel}</Badge>
        </ClassInfo>
        {data.baseClasses && data.baseClasses.length > 0 && (
          <ClassMeta>
            extends: {data.baseClasses.join(', ')}
          </ClassMeta>
        )}
      </Header>

      <Content $isExpanded={isExpanded}>
        {/* Properties Section */}
        <Section>
          <SectionTitle>
            Properties
            <AddButton onClick={handleAddProperty}>
              <Plus size={12} />
              Add
            </AddButton>
          </SectionTitle>
          <PropertyList>
            {properties.map((prop, index) => (
              <Property key={index}>
                <PropertyName>{prop.name}</PropertyName>
                <span>:</span>
                <PropertyType>{prop.type}</PropertyType>
                {prop.required && <PropertyRequired>*</PropertyRequired>}
                {prop.defaultValue !== undefined && (
                  <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                    = {JSON.stringify(prop.defaultValue)}
                  </span>
                )}
                <div style={{ marginLeft: 'auto' }}>
                  <RemoveButton onClick={() => handleRemoveProperty(index)}>
                    <X size={12} />
                  </RemoveButton>
                </div>
              </Property>
            ))}
            {properties.length === 0 && (
              <div style={{ 
                color: 'var(--vscode-descriptionForeground)', 
                fontSize: '11px',
                fontStyle: 'italic' 
              }}>
                No properties defined
              </div>
            )}
          </PropertyList>
        </Section>

        {/* Methods Section */}
        <Section>
          <SectionTitle>
            Methods
            <AddButton onClick={handleAddMethod}>
              <Plus size={12} />
              Add
            </AddButton>
          </SectionTitle>
          <PropertyList>
            {methods.map((method, index) => (
              <Method key={index}>
                <MethodSignature>
                  {method.name}({method.parameters.join(', ')})
                  {method.returnType && ` -> ${method.returnType}`}
                </MethodSignature>
                {method.description && (
                  <MethodDescription>{method.description}</MethodDescription>
                )}
                <div style={{ marginLeft: 'auto', marginTop: '4px' }}>
                  <RemoveButton onClick={() => handleRemoveMethod(index)}>
                    <X size={12} />
                  </RemoveButton>
                </div>
              </Method>
            ))}
            {methods.length === 0 && (
              <div style={{ 
                color: 'var(--vscode-descriptionForeground)', 
                fontSize: '11px',
                fontStyle: 'italic' 
              }}>
                No methods defined
              </div>
            )}
          </PropertyList>
        </Section>

        {/* Inner Graph Area for PyTorch Module */}
        {data.classType === 'pytorch_module' && (
          <Section>
            <SectionTitle>Module Architecture</SectionTitle>
            <InnerGraphArea>
              <div>
                <div>Drop neural network layers here</div>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>
                  Conv2d → BatchNorm → ReLU → ...
                </div>
              </div>
            </InnerGraphArea>
          </Section>
        )}

        {/* Validation Rules for Pydantic Model */}
        {data.classType === 'pydantic_model' && (
          <Section>
            <SectionTitle>Validation Rules</SectionTitle>
            <InnerGraphArea>
              <div>
                <div>Define validation logic</div>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>
                  Add validators and constraints
                </div>
              </div>
            </InnerGraphArea>
          </Section>
        )}
      </Content>

      <StyledHandle type="source" position={Position.Bottom} />
    </Container>
  );
};
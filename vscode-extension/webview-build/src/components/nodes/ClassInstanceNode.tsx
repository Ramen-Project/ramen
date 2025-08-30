import React, { useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import styled from 'styled-components';
import { Zap, Database, Brain, Package } from 'lucide-react';

interface ClassInstanceData {
  className: string;
  classType: 'pytorch_module' | 'pydantic_model' | 'dataclass' | 'generic';
  namespace: string;
  inputs: Array<{ name: string; type: string; required: boolean }>;
  outputs: Array<{ name: string; type: string }>;
  description?: string;
  isExecuting?: boolean;
  hasError?: boolean;
  definitionId?: string; // Reference to the definition node
}

const Container = styled.div<{ $hasError?: boolean; $isExecuting?: boolean }>`
  background: var(--vscode-editor-background);
  border: 2px solid ${props => 
    props.$hasError ? 'var(--vscode-inputValidation-errorBorder)' : 
    props.$isExecuting ? 'var(--vscode-progressBar-background)' :
    'var(--vscode-panel-border)'
  };
  border-radius: 8px;
  min-width: 200px;
  transition: all 0.2s ease;
  box-shadow: ${props => props.$isExecuting ? 
    '0 0 20px rgba(var(--vscode-progressBar-background), 0.3)' : 
    '0 2px 4px rgba(0, 0, 0, 0.1)'
  };

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

const Header = styled.div<{ $classType: string }>`
  padding: 10px 12px;
  background: ${props => {
    switch(props.$classType) {
      case 'pytorch_module':
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'pydantic_model':
        return 'linear-gradient(135deg, #4ECDC4 0%, #44A8B3 100%)';
      case 'dataclass':
        return 'linear-gradient(135deg, #45B7D1 0%, #2196F3 100%)';
      default:
        return 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)';
    }
  }};
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Icon = styled.div`
  font-size: 18px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
`;

const Title = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`;

const Namespace = styled.div`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  margin-left: auto;
`;

const Body = styled.div`
  padding: 8px 12px;
`;

const Description = styled.div`
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 8px;
  font-style: italic;
`;

const PortSection = styled.div`
  margin: 8px 0;
`;

const PortLabel = styled.div`
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const Port = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0;
  font-size: 11px;
`;

const PortName = styled.span`
  color: var(--vscode-symbolIcon-variableForeground);
`;

const PortType = styled.span`
  color: var(--vscode-symbolIcon-typeParameterForeground);
  font-family: 'Courier New', monospace;
  font-size: 10px;
`;

const RequiredMark = styled.span`
  color: var(--vscode-errorForeground);
  font-size: 10px;
`;

const ExecutionIndicator = styled.div<{ $isExecuting?: boolean }>`
  height: 2px;
  background: var(--vscode-progressBar-background);
  animation: ${props => props.$isExecuting ? 'pulse 1.5s ease-in-out infinite' : 'none'};
  
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
`;

const StyledHandle = styled(Handle)<{ $handleType: 'input' | 'output' }>`
  width: 10px;
  height: 10px;
  background: ${props => 
    props.$handleType === 'input' ? 
    'var(--vscode-input-background)' : 
    'var(--vscode-button-background)'
  };
  border: 2px solid var(--vscode-panel-border);

  &:hover {
    background: var(--vscode-button-hoverBackground);
  }
`;

const StatusBadge = styled.div<{ $status?: 'error' | 'executing' | 'success' }>`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${props => {
    switch(props.$status) {
      case 'error':
        return 'var(--vscode-inputValidation-errorBackground)';
      case 'executing':
        return 'var(--vscode-progressBar-background)';
      case 'success':
        return 'var(--vscode-terminal-ansiGreen)';
      default:
        return 'transparent';
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${props => props.$status === 'executing' ? 'spin 1s linear infinite' : 'none'};

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export const ClassInstanceNode: React.FC<NodeProps<ClassInstanceData>> = ({ 
  data, 
  id,
  selected 
}) => {
  const icon = useMemo(() => {
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

  const status = useMemo(() => {
    if (data.hasError) return 'error';
    if (data.isExecuting) return 'executing';
    return undefined;
  }, [data.hasError, data.isExecuting]);

  return (
    <Container $hasError={data.hasError} $isExecuting={data.isExecuting}>
      {status && <StatusBadge $status={status} />}
      
      <Header $classType={data.classType}>
        <Icon>{icon}</Icon>
        <Title>{data.className}</Title>
        {data.namespace && <Namespace>{data.namespace}</Namespace>}
      </Header>

      {data.isExecuting && <ExecutionIndicator $isExecuting />}

      <Body>
        {data.description && (
          <Description>{data.description}</Description>
        )}

        {/* Input Ports */}
        {data.inputs && data.inputs.length > 0 && (
          <PortSection>
            <PortLabel>Inputs</PortLabel>
            {data.inputs.map((input, index) => (
              <Port key={input.name}>
                <StyledHandle
                  type="target"
                  position={Position.Left}
                  id={input.name}
                  $handleType="input"
                  style={{ 
                    position: 'relative',
                    left: '-20px',
                    top: '0'
                  }}
                />
                <PortName>{input.name}</PortName>
                <PortType>: {input.type}</PortType>
                {input.required && <RequiredMark>*</RequiredMark>}
              </Port>
            ))}
          </PortSection>
        )}

        {/* Output Ports */}
        {data.outputs && data.outputs.length > 0 && (
          <PortSection>
            <PortLabel>Outputs</PortLabel>
            {data.outputs.map((output, index) => (
              <Port key={output.name} style={{ justifyContent: 'flex-end' }}>
                <PortName>{output.name}</PortName>
                <PortType>: {output.type}</PortType>
                <StyledHandle
                  type="source"
                  position={Position.Right}
                  id={output.name}
                  $handleType="output"
                  style={{ 
                    position: 'relative',
                    right: '-20px',
                    top: '0'
                  }}
                />
              </Port>
            ))}
          </PortSection>
        )}
      </Body>
    </Container>
  );
};
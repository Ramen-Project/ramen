import React from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import styled from 'styled-components';
import chroma from 'chroma-js';

// Icons for different context types
const CONTEXT_ICONS: Record<string, string> = {
  file: '📁',
  lock: '🔒',
  timer: '⏱️',
  transaction: '💳',
  custom: '⚙️',
};

// Colors for different context types
const CONTEXT_COLORS: Record<string, string> = {
  file: '#4CAF50',
  lock: '#FF9800',
  timer: '#2196F3',
  transaction: '#9C27B0',
  custom: '#607D8B',
};

export interface ContextManagerNodeData {
  label: string;
  contextType: 'file' | 'lock' | 'transaction' | 'timer' | 'custom';
  resourceConfig?: any;
  enterPorts?: Array<{ name: string; type: string }>;
  exitPorts?: Array<{ name: string; type: string }>;
  width?: number;
  height?: number;
  hasBeenInitialized?: boolean;
  childCount?: number;
  onUngroup?: () => void;
  onRename?: (newLabel: string) => void;
  onResize?: (width: number, height: number) => void;
  onAutoResize?: () => void;
}

interface ContextManagerGroupProps extends NodeProps {
  data: ContextManagerNodeData;
  dragOverGroupId?: string | null;
}

const GroupContainer = styled.div.attrs<{
  $width?: number;
  $height?: number;
  $backgroundColor: string;
  $borderColor: string;
  $isDragOver: boolean;
  $isSelected: boolean;
}>(({ $width, $height, $backgroundColor, $borderColor, $isDragOver, $isSelected }) => ({
  style: {
    width: $width || 400,
    height: $height || 300,
    backgroundColor: $backgroundColor,
    border: `2px ${$isSelected ? 'solid' : 'dashed'} ${$borderColor}`,
    boxShadow: $isDragOver ? `0 0 20px ${chroma($borderColor).alpha(0.6).hex()}` : 'none',
    transform: $isDragOver ? 'scale(1.02)' : 'scale(1)',
  }
}))`
  border-radius: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
  pointer-events: none;
  user-select: none;
`;

const Header = styled.div<{ $backgroundColor: string; $textColor: string }>`
  background: ${props => props.$backgroundColor};
  color: ${props => props.$textColor};
  padding: 12px 16px;
  border-radius: 10px 10px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const IconWrapper = styled.span`
  font-size: 18px;
  display: flex;
  align-items: center;
`;

const ContextTypeLabel = styled.span<{ $color: string }>`
  background: ${props => chroma(props.$color).alpha(0.2).hex()};
  color: ${props => props.$color};
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  margin-left: auto;
`;

const EnterSection = styled.div`
  position: absolute;
  top: 60px;
  left: 0;
  right: 0;
  padding: 8px 16px;
  background: rgba(76, 175, 80, 0.05);
  border-top: 1px dashed rgba(76, 175, 80, 0.3);
  border-bottom: 1px dashed rgba(76, 175, 80, 0.3);
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ExitSection = styled.div`
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  padding: 8px 16px;
  background: rgba(244, 67, 54, 0.05);
  border-top: 1px dashed rgba(244, 67, 54, 0.3);
  border-bottom: 1px dashed rgba(244, 67, 54, 0.3);
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SectionLabel = styled.div<{ $color: string }>`
  color: ${props => props.$color};
  font-size: 12px;
  font-weight: 600;
  opacity: 0.8;
`;

const BodySection = styled.div`
  flex: 1;
  margin: 110px 16px 70px 16px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
  font-style: italic;
  background: rgba(255, 255, 255, 0.02);
`;

const ChildCounter = styled.div<{ $color: string }>`
  position: absolute;
  top: 12px;
  right: 16px;
  background: ${props => chroma(props.$color).alpha(0.2).hex()};
  color: ${props => props.$color};
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
`;

const DragOverIndicator = styled.div.attrs<{ $color: string }>(({ $color }) => ({
  style: { 
    background: chroma($color).alpha(0.9).hex(),
    color: chroma($color).luminance() > 0.5 ? '#000' : '#fff'
  }
}))`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  z-index: 10;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const ClickableBorder = styled.div`
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border-radius: 14px;
  pointer-events: auto;
  cursor: pointer;
  background: transparent;
`;

const ContextManagerGroup: React.FC<ContextManagerGroupProps> = ({ 
  data, 
  selected, 
  id, 
  dragOverGroupId 
}) => {
  const isDragOver = dragOverGroupId === id;
  const contextColor = CONTEXT_COLORS[data.contextType] || CONTEXT_COLORS.custom;
  const contextIcon = CONTEXT_ICONS[data.contextType] || CONTEXT_ICONS.custom;
  
  const baseColor = chroma(contextColor);
  const backgroundColor = baseColor.alpha(0.05).hex();
  const borderColor = selected ? baseColor.hex() : baseColor.alpha(0.5).hex();
  const headerBg = baseColor.alpha(0.15).hex();
  const headerText = baseColor.luminance() > 0.5 ? '#000' : '#fff';
  
  const isVisible = !!(data.width && data.height && data.hasBeenInitialized);

  return (
    <GroupContainer
      className={`context-manager-group ${selected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
      $width={data.width}
      $height={data.height}
      $backgroundColor={backgroundColor}
      $borderColor={borderColor}
      $isDragOver={isDragOver}
      $isSelected={!!selected}
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      <ClickableBorder />
      
      {/* Header with icon and type */}
      <Header $backgroundColor={headerBg} $textColor={headerText}>
        <IconWrapper>{contextIcon}</IconWrapper>
        <span>{data.label || 'Context Manager'}</span>
        <ContextTypeLabel $color={contextColor}>
          {data.contextType}
        </ContextTypeLabel>
      </Header>

      {/* Child counter */}
      {data.childCount !== undefined && data.childCount > 0 && (
        <ChildCounter $color={contextColor}>
          {data.childCount} {data.childCount === 1 ? 'node' : 'nodes'}
        </ChildCounter>
      )}

      {/* Enter section (__enter__) */}
      <EnterSection>
        <SectionLabel $color="#4CAF50">__enter__</SectionLabel>
        {/* Handles for enter outputs */}
        {data.enterPorts?.map((port, index) => (
          <Handle
            key={`enter-${port.name}`}
            type="source"
            position={Position.Right}
            id={`enter-${port.name}`}
            style={{
              top: 80 + index * 20,
              right: -8,
              background: '#4CAF50',
              width: 12,
              height: 12,
              border: '2px solid #fff',
            }}
            title={`${port.name} (${port.type})`}
          />
        ))}
      </EnterSection>

      {/* Body section (protected code) */}
      <BodySection>
        {data.childCount === 0 ? (
          'Drop nodes here to add to context'
        ) : (
          `${data.childCount} protected ${data.childCount === 1 ? 'operation' : 'operations'}`
        )}
      </BodySection>

      {/* Exit section (__exit__) */}
      <ExitSection>
        <SectionLabel $color="#F44336">__exit__</SectionLabel>
        {/* Handles for exit inputs */}
        {data.exitPorts?.map((port, index) => (
          <Handle
            key={`exit-${port.name}`}
            type="target"
            position={Position.Left}
            id={`exit-${port.name}`}
            style={{
              bottom: 40 + index * 20,
              left: -8,
              background: '#F44336',
              width: 12,
              height: 12,
              border: '2px solid #fff',
            }}
            title={`${port.name} (${port.type})`}
          />
        ))}
      </ExitSection>

      {/* Main input/output handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          top: '50%',
          left: -8,
          background: contextColor,
          width: 14,
          height: 14,
          border: '2px solid #fff',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          top: '50%',
          right: -8,
          background: contextColor,
          width: 14,
          height: 14,
          border: '2px solid #fff',
        }}
      />

      {/* Drag over indicator */}
      {isDragOver && (
        <DragOverIndicator $color={contextColor}>
          Drop to add to context manager
        </DragOverIndicator>
      )}
    </GroupContainer>
  );
};

export default ContextManagerGroup;
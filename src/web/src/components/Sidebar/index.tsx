import { useState } from 'react';
import styled, { css } from 'styled-components';
import { Text } from '@radix-ui/themes';
import { FiBookOpen } from 'react-icons/fi';
import { Node, Edge } from '@xyflow/react';

const panels = [
  {
    key: 'nodeLibrary',
    label: 'Node Library',
    icon: <FiBookOpen size={20} />,
  },
];

const ActivityBar = styled.div`
  width: 48px;
  background: var(--gray-2);
  border-right: 1px solid var(--gray-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 4px;
  z-index: 11;
  overflow: hidden;
`;

const ActivityIcon = styled.button<{ $active: boolean }>`
  width: 40px;
  height: 40px;
  border: none;
  background: none;
  color: var(--gray-10);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  margin-bottom: 2px;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  outline: none;
  ${(props) =>
    props.$active &&
    css`
      background: var(--accent-3, #2e90fa);
      color: var(--accent-11, #1570ef);
    `}
  &:hover {
    background: var(--gray-4);
    color: var(--accent-11, #1570ef);
  }
`;

const SidebarContainer = styled.div<{ width: number }>`
  display: flex;
  height: 100%;
  background: var(--gray-2);
  border-right: 1px solid var(--gray-6);
  width: ${(props) => props.width}px;
  min-width: ${(props) => props.width}px;
  z-index: 10;
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 32px;
  background: var(--gray-2);
  /* Hide scrollbar for Chrome, Safari and Opera */
  &::-webkit-scrollbar {
    display: none;
  }
  /* Hide scrollbar for IE, Edge and Firefox */
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;     /* Firefox */
`;

const PanelHeader = styled.div`
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--gray-6);
  display: flex;
  align-items: center;
  gap: 8px;
`;

// Panel imports
import { NodeLibrary } from './Panels';

interface SidebarProps {
  width?: number;
  nodes?: Node[];
  edges?: Edge[];
  [key: string]: any;
}

export default function Sidebar({ width = 300, nodes = [], edges = [], ...props }: SidebarProps) {
  const [activePanel, setActivePanel] = useState('nodeLibrary');

  const renderPanel = () => {
    switch (activePanel) {
      case 'nodeLibrary':
        return <NodeLibrary />;
      default:
        return null;
    }
  };

  return (
    <SidebarContainer width={width}>
      <SidebarContent>
        <PanelHeader>
          {panels.find((p) => p.key === activePanel)?.icon}
          <Text size="3" weight="medium">
            {panels.find((p) => p.key === activePanel)?.label}
          </Text>
        </PanelHeader>
        {renderPanel()}
      </SidebarContent>
    </SidebarContainer>
  );
} 
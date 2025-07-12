import { useState } from 'react';
import styled, { css } from 'styled-components';
import { Text } from '@radix-ui/themes';
import { FiBookOpen, FiSettings, FiClock, FiLayers } from 'react-icons/fi';
import { Node, Edge } from '@xyflow/react';

const panels = [
  {
    key: 'nodeLibrary',
    label: 'Node Library',
    icon: <FiBookOpen size={20} />,
  },
  {
    key: 'graphStructure',
    label: 'Graph Structure',
    icon: <FiLayers size={20} />,
  },
  {
    key: 'properties',
    label: 'Properties',
    icon: <FiSettings size={20} />,
  },
  {
    key: 'history',
    label: 'History',
    icon: <FiClock size={20} />,
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
  padding: 16px;
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
import { NodeLibrary, Properties, History, GraphStructure } from './Panels';

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
      case 'graphStructure':
        return <GraphStructure nodes={nodes} edges={edges} />;
      case 'properties':
        return <Properties {...props} />;
      case 'history':
        return <History {...props} />;
      default:
        return null;
    }
  };

  return (
    <SidebarContainer width={width}>
      <ActivityBar>
        {panels.map((panel) => (
          <ActivityIcon
            key={panel.key}
            $active={activePanel === panel.key}
            onClick={() => setActivePanel(panel.key)}
            title={panel.label}
            tabIndex={0}
          >
            {panel.icon}
          </ActivityIcon>
        ))}
      </ActivityBar>
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
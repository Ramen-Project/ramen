
import styled from 'styled-components';
import { Text, Button, ScrollArea, Badge } from '@radix-ui/themes';
import { 
  ArrowLeftIcon, 
  ArrowRightIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  GearIcon
} from '@radix-ui/react-icons';
import { useHistoryStore, HistoryEntry } from '../../../stores/HistoryStore';

const PanelContainer = styled.div`
  margin-bottom: 24px;
`;

const PanelHeader = styled.div`
  margin-bottom: 12px;
`;

const HistoryControls = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
`;

const HistoryItem = styled.div.attrs<{ $isActive: boolean }>(({ $isActive }) => ({
  style: {
    background: $isActive ? 'var(--blue-3)' : 'var(--gray-3)',
    borderLeft: `3px solid ${$isActive ? 'var(--blue-9)' : 'transparent'}`
  }
}))`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$isActive ? 'var(--blue-4)' : 'var(--gray-4)'};
  }
`;

const HistoryIcon = styled.div.attrs<{ $type: string }>(({ $type }) => ({
  style: {
    background: (() => {
      switch ($type) {
        case 'add': return 'var(--green-9)';
        case 'delete': return 'var(--red-9)';
        case 'move': return 'var(--blue-9)';
        case 'edit': return 'var(--orange-9)';
        default: return 'var(--gray-9)';
      }
    })()
  }
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

const HistoryInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const HistoryTitle = styled(Text)`
  font-size: 13px;
  font-weight: 500;
  color: var(--gray-12);
  display: block;
`;

const HistoryTime = styled(Text)`
  font-size: 11px;
  color: var(--gray-11);
  display: block;
  margin-top: 2px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px 16px;
  color: var(--gray-11);
`;

interface HistoryProps {
  history?: HistoryEntry[];
  currentIndex?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onGoToHistory?: (index: number) => void;
  onClearHistory?: () => void;
}

export default function History({ 
  history: propHistory,
  currentIndex: propCurrentIndex,
  canUndo: propCanUndo,
  canRedo: propCanRedo,
  onUndo: propOnUndo,
  onRedo: propOnRedo,
  onGoToHistory: propOnGoToHistory,
  onClearHistory: propOnClearHistory
}: HistoryProps) {
  // Use store data if props are not provided
  const storeHistory = useHistoryStore(state => state.history);
  const storeCurrentIndex = useHistoryStore(state => state.currentIndex);
  const storeCanUndo = useHistoryStore(state => state.canUndo());
  const storeCanRedo = useHistoryStore(state => state.canRedo());
  const storeUndo = useHistoryStore(state => state.undo);
  const storeRedo = useHistoryStore(state => state.redo);
  const storeGoToHistory = useHistoryStore(state => state.goToHistory);
  const storeClearHistory = useHistoryStore(state => state.clearHistory);

  // Use props if provided, otherwise use store
  const history = propHistory || storeHistory;
  const currentIndex = propCurrentIndex ?? storeCurrentIndex;
  const canUndo = propCanUndo ?? storeCanUndo;
  const canRedo = propCanRedo ?? storeCanRedo;

  const handleUndo = () => {
    if (propOnUndo) {
      propOnUndo();
    } else if ((window as any).graphUndo) {
      (window as any).graphUndo();
    } else {
      storeUndo();
    }
  };

  const handleRedo = () => {
    if (propOnRedo) {
      propOnRedo();
    } else if ((window as any).graphRedo) {
      (window as any).graphRedo();
    } else {
      storeRedo();
    }
  };

  const handleGoToHistory = (index: number) => {
    if (propOnGoToHistory) {
      propOnGoToHistory(index);
    } else if ((window as any).graphGoToHistory) {
      (window as any).graphGoToHistory(index);
    } else {
      storeGoToHistory(index);
    }
  };

  const handleClearHistory = () => {
    if (propOnClearHistory) {
      propOnClearHistory();
    } else {
      storeClearHistory();
    }
  };

  const getHistoryIcon = (type: string) => {
    switch (type) {
      case 'add': return <PlusIcon />;
      case 'delete': return <MinusIcon />;
      case 'move': return <ArrowRightIcon />;
      case 'edit': return <GearIcon />;
      case 'connect': return <PlusIcon />;
      case 'disconnect': return <MinusIcon />;
      case 'group': return <PlusIcon />;
      case 'ungroup': return <MinusIcon />;
      default: return <GearIcon />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <PanelContainer>

      <HistoryControls>
        <Button 
          variant="outline" 
          size="1" 
          onClick={handleUndo}
          disabled={!canUndo}
        >
          <ArrowLeftIcon />
          Undo
        </Button>
        <Button 
          variant="outline" 
          size="1" 
          onClick={handleRedo}
          disabled={!canRedo}
        >
          Redo
          <ArrowRightIcon />
        </Button>
        <Button 
          variant="ghost" 
          size="1" 
          onClick={handleClearHistory}
          style={{ marginLeft: 'auto' }}
        >
          <TrashIcon />
        </Button>
      </HistoryControls>

      <ScrollArea style={{ height: 'calc(100vh - 200px)' }}>
        {history.length === 0 ? (
          <EmptyState>
            <Text size="2" style={{ display: 'block', marginBottom: 4 }}>No history yet</Text>
            <Text size="1" color="gray" style={{ display: 'block' }}>
              Start editing to see your history
            </Text>
          </EmptyState>
        ) : (
          history.map((entry, index) => (
            <HistoryItem
              key={entry.id}
              $isActive={index === currentIndex}
              onClick={() => handleGoToHistory(index)}
            >
              <HistoryIcon $type={entry.type}>
                {getHistoryIcon(entry.type)}
              </HistoryIcon>
              <HistoryInfo>
                <HistoryTitle>{entry.title}</HistoryTitle>
                <HistoryTime>{formatTime(entry.timestamp)}</HistoryTime>
              </HistoryInfo>
              {index === currentIndex && (
                <Badge variant="solid" size="1">
                  Current
                </Badge>
              )}
            </HistoryItem>
          ))
        )}
      </ScrollArea>
    </PanelContainer>
  );
} 
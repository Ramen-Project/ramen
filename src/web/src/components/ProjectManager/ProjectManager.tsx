import React, { useState } from 'react';
import styled from 'styled-components';
import { useProjectStore } from '../../stores/ProjectStore';
import { useGraphStore } from '../../stores/GraphStore';
import { CreateProjectDialog } from './CreateProjectDialog';
import { ProjectInfoPanel } from './ProjectInfoPanel';
import { GraphListPanel } from './GraphListPanel';

const ProjectManagerContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-background);
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background-secondary);
`;

const ProjectTitle = styled.h1`
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 6px 12px;
  border: 1px solid;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: white;
          
          &:hover {
            background: var(--color-primary-hover);
            border-color: var(--color-primary-hover);
          }
        `;
      case 'danger':
        return `
          background: var(--color-danger);
          border-color: var(--color-danger);
          color: white;
          
          &:hover {
            background: var(--color-danger-hover);
            border-color: var(--color-danger-hover);
          }
        `;
      default:
        return `
          background: var(--color-background);
          border-color: var(--color-border);
          color: var(--color-text);
          
          &:hover {
            background: var(--color-background-hover);
            border-color: var(--color-border-hover);
          }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const LeftPanel = styled.div`
  width: 300px;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
`;

const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const StatusBar = styled.div`
  padding: 4px 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-background-secondary);
  font-size: 12px;
  color: var(--color-text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SaveIndicator = styled.span<{ $hasUnsavedChanges: boolean }>`
  color: ${props => props.$hasUnsavedChanges ? 'var(--color-warning)' : 'var(--color-success)'};
  font-weight: 500;
`;

export const ProjectManager: React.FC = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    currentProject,
    isProjectLoaded,
    hasUnsavedChanges,
    lastSavedAt,
    projectFilePath,
    createProject,
    openProject,
    saveProject,
    saveProjectAs,
    closeProject
  } = useProjectStore();
  
  const { setActiveGraph } = useGraphStore();
  
  const handleCreateProject = async (name: string, description?: string) => {
    setIsLoading(true);
    try {
      await createProject(name, description);
      setShowCreateDialog(false);
      
      // 切換到新專案的第一個圖形
      if (currentProject?.graphs[0]) {
        setActiveGraph(currentProject.graphs[0].id);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenProject = async () => {
    // 使用瀏覽器文件選擇器
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ramen-project';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setIsLoading(true);
      try {
        await openProject(file.path || file.name);
        
        // 切換到專案的第一個圖形
        if (currentProject?.graphs[0]) {
          setActiveGraph(currentProject.graphs[0].id);
        }
      } catch (error) {
        console.error('Failed to open project:', error);
        alert('Failed to open project. Please check the file and try again.');
      } finally {
        setIsLoading(false);
      }
    };
    input.click();
  };
  
  const handleSaveProject = async () => {
    setIsLoading(true);
    try {
      if (projectFilePath) {
        await saveProject();
      } else {
        // 如果沒有檔案路徑，使用另存新檔
        const fileName = `${currentProject?.name || 'project'}.ramen-project`;
        await saveProjectAs(fileName);
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveProjectAs = async () => {
    if (!currentProject) return;
    
    // 使用瀏覽器檔案保存對話框（在實際應用中可能需要不同的實現）
    const fileName = prompt('Enter file name:', `${currentProject.name}.ramen-project`);
    if (!fileName) return;
    
    setIsLoading(true);
    try {
      await saveProjectAs(fileName);
    } catch (error) {
      console.error('Failed to save project as:', error);
      alert('Failed to save project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCloseProject = async () => {
    setIsLoading(true);
    try {
      await closeProject();
    } catch (error) {
      console.error('Failed to close project:', error);
      alert('Failed to close project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatLastSaved = (lastSavedAt: string | null) => {
    if (!lastSavedAt) return 'Never saved';
    
    const date = new Date(lastSavedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Saved just now';
    if (diffMinutes < 60) return `Saved ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Saved ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return `Saved on ${date.toLocaleDateString()}`;
  };
  
  return (
    <ProjectManagerContainer>
      <TopBar>
        <ProjectTitle>
          {currentProject ? currentProject.name : 'Ramen Project Manager'}
        </ProjectTitle>
        
        <ButtonGroup>
          <Button onClick={() => setShowCreateDialog(true)} disabled={isLoading}>
            New Project
          </Button>
          <Button onClick={handleOpenProject} disabled={isLoading}>
            Open Project
          </Button>
          {isProjectLoaded && (
            <>
              <Button 
                onClick={handleSaveProject} 
                disabled={isLoading || !hasUnsavedChanges}
                variant="primary"
              >
                Save
              </Button>
              <Button onClick={handleSaveProjectAs} disabled={isLoading}>
                Save As...
              </Button>
              <Button onClick={handleCloseProject} disabled={isLoading} variant="danger">
                Close Project
              </Button>
            </>
          )}
        </ButtonGroup>
      </TopBar>
      
      {isProjectLoaded && currentProject ? (
        <MainContent>
          <LeftPanel>
            <ProjectInfoPanel project={currentProject} />
            <GraphListPanel 
              graphs={currentProject.graphs}
              onGraphSelect={(graphId) => setActiveGraph(graphId)}
            />
          </LeftPanel>
          <RightPanel>
            {/* 這裡將來可以顯示圖形編輯器或其他內容 */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--color-text-secondary)'
            }}>
              Select a graph from the left panel to edit
            </div>
          </RightPanel>
        </MainContent>
      ) : (
        <MainContent>
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '24px',
            color: 'var(--color-text-secondary)'
          }}>
            <h2>Welcome to Ramen</h2>
            <p>Create a new project or open an existing one to get started.</p>
            <ButtonGroup>
              <Button 
                variant="primary" 
                onClick={() => setShowCreateDialog(true)}
                disabled={isLoading}
              >
                Create New Project
              </Button>
              <Button onClick={handleOpenProject} disabled={isLoading}>
                Open Existing Project
              </Button>
            </ButtonGroup>
          </div>
        </MainContent>
      )}
      
      <StatusBar>
        <span>
          {isProjectLoaded ? (
            <>
              Project: {projectFilePath || 'Untitled'} | 
              Graphs: {currentProject?.graphs.length || 0}
            </>
          ) : (
            'No project loaded'
          )}
        </span>
        
        {isProjectLoaded && (
          <SaveIndicator $hasUnsavedChanges={hasUnsavedChanges}>
            {hasUnsavedChanges ? 'Unsaved changes' : formatLastSaved(lastSavedAt)}
          </SaveIndicator>
        )}
      </StatusBar>
      
      {showCreateDialog && (
        <CreateProjectDialog
          onConfirm={handleCreateProject}
          onCancel={() => setShowCreateDialog(false)}
          isLoading={isLoading}
        />
      )}
    </ProjectManagerContainer>
  );
};
import React, { useState } from 'react';
import styled from 'styled-components';
import { RamenProject } from '../../types/graph';
import { useProjectStore } from '../../stores/ProjectStore';

const Panel = styled.div`
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
`;

const PanelTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
`;

const InfoLabel = styled.span`
  color: var(--color-text-secondary);
  font-weight: 500;
`;

const InfoValue = styled.span`
  color: var(--color-text);
  text-align: right;
`;

const EditableValue = styled.input`
  background: transparent;
  border: none;
  color: var(--color-text);
  text-align: right;
  font-size: 14px;
  font-family: inherit;
  padding: 2px 4px;
  border-radius: 2px;
  
  &:focus {
    outline: none;
    background: var(--color-background-hover);
    border: 1px solid var(--color-primary);
  }
`;

const EditableTextArea = styled.textarea`
  width: 100%;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 14px;
  font-family: inherit;
  padding: 8px;
  border-radius: 4px;
  resize: vertical;
  min-height: 60px;
  margin-top: 8px;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
  }
`;

const EditButton = styled.button`
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 2px;
  
  &:hover {
    background: var(--color-background-hover);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 8px;
`;

const SmallButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 4px 8px;
  border: 1px solid;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.variant === 'primary' ? `
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
    
    &:hover {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }
  ` : `
    background: var(--color-background);
    border-color: var(--color-border);
    color: var(--color-text);
    
    &:hover {
      background: var(--color-background-hover);
      border-color: var(--color-border-hover);
    }
  `}
`;

const DescriptionContainer = styled.div`
  margin-top: 12px;
`;

const DescriptionText = styled.p`
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 8px 0 0 0;
  line-height: 1.4;
  word-wrap: break-word;
`;

interface ProjectInfoPanelProps {
  project: RamenProject;
}

export const ProjectInfoPanel: React.FC<ProjectInfoPanelProps> = ({ project }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [tempName, setTempName] = useState(project.name);
  const [tempDescription, setTempDescription] = useState(project.description || '');
  
  const { updateProjectInfo } = useProjectStore();
  
  const handleNameEdit = () => {
    setTempName(project.name);
    setIsEditingName(true);
  };
  
  const handleNameSave = () => {
    if (tempName.trim() && tempName.trim() !== project.name) {
      updateProjectInfo({ name: tempName.trim() });
    }
    setIsEditingName(false);
  };
  
  const handleNameCancel = () => {
    setTempName(project.name);
    setIsEditingName(false);
  };
  
  const handleDescriptionEdit = () => {
    setTempDescription(project.description || '');
    setIsEditingDescription(true);
  };
  
  const handleDescriptionSave = () => {
    updateProjectInfo({ description: tempDescription.trim() || undefined });
    setIsEditingDescription(false);
  };
  
  const handleDescriptionCancel = () => {
    setTempDescription(project.description || '');
    setIsEditingDescription(false);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  return (
    <Panel>
      <PanelTitle>Project Information</PanelTitle>
      
      <InfoRow>
        <InfoLabel>Name:</InfoLabel>
        {isEditingName ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <EditableValue
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSave();
                if (e.key === 'Escape') handleNameCancel();
              }}
              autoFocus
            />
            <ButtonGroup>
              <SmallButton variant="primary" onClick={handleNameSave}>
                Save
              </SmallButton>
              <SmallButton onClick={handleNameCancel}>
                Cancel
              </SmallButton>
            </ButtonGroup>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <InfoValue>{project.name}</InfoValue>
            <EditButton onClick={handleNameEdit}>Edit</EditButton>
          </div>
        )}
      </InfoRow>
      
      <InfoRow>
        <InfoLabel>Version:</InfoLabel>
        <InfoValue>{project.version}</InfoValue>
      </InfoRow>
      
      <InfoRow>
        <InfoLabel>Graphs:</InfoLabel>
        <InfoValue>{project.graphs.length}</InfoValue>
      </InfoRow>
      
      <InfoRow>
        <InfoLabel>Created:</InfoLabel>
        <InfoValue>{formatDate(project.created_at)}</InfoValue>
      </InfoRow>
      
      <InfoRow>
        <InfoLabel>Modified:</InfoLabel>
        <InfoValue>{formatDate(project.last_modified)}</InfoValue>
      </InfoRow>
      
      <DescriptionContainer>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <InfoLabel>Description:</InfoLabel>
          {!isEditingDescription && (
            <EditButton onClick={handleDescriptionEdit}>
              {project.description ? 'Edit' : 'Add'}
            </EditButton>
          )}
        </div>
        
        {isEditingDescription ? (
          <div>
            <EditableTextArea
              value={tempDescription}
              onChange={(e) => setTempDescription(e.target.value)}
              placeholder="Enter project description..."
              autoFocus
            />
            <ButtonGroup>
              <SmallButton variant="primary" onClick={handleDescriptionSave}>
                Save
              </SmallButton>
              <SmallButton onClick={handleDescriptionCancel}>
                Cancel
              </SmallButton>
            </ButtonGroup>
          </div>
        ) : (
          <DescriptionText>
            {project.description || <em>No description provided</em>}
          </DescriptionText>
        )}
      </DescriptionContainer>
    </Panel>
  );
};
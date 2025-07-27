import React, { useState } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Dialog = styled.div`
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const DialogTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  background: var(--color-background);
  color: var(--color-text);
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  background: var(--color-background);
  color: var(--color-text);
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border: 1px solid;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.variant === 'primary' ? `
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
    
    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }
  ` : `
    background: var(--color-background);
    border-color: var(--color-border);
    color: var(--color-text);
    
    &:hover:not(:disabled) {
      background: var(--color-background-hover);
      border-color: var(--color-border-hover);
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.div`
  color: var(--color-danger);
  font-size: 12px;
  margin-top: 4px;
`;

interface CreateProjectDialogProps {
  onConfirm: (name: string, description?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 驗證專案名稱
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    
    if (name.trim().length < 2) {
      setError('Project name must be at least 2 characters long');
      return;
    }
    
    // 檢查專案名稱是否包含無效字元
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      setError('Project name contains invalid characters');
      return;
    }
    
    setError('');
    onConfirm(name.trim(), description.trim() || undefined);
  };
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel();
    }
  };
  
  return (
    <Overlay onClick={handleOverlayClick} data-testid="dialog-overlay">
      <Dialog role="dialog" aria-labelledby="dialog-title">
        <DialogTitle id="dialog-title">Create New Project</DialogTitle>
        
        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="project-name">Project Name *</Label>
            <Input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              disabled={isLoading}
              autoFocus
            />
            {error && <ErrorText>{error}</ErrorText>}
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="project-description">Description</Label>
            <TextArea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description (optional)"
              disabled={isLoading}
            />
          </FormGroup>
          
          <ButtonGroup>
            <Button type="button" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Project'}
            </Button>
          </ButtonGroup>
        </form>
      </Dialog>
    </Overlay>
  );
};
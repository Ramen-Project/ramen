import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import styled from 'styled-components';

const DialogOverlay = styled(Dialog.Overlay)`
  background-color: rgba(0, 0, 0, 0.7);
  position: fixed;
  inset: 0;
  z-index: 1000;
`;

const DialogContent = styled(Dialog.Content)`
  background-color: var(--gray-1);
  border: 1px solid var(--gray-5);
  border-radius: 8px;
  box-shadow: 0 10px 38px -10px rgba(0, 0, 0, 0.8), 0 10px 20px -15px rgba(0, 0, 0, 0.6);
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  max-width: 500px;
  max-height: 85vh;
  padding: 24px;
  z-index: 1001;
  
  &:focus {
    outline: none;
  }
`;

const DialogTitle = styled(Dialog.Title)`
  margin: 0 0 16px 0;
  font-weight: 600;
  color: var(--gray-12);
  font-size: 20px;
`;

const DialogDescription = styled(Dialog.Description)`
  margin: 0 0 20px 0;
  color: var(--gray-11);
  font-size: 15px;
  line-height: 1.5;
`;

const DialogClose = styled(Dialog.Close)`
  font-family: inherit;
  border-radius: 4px;
  height: 25px;
  width: 25px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-10);
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  
  &:hover {
    background-color: var(--gray-3);
    color: var(--gray-12);
  }
  
  &:focus {
    outline: 2px solid var(--accent-8);
    background-color: var(--gray-3);
  }
`;

const InfoSection = styled.div`
  margin-bottom: 20px;
`;

const InfoLabel = styled.div`
  font-weight: 600;
  color: var(--gray-12);
  margin-bottom: 4px;
  font-size: 14px;
`;

const InfoValue = styled.div`
  color: var(--gray-10);
  font-size: 14px;
  font-family: monospace;
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: var(--accent-10);
  margin-bottom: 8px;
`;

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>
            <Logo>🍜 Ramen</Logo>
            About Ramen
          </DialogTitle>
          
          <DialogDescription>
            A visual programming environment for Python that allows users to design and execute computational graphs through a node-based web interface.
          </DialogDescription>
          
          <InfoSection>
            <InfoLabel>Version</InfoLabel>
            <InfoValue>1.0.0-beta</InfoValue>
          </InfoSection>
          
          <InfoSection>
            <InfoLabel>Architecture</InfoLabel>
            <InfoValue>
              • Python backend with graph engine and execution runtime<br/>
              • React frontend with visual graph editor<br/>
              • Toppings system for extensible functionality
            </InfoValue>
          </InfoSection>
          
          <InfoSection>
            <InfoLabel>Technologies</InfoLabel>
            <InfoValue>
              React • TypeScript • React Flow • Python • uv • Zustand
            </InfoValue>
          </InfoSection>
          
          <InfoSection>
            <InfoLabel>Build</InfoLabel>
            <InfoValue>Development Build</InfoValue>
          </InfoSection>
          
          <DialogClose asChild>
            <button aria-label="Close">
              <Cross2Icon />
            </button>
          </DialogClose>
        </DialogContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AboutModal;
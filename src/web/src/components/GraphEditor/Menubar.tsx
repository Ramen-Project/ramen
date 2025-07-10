import React from 'react';
import * as Menubar from '@radix-ui/react-menubar';
import { 
  FileTextIcon, 
  Pencil1Icon, 
  EyeOpenIcon,
  PlusIcon,
  TrashIcon,
  CopyIcon,
  ClipboardIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  ResetIcon
} from '@radix-ui/react-icons';
import styled from 'styled-components';

const MenubarRoot = styled(Menubar.Root)`
  display: flex;
  background-color: var(--gray-2);
  border-bottom: 1px solid var(--gray-6);
  padding: 4px 8px;
  gap: 4px;
  user-select: none;
`;

const MenubarTrigger = styled(Menubar.Trigger)`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--gray-11);
  background: transparent;
  border: none;
  cursor: pointer;
  
  &:hover {
    background-color: var(--gray-4);
  }
  
  &[data-state="open"] {
    background-color: var(--gray-5);
  }
`;

const MenubarContent = styled(Menubar.Content)`
  min-width: 180px;
  background-color: var(--gray-2);
  border: 1px solid var(--gray-6);
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
`;

const MenubarItem = styled(Menubar.Item)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--gray-11);
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  
  &:hover {
    background-color: var(--gray-4);
  }
  
  &:focus {
    outline: none;
    background-color: var(--gray-4);
  }
`;

const MenubarSeparator = styled(Menubar.Separator)`
  height: 1px;
  background-color: var(--gray-6);
  margin: 4px 0;
`;

const MenubarLabel = styled(Menubar.Label)`
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--gray-9);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MenubarSubTrigger = styled(Menubar.SubTrigger)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--gray-11);
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  
  &:hover {
    background-color: var(--gray-4);
  }
`;

const MenubarSubContent = styled(Menubar.SubContent)`
  min-width: 180px;
  background-color: var(--gray-2);
  border: 1px solid var(--gray-6);
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;



const EditorMenubar: React.FC = () => {
  return (
    <MenubarRoot>
      <Menubar.Menu>
        <MenubarTrigger>
          <FileTextIcon />
          File
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <PlusIcon />
            New Graph
          </MenubarItem>
          <MenubarItem>
            <FileTextIcon />
            Open...
          </MenubarItem>
          <MenubarItem>
            <FileTextIcon />
            Save
          </MenubarItem>
          <MenubarItem>
            <FileTextIcon />
            Save As...
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            <FileTextIcon />
            Export...
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            <FileTextIcon />
            Exit
          </MenubarItem>
        </MenubarContent>
      </Menubar.Menu>

      <Menubar.Menu>
        <MenubarTrigger>
          <Pencil1Icon />
          Edit
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <ArrowLeftIcon />
            Undo
          </MenubarItem>
          <MenubarItem>
            <ArrowRightIcon />
            Redo
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            <CopyIcon />
            Copy
          </MenubarItem>
          <MenubarItem>
            <ClipboardIcon />
            Paste
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            <TrashIcon />
            Delete
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            <PlusIcon />
            Create Subflow
          </MenubarItem>
          <MenubarItem>
            <TrashIcon />
            Ungroup Subflow
          </MenubarItem>
        </MenubarContent>
      </Menubar.Menu>

      <Menubar.Menu>
        <MenubarTrigger>
          <EyeOpenIcon />
          View
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <MagnifyingGlassIcon />
            Zoom In
          </MenubarItem>
          <MenubarItem>
            <MinusIcon />
            Zoom Out
          </MenubarItem>
          <MenubarItem>
            <ResetIcon />
            Fit View
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            <EyeOpenIcon />
            Show Grid
          </MenubarItem>
          <MenubarItem>
            <EyeOpenIcon />
            Show Mini Map
          </MenubarItem>
          <MenubarSeparator />
          <MenubarLabel>Theme</MenubarLabel>
          <MenubarItem>
            <FileTextIcon />
            Light Theme
          </MenubarItem>
          <MenubarItem>
            <FileTextIcon />
            Dark Theme
          </MenubarItem>
        </MenubarContent>
      </Menubar.Menu>

      <Menubar.Menu>
        <MenubarTrigger>
          Help
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            <FileTextIcon />
            Documentation
          </MenubarItem>
          <MenubarItem>
            <FileTextIcon />
            About
          </MenubarItem>
        </MenubarContent>
      </Menubar.Menu>
    </MenubarRoot>
  );
};

export default EditorMenubar; 
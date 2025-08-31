import * as vscode from 'vscode';
import * as path from 'path';
import { CommandMetadata, CommandHandler, CommandContext } from './commandRegistry';

// Graph Commands
export const graphCommands: Array<{ metadata: CommandMetadata; handler: CommandHandler }> = [
    {
        metadata: {
            id: 'createGraph',
            title: 'Create New Ramen Graph',
            category: 'Graph',
            icon: '$(add)',
            keybinding: 'ctrl+alt+n'
        },
        handler: async (context: CommandContext) => {
            const workspaceFolder = context.workspaceFolder;
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            
            const graphName = await vscode.window.showInputBox({
                prompt: 'Enter graph name',
                placeHolder: 'my_graph',
                validateInput: (value) => {
                    if (!value) { return 'Graph name is required'; }
                    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                        return 'Graph name must contain only alphanumeric characters and underscores';
                    }
                    return null;
                }
            });
            
            if (graphName) {
                const graphPath = path.join(workspaceFolder.uri.fsPath, `${graphName}.ramen`);
                const graphUri = vscode.Uri.file(graphPath);
                
                // Create initial graph content
                const initialContent = JSON.stringify({
                    version: '1.0.0',
                    nodes: [],
                    edges: [],
                    metadata: {
                        name: graphName,
                        created: new Date().toISOString(),
                        modified: new Date().toISOString()
                    }
                }, null, 2);
                
                await vscode.workspace.fs.writeFile(
                    graphUri,
                    Buffer.from(initialContent)
                );
                
                // Open the graph
                await vscode.commands.executeCommand('vscode.open', graphUri);
                vscode.window.showInformationMessage(`Created graph: ${graphName}`);
            }
        }
    },
    {
        metadata: {
            id: 'openGraph',
            title: 'Open Ramen Graph',
            category: 'Graph',
            icon: '$(file)',
            keybinding: 'ctrl+alt+o'
        },
        handler: async (_context: CommandContext) => {
            const files = await vscode.workspace.findFiles('**/*.ramen');
            
            if (files.length === 0) {
                vscode.window.showInformationMessage('No Ramen graphs found in workspace');
                return;
            }
            
            const items = files.map(file => ({
                label: path.basename(file.fsPath, '.ramen'),
                description: vscode.workspace.asRelativePath(file),
                uri: file
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a graph to open'
            });
            
            if (selected) {
                await vscode.commands.executeCommand('vscode.open', selected.uri);
            }
        }
    },
    {
        metadata: {
            id: 'deleteGraph',
            title: 'Delete Ramen Graph',
            category: 'Graph',
            icon: '$(trash)',
            when: 'resourceExtname == .ramen'
        },
        handler: async (context: CommandContext, uri?: vscode.Uri) => {
            const targetUri = uri || context.activeEditor?.document.uri;
            
            if (!targetUri || !targetUri.fsPath.endsWith('.ramen')) {
                vscode.window.showErrorMessage('No Ramen graph selected');
                return;
            }
            
            const graphName = path.basename(targetUri.fsPath, '.ramen');
            const confirmed = await vscode.window.showWarningMessage(
                `Are you sure you want to delete "${graphName}"?`,
                'Delete',
                'Cancel'
            );
            
            if (confirmed === 'Delete') {
                await vscode.workspace.fs.delete(targetUri);
                vscode.window.showInformationMessage(`Deleted graph: ${graphName}`);
            }
        }
    },
    {
        metadata: {
            id: 'duplicateGraph',
            title: 'Duplicate Ramen Graph',
            category: 'Graph',
            icon: '$(files)',
            when: 'resourceExtname == .ramen'
        },
        handler: async (context: CommandContext, uri?: vscode.Uri) => {
            const sourceUri = uri || context.activeEditor?.document.uri;
            
            if (!sourceUri || !sourceUri.fsPath.endsWith('.ramen')) {
                vscode.window.showErrorMessage('No Ramen graph selected');
                return;
            }
            
            const sourceName = path.basename(sourceUri.fsPath, '.ramen');
            const newName = await vscode.window.showInputBox({
                prompt: 'Enter new graph name',
                value: `${sourceName}_copy`,
                validateInput: (value) => {
                    if (!value) { return 'Graph name is required'; }
                    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                        return 'Graph name must contain only alphanumeric characters and underscores';
                    }
                    return null;
                }
            });
            
            if (newName) {
                const targetPath = path.join(
                    path.dirname(sourceUri.fsPath),
                    `${newName}.ramen`
                );
                const targetUri = vscode.Uri.file(targetPath);
                
                await vscode.workspace.fs.copy(sourceUri, targetUri);
                await vscode.commands.executeCommand('vscode.open', targetUri);
                vscode.window.showInformationMessage(`Duplicated graph as: ${newName}`);
            }
        }
    },
    {
        metadata: {
            id: 'exportGraph',
            title: 'Export Graph as Python',
            category: 'Graph',
            icon: '$(export)',
            when: 'resourceExtname == .ramen'
        },
        handler: async (context: CommandContext, uri?: vscode.Uri) => {
            const graphUri = uri || context.activeEditor?.document.uri;
            
            if (!graphUri || !graphUri.fsPath.endsWith('.ramen')) {
                vscode.window.showErrorMessage('No Ramen graph selected');
                return;
            }
            
            const graphName = path.basename(graphUri.fsPath, '.ramen');
            const pythonPath = path.join(
                path.dirname(graphUri.fsPath),
                `${graphName}.py`
            );
            
            // Here we would call the backend to compile the graph
            vscode.window.showInformationMessage(`Exporting ${graphName} to Python...`);
            
            // Placeholder for actual export logic
            const pythonContent = `# Generated from ${graphName}.ramen
# This is a placeholder - actual compilation will be implemented
import ramen

def main():
    pass

if __name__ == "__main__":
    main()
`;
            
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(pythonPath),
                Buffer.from(pythonContent)
            );
            
            await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(pythonPath));
            vscode.window.showInformationMessage(`Exported to: ${path.basename(pythonPath)}`);
        }
    }
];

// Execution Commands
export const executionCommands: Array<{ metadata: CommandMetadata; handler: CommandHandler }> = [
    {
        metadata: {
            id: 'executeGraph',
            title: 'Execute Ramen Graph',
            category: 'Execution',
            icon: '$(play)',
            keybinding: 'f5',
            when: 'resourceExtname == .ramen'
        },
        handler: async (context: CommandContext, uri?: vscode.Uri) => {
            const graphUri = uri || context.activeEditor?.document.uri;
            
            if (!graphUri || !graphUri.fsPath.endsWith('.ramen')) {
                vscode.window.showErrorMessage('No Ramen graph selected');
                return;
            }
            
            const graphName = path.basename(graphUri.fsPath, '.ramen');
            vscode.window.showInformationMessage(`Executing graph: ${graphName}`);
            
            // Create output channel for execution results
            const outputChannel = vscode.window.createOutputChannel('Ramen Execution');
            outputChannel.show();
            outputChannel.appendLine(`Executing graph: ${graphUri.fsPath}`);
            outputChannel.appendLine('---');
            
            // Update state to indicate execution
            context.stateManager.update('execution.running', true);
            context.stateManager.update('execution.graphUri', graphUri.toString());
            
            outputChannel.appendLine('Graph execution started');
            
            // Reset execution state after completion
            setTimeout(() => {
                context.stateManager.update('execution.running', false);
            }, 1000);
        }
    },
    {
        metadata: {
            id: 'debugGraph',
            title: 'Debug Ramen Graph',
            category: 'Execution',
            icon: '$(debug)',
            keybinding: 'shift+f5',
            when: 'resourceExtname == .ramen'
        },
        handler: async (context: CommandContext, uri?: vscode.Uri) => {
            const graphUri = uri || context.activeEditor?.document.uri;
            
            if (!graphUri || !graphUri.fsPath.endsWith('.ramen')) {
                vscode.window.showErrorMessage('No Ramen graph selected');
                return;
            }
            
            const graphName = path.basename(graphUri.fsPath, '.ramen');
            vscode.window.showInformationMessage(`Starting debug session for: ${graphName}`);
            
            // Set debug mode
            context.stateManager.update('debug.enabled', true);
            context.stateManager.update('debug.graphUri', graphUri.toString());
            context.stateManager.update('execution.running', true);
            
            // Create output channel for debug
            const outputChannel = vscode.window.createOutputChannel('Ramen Debug');
            outputChannel.show();
            outputChannel.appendLine(`Debug session started for: ${graphUri.fsPath}`);
            outputChannel.appendLine('Debug mode enabled');
            
            // Reset after debug session
            setTimeout(() => {
                context.stateManager.update('execution.running', false);
                context.stateManager.update('debug.enabled', false);
            }, 1000);
        }
    },
    {
        metadata: {
            id: 'stopExecution',
            title: 'Stop Graph Execution',
            category: 'Execution',
            icon: '$(stop)',
            keybinding: 'shift+f5',
            when: 'ramen.isExecuting'
        },
        handler: async (context: CommandContext) => {
            vscode.window.showInformationMessage('Stopping execution...');
            context.stateManager.update('execution.stop', true);
        }
    }
];

// Server Commands
export const serverCommands: Array<{ metadata: CommandMetadata; handler: CommandHandler }> = [
    {
        metadata: {
            id: 'startServer',
            title: 'Start Ramen Server',
            category: 'Server',
            icon: '$(server-process)'
        },
        handler: async (context: CommandContext) => {
            vscode.window.showInformationMessage('Starting Ramen server...');
            context.stateManager.update('server.starting', true);
        }
    },
    {
        metadata: {
            id: 'stopServer',
            title: 'Stop Ramen Server',
            category: 'Server',
            icon: '$(server-environment)'
        },
        handler: async (context: CommandContext) => {
            vscode.window.showInformationMessage('Stopping Ramen server...');
            context.stateManager.update('server.running', false);
        }
    },
    {
        metadata: {
            id: 'restartServer',
            title: 'Restart Ramen Server',
            category: 'Server',
            icon: '$(refresh)',
            keybinding: 'ctrl+alt+r'
        },
        handler: async (context: CommandContext) => {
            vscode.window.showInformationMessage('Restarting Ramen server...');
            context.stateManager.update('server.restarting', true);
            setTimeout(() => {
                context.stateManager.update('server.restarting', false);
                context.stateManager.update('server.running', true);
            }, 2000);
        }
    },
    {
        metadata: {
            id: 'serverStatus',
            title: 'Show Server Status',
            category: 'Server',
            icon: '$(info)'
        },
        handler: async (context: CommandContext) => {
            const isRunning = context.stateManager.get<boolean>('server.running') || false;
            const port = context.stateManager.get<number>('server.port') || 8000;
            const uptime = context.stateManager.get<number>('server.uptime') || 0;
            
            const status = isRunning 
                ? `Running on port ${port} (uptime: ${Math.floor(uptime / 1000)}s)`
                : 'Not running';
            
            vscode.window.showInformationMessage(`Server status: ${status}`);
        }
    }
];

// View Commands  
export const viewCommands: Array<{ metadata: CommandMetadata; handler: CommandHandler }> = [
    {
        metadata: {
            id: 'showGraphExplorer',
            title: 'Show Graph Explorer',
            category: 'View',
            icon: '$(graph)'
        },
        handler: async () => {
            await vscode.commands.executeCommand('ramenGraphs.focus');
        }
    },
    {
        metadata: {
            id: 'showVariablesView',
            title: 'Show Variables View',
            category: 'View',
            icon: '$(symbol-variable)'
        },
        handler: async () => {
            await vscode.commands.executeCommand('ramenVariables.focus');
        }
    },
    {
        metadata: {
            id: 'showServerView',
            title: 'Show Server View',
            category: 'View',
            icon: '$(server)'
        },
        handler: async () => {
            await vscode.commands.executeCommand('ramenServer.focus');
        }
    },
    {
        metadata: {
            id: 'showDependenciesView',
            title: 'Show Dependencies View',
            category: 'View',
            icon: '$(package)'
        },
        handler: async () => {
            await vscode.commands.executeCommand('ramenDependencies.focus');
        }
    },
    {
        metadata: {
            id: 'showOutputChannel',
            title: 'Show Ramen Output',
            category: 'View',
            icon: '$(output)'
        },
        handler: async () => {
            const outputChannel = vscode.window.createOutputChannel('Ramen');
            outputChannel.show();
        }
    },
    {
        metadata: {
            id: 'toggleSidebar',
            title: 'Toggle Ramen Sidebar',
            category: 'View',
            keybinding: 'ctrl+alt+b'
        },
        handler: async (context: CommandContext) => {
            const isVisible = context.stateManager.get<boolean>('sidebar.visible') !== false;
            context.stateManager.update('sidebar.visible', !isVisible);
            
            // Toggle sidebar visibility
            if (!isVisible) {
                await vscode.commands.executeCommand('workbench.view.extension.ramen-sidebar');
            } else {
                await vscode.commands.executeCommand('workbench.action.closeSidebar');
            }
        }
    }
];

// Development Commands
export const developmentCommands: Array<{ metadata: CommandMetadata; handler: CommandHandler }> = [
    {
        metadata: {
            id: 'reloadExtension',
            title: 'Reload Ramen Extension',
            category: 'Development',
            icon: '$(extensions-refresh)'
        },
        handler: async () => {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    },
    {
        metadata: {
            id: 'openDevTools',
            title: 'Open Developer Tools',
            category: 'Development',
            icon: '$(tools)',
            keybinding: 'ctrl+shift+i'
        },
        handler: async () => {
            await vscode.commands.executeCommand('workbench.action.toggleDevTools');
        }
    },
    {
        metadata: {
            id: 'clearCache',
            title: 'Clear Ramen Cache',
            category: 'Development',
            icon: '$(clear-all)'
        },
        handler: async (context: CommandContext) => {
            context.stateManager.clear();
            vscode.window.showInformationMessage('Ramen cache cleared');
        }
    },
    {
        metadata: {
            id: 'showLogs',
            title: 'Show Extension Logs',
            category: 'Development',
            icon: '$(book)'
        },
        handler: async () => {
            await vscode.commands.executeCommand('workbench.action.showLogs');
        }
    }
];

// Node Commands
export const nodeCommands: Array<{ metadata: CommandMetadata; handler: CommandHandler }> = [
    {
        metadata: {
            id: 'insertNode',
            title: 'Insert Node',
            category: 'Node',
            icon: '$(add)',
            when: 'ramen.graphEditorFocus'
        },
        handler: async (context: CommandContext) => {
            // Get available node types
            const nodeTypes = context.stateManager.get<string[]>('nodeTypes') || [];
            
            if (nodeTypes.length === 0) {
                vscode.window.showInformationMessage('No node types available');
                return;
            }
            
            const selected = await vscode.window.showQuickPick(nodeTypes, {
                placeHolder: 'Select node type to insert'
            });
            
            if (selected) {
                context.stateManager.update('editor.insertNode', selected);
            }
        }
    },
    {
        metadata: {
            id: 'deleteNode',
            title: 'Delete Selected Node',
            category: 'Node',
            icon: '$(trash)',
            keybinding: 'delete',
            when: 'ramen.nodeSelected'
        },
        handler: async (context: CommandContext) => {
            context.stateManager.update('editor.deleteSelectedNode', true);
        }
    },
    {
        metadata: {
            id: 'duplicateNode',
            title: 'Duplicate Selected Node',
            category: 'Node',
            icon: '$(copy)',
            keybinding: 'ctrl+d',
            when: 'ramen.nodeSelected'
        },
        handler: async (context: CommandContext) => {
            context.stateManager.update('editor.duplicateSelectedNode', true);
        }
    },
    {
        metadata: {
            id: 'editNodeProperties',
            title: 'Edit Node Properties',
            category: 'Node',
            icon: '$(edit)',
            when: 'ramen.nodeSelected'
        },
        handler: async (context: CommandContext) => {
            context.stateManager.update('editor.editNodeProperties', true);
        }
    }
];

// All commands combined
export const allCommands = [
    ...graphCommands,
    ...executionCommands,
    ...serverCommands,
    ...viewCommands,
    ...developmentCommands,
    ...nodeCommands
];
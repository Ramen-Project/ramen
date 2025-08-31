import * as vscode from 'vscode';
import * as path from 'path';
import { RamenServerManager } from './server/serverManager';
import { RamenWebviewManager } from './webview/webviewManager';
import { WebSocketManager } from './websocket/websocketManager';
import { RamenVariablesProvider } from './providers/variablesProvider';
import { RamenServerProvider } from './providers/serverProvider';
import { RamenDependenciesProvider } from './providers/dependenciesProvider';

export class RamenCommands {
    constructor(
        private serverManager: RamenServerManager,
        private webviewManager: RamenWebviewManager,
        private websocketManager?: WebSocketManager,
        private _unusedGraphProvider?: any, // Keep parameter for backward compatibility
        private variablesProvider?: RamenVariablesProvider,
        private serverProvider?: RamenServerProvider,
        private dependenciesProvider?: RamenDependenciesProvider
    ) {}

    // openGraphEditor method removed - now handled by custom editor

    async createNewGraph(uri?: vscode.Uri) {
        // Prompt for graph name
        const graphName = await vscode.window.showInputBox({
            prompt: 'Enter graph name',
            placeHolder: 'my_graph',
            validateInput: (value) => {
                if (!value) {
                    return 'Graph name is required';
                }
                if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
                    return 'Graph name must start with a letter and contain only letters, numbers, and underscores';
                }
                return null;
            }
        });
        
        if (!graphName) {
            return;
        }
        
        // Select location - use provided URI if available (from context menu)
        let targetFolder: vscode.Uri;
        
        if (uri) {
            // Called from context menu - use the selected folder
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type === vscode.FileType.Directory) {
                targetFolder = uri;
            } else {
                // If it's a file, use its parent directory
                targetFolder = vscode.Uri.joinPath(uri, '..');
            }
        } else {
            // Called from command palette or toolbar - prompt for location
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            
            if (workspaceFolders.length === 1) {
                targetFolder = workspaceFolders[0].uri;
            } else {
                const selected = await vscode.window.showWorkspaceFolderPick({
                    placeHolder: 'Select workspace folder for new graph'
                });
                
                if (!selected) {
                    return;
                }
                
                targetFolder = selected.uri;
            }
        }
        
        // Create new graph file
        const graphPath = vscode.Uri.joinPath(targetFolder, `${graphName}.ramen`);
        
        // Check if file already exists
        try {
            await vscode.workspace.fs.stat(graphPath);
            const overwrite = await vscode.window.showWarningMessage(
                `File ${graphName}.ramen already exists. Overwrite?`,
                'Yes',
                'No'
            );
            
            if (overwrite !== 'Yes') {
                return;
            }
        } catch {
            // File doesn't exist, which is what we want
        }
        
        // Create initial graph content with empty nodes
        const initialGraph = {
            version: '1.0',
            nodes: [],
            edges: [],
            metadata: {
                name: graphName,
                created: new Date().toISOString(),
                description: 'A new Ramen graph',
                author: 'Ramen VSCode Extension'
            }
        };
        
        const content = JSON.stringify(initialGraph, null, 2);
        await vscode.workspace.fs.writeFile(graphPath, Buffer.from(content, 'utf8'));
        
        // Open the newly created graph file
        await vscode.commands.executeCommand('vscode.open', graphPath);
        
        vscode.window.showInformationMessage(`Created new graph: ${graphName}.ramen`);
    }

    async executeGraph(uri?: vscode.Uri) {
        if (!uri) {
            // Get current active editor
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.fileName.endsWith('.ramen')) {
                uri = activeEditor.document.uri;
            } else {
                vscode.window.showErrorMessage('No .ramen file selected');
                return;
            }
        }
        
        // Ensure server is running
        if (!this.serverManager.isRunning()) {
            const started = await this.serverManager.start();
            if (!started) {
                vscode.window.showErrorMessage('Failed to start Ramen server');
                return;
            }
        }
        
        // Create output channel for execution results
        const outputChannel = vscode.window.createOutputChannel('Ramen Execution');
        outputChannel.show();
        outputChannel.appendLine(`Executing graph: ${uri.fsPath}`);
        outputChannel.appendLine('---');
        
        try {
            // Execute through server
            const result = await this.serverManager.executeGraph(uri.fsPath);
            
            if (result.success) {
                outputChannel.appendLine('Execution completed successfully');
                if (result.output) {
                    outputChannel.appendLine('Output:');
                    outputChannel.appendLine(result.output);
                }
            } else {
                outputChannel.appendLine('Execution failed');
                if (result.error) {
                    outputChannel.appendLine('Error:');
                    outputChannel.appendLine(result.error);
                }
            }
        } catch (error) {
            outputChannel.appendLine(`Execution error: ${error}`);
            vscode.window.showErrorMessage(`Failed to execute graph: ${error}`);
        }
    }

    async manageProjectDependencies() {
        // Find pyproject.toml in workspace
        const pyprojectFiles = await vscode.workspace.findFiles('**/pyproject.toml');
        
        if (pyprojectFiles.length === 0) {
            vscode.window.showWarningMessage('No pyproject.toml found in workspace');
            return;
        }
        
        let pyprojectPath: vscode.Uri;
        
        if (pyprojectFiles.length === 1) {
            pyprojectPath = pyprojectFiles[0];
        } else {
            const items = pyprojectFiles.map(file => ({
                label: path.basename(path.dirname(file.fsPath)),
                description: vscode.workspace.asRelativePath(file),
                uri: file
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select project to manage'
            });
            
            if (!selected) {
                return;
            }
            
            pyprojectPath = selected.uri;
        }
        
        // Open terminal and run uv sync
        const terminal = vscode.window.createTerminal({
            name: 'Ramen Dependencies',
            cwd: path.dirname(pyprojectPath.fsPath)
        });
        
        terminal.show();
        terminal.sendText('uv sync');
        
        vscode.window.showInformationMessage('Running uv sync to update dependencies...');
    }

    async startServer() {
        if (this.serverManager.isRunning()) {
            vscode.window.showWarningMessage('Ramen server is already running');
            return;
        }

        const started = await this.serverManager.start();
        if (started) {
            vscode.window.showInformationMessage('Ramen server started successfully');
            // Refresh server provider to show updated status
            if (this.serverProvider) {
                this.serverProvider.refresh();
            }
        } else {
            vscode.window.showErrorMessage('Failed to start Ramen server');
        }
    }

    async stopServer() {
        if (!this.serverManager.isRunning()) {
            vscode.window.showWarningMessage('Ramen server is not running');
            return;
        }

        await this.serverManager.stop();
        vscode.window.showInformationMessage('Ramen server stopped');
        
        // Refresh server provider to show updated status
        if (this.serverProvider) {
            this.serverProvider.refresh();
        }
        
        // Disconnect WebSocket if connected
        if (this.websocketManager && this.websocketManager.isConnected()) {
            this.websocketManager.disconnect();
        }
    }

    async restartServer() {
        vscode.window.showInformationMessage('Restarting Ramen server...');
        
        await this.serverManager.restart();
        
        // Refresh server provider to show updated status
        if (this.serverProvider) {
            this.serverProvider.refresh();
        }
        
        // Reconnect WebSocket if it was connected before
        if (this.websocketManager) {
            try {
                await this.websocketManager.connect();
                vscode.window.showInformationMessage('Ramen server restarted successfully');
            } catch (error) {
                vscode.window.showWarningMessage('Server restarted but WebSocket connection failed');
            }
        } else {
            vscode.window.showInformationMessage('Ramen server restarted successfully');
        }
    }

    // refreshGraphs method removed - graph provider no longer exists

    async refreshDependencies() {
        if (this.dependenciesProvider) {
            this.dependenciesProvider.refresh();
            vscode.window.showInformationMessage('Refreshed dependencies view');
        }
    }
}
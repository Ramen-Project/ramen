import * as vscode from 'vscode';
import * as path from 'path';
import { RamenServerManager } from './server/serverManager';
import { RamenWebviewManager } from './webview/webviewManager';
import { RamenGraphProvider } from './providers/graphProvider';

export class RamenCommands {
    constructor(
        private serverManager: RamenServerManager,
        private webviewManager: RamenWebviewManager,
        private graphProvider: RamenGraphProvider
    ) {}

    async openGraphEditor(uri?: vscode.Uri) {
        if (!uri) {
            // If no URI provided, prompt user to select a .ramen file
            const files = await vscode.workspace.findFiles('**/*.ramen');
            if (files.length === 0) {
                vscode.window.showWarningMessage('No .ramen files found in workspace');
                return;
            }
            
            const items = files.map(file => ({
                label: path.basename(file.fsPath),
                description: vscode.workspace.asRelativePath(file),
                uri: file
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a graph to open'
            });
            
            if (!selected) {
                return;
            }
            
            uri = selected.uri;
        }
        
        // Ensure server is running
        if (!this.serverManager.isRunning()) {
            const started = await this.serverManager.start();
            if (!started) {
                vscode.window.showErrorMessage('Failed to start Ramen server');
                return;
            }
        }
        
        // Open webview panel
        await this.webviewManager.openGraph(uri);
    }

    async createNewGraph() {
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
        
        // Select location
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        
        let targetFolder: vscode.Uri;
        
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
        
        // Create initial graph content
        const initialGraph = {
            version: '1.0',
            nodes: [],
            edges: [],
            metadata: {
                name: graphName,
                created: new Date().toISOString(),
                description: ''
            }
        };
        
        const content = JSON.stringify(initialGraph, null, 2);
        await vscode.workspace.fs.writeFile(graphPath, Buffer.from(content, 'utf8'));
        
        // Refresh graph provider
        this.graphProvider.refresh();
        
        // Open the new graph
        await this.openGraphEditor(graphPath);
        
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
}
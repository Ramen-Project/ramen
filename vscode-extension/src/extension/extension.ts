import * as vscode from 'vscode';
import { RamenGraphProvider } from './providers/graphProvider';
import { RamenCustomEditorProvider } from './providers/customEditorProvider';
import { RamenWebviewManager } from './webview/webviewManager';
import { RamenServerManager } from './server/serverManager';
import { RamenLanguageClient } from './language/languageClient';
import { RamenCommands } from './commands';

let serverManager: RamenServerManager;
let webviewManager: RamenWebviewManager;
let languageClient: RamenLanguageClient;
let graphProvider: RamenGraphProvider;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Ramen extension is activating...');

    // Initialize server manager
    serverManager = new RamenServerManager(context);
    
    // Initialize webview manager
    webviewManager = new RamenWebviewManager(context, serverManager);
    
    // Initialize language client
    const config = vscode.workspace.getConfiguration('ramen');
    if (config.get<boolean>('enableLanguageServer', true)) {
        languageClient = new RamenLanguageClient(context, serverManager);
        await languageClient.start();
    }
    
    // Initialize graph tree view provider
    graphProvider = new RamenGraphProvider(context);
    vscode.window.createTreeView('ramenGraphs', {
        treeDataProvider: graphProvider,
        showCollapseAll: true
    });

    // Register custom editor provider for .ramen files
    const customEditorProvider = new RamenCustomEditorProvider(context, webviewManager, serverManager);
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider('ramen.graphEditor', customEditorProvider)
    );

    // Register commands
    const commands = new RamenCommands(serverManager, webviewManager, graphProvider);
    
    context.subscriptions.push(
        vscode.commands.registerCommand('ramen.openGraphEditor', (uri?: vscode.Uri) => {
            commands.openGraphEditor(uri);
        }),
        
        vscode.commands.registerCommand('ramen.createNewGraph', async () => {
            await commands.createNewGraph();
        }),
        
        vscode.commands.registerCommand('ramen.executeGraph', async (uri?: vscode.Uri) => {
            await commands.executeGraph(uri);
        }),
        
        vscode.commands.registerCommand('ramen.manageProjectDependencies', async () => {
            await commands.manageProjectDependencies();
        }),
        
        vscode.commands.registerCommand('ramen.stopServer', async () => {
            await serverManager.stop();
            vscode.window.showInformationMessage('Ramen server stopped');
        }),
        
        vscode.commands.registerCommand('ramen.restartServer', async () => {
            await serverManager.restart();
            vscode.window.showInformationMessage('Ramen server restarted');
        })
    );

    // Auto-start server if configured
    const autoStart = config.get<boolean>('autoStartServer', true);
    if (autoStart) {
        const hasRamenFiles = await vscode.workspace.findFiles('**/*.ramen', null, 1);
        if (hasRamenFiles.length > 0) {
            await serverManager.start();
        }
    }

    // Watch for .ramen file changes
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.ramen');
    
    fileWatcher.onDidCreate((uri) => {
        graphProvider.refresh();
        console.log(`New .ramen file created: ${uri.fsPath}`);
    });
    
    fileWatcher.onDidDelete((uri) => {
        graphProvider.refresh();
        console.log(`Ramen file deleted: ${uri.fsPath}`);
    });
    
    fileWatcher.onDidChange((uri) => {
        console.log(`Ramen file changed: ${uri.fsPath}`);
        webviewManager.notifyFileChange(uri);
    });
    
    context.subscriptions.push(fileWatcher);

    // Handle configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('ramen')) {
                handleConfigurationChange();
            }
        })
    );

    // Auto-open graph editor when .ramen file is opened
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.fileName.endsWith('.ramen')) {
                const config = vscode.workspace.getConfiguration('ramen');
                const autoOpenEditor = config.get<boolean>('autoOpenEditor', true);
                
                if (autoOpenEditor) {
                    // Small delay to ensure the text editor is ready
                    setTimeout(() => {
                        commands.openGraphEditor(editor.document.uri);
                    }, 100);
                }
            }
        })
    );

    console.log('Ramen extension activated successfully');
}

export async function deactivate() {
    console.log('Ramen extension is deactivating...');
    
    if (languageClient) {
        await languageClient.stop();
    }
    
    if (serverManager) {
        await serverManager.stop();
    }
    
    if (webviewManager) {
        webviewManager.disposeAll();
    }
    
    console.log('Ramen extension deactivated');
}

async function handleConfigurationChange() {
    const config = vscode.workspace.getConfiguration('ramen');
    
    // Handle server port change
    const newPort = config.get<number>('serverPort', 8000);
    if (serverManager && serverManager.getPort() !== newPort) {
        vscode.window.showWarningMessage(
            'Server port changed. Restart the server to apply changes.',
            'Restart'
        ).then(async (selection) => {
            if (selection === 'Restart') {
                await serverManager.restart();
            }
        });
    }
    
    // Handle theme change
    const theme = config.get<string>('theme', 'auto');
    webviewManager.updateTheme(theme);
}
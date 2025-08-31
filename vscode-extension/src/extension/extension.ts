import * as vscode from 'vscode';
import { RamenCustomEditorProvider } from './providers/customEditorProvider';
import { RamenVariablesProvider } from './providers/variablesProvider';
import { RamenServerProvider } from './providers/serverProvider';
import { RamenDependenciesProvider } from './providers/dependenciesProvider';
import { RamenWebviewManager } from './webview/webviewManager';
import { RamenServerManager } from './server/serverManager';
import { WebSocketManager } from './websocket/websocketManager';
import { RamenLanguageServer } from './language/languageServer';
import { RamenCommands } from './commands';
import { RamenFileSystemProvider } from './filesystem/fileSystemProvider';
import { RamenFileWatcher } from './filesystem/fileWatcher';
import { CommandRegistry } from './commands/commandRegistry';
import { allCommands } from './commands/ramenCommands';
import { StateManager } from './core/stateManager';
import { ErrorHandler } from './core/errorHandler';

let serverManager: RamenServerManager;
let webviewManager: RamenWebviewManager;
let websocketManager: WebSocketManager;
let languageServer: RamenLanguageServer;
let fileSystemProvider: RamenFileSystemProvider;
let fileWatcher: RamenFileWatcher;
let variablesProvider: RamenVariablesProvider;
let serverProvider: RamenServerProvider;
let dependenciesProvider: RamenDependenciesProvider;
let commandRegistry: CommandRegistry;
let stateManager: StateManager;
let errorHandler: ErrorHandler;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Ramen extension is activating...');

    // Initialize core services
    stateManager = StateManager.getInstance(context);
    errorHandler = ErrorHandler.getInstance();
    
    // Initialize server manager
    serverManager = new RamenServerManager(context);
    
    // Initialize WebSocket manager
    websocketManager = new WebSocketManager(serverManager, context);
    
    // Initialize webview manager with WebSocket support
    webviewManager = new RamenWebviewManager(context, serverManager, websocketManager);
    
    // Initialize language server
    const config = vscode.workspace.getConfiguration('ramen');
    if (config.get<boolean>('enableLanguageServer', true)) {
        languageServer = new RamenLanguageServer(context);
        await languageServer.start();
    }
    
    // Initialize tree view providers
    
    // Initialize file system provider
    fileSystemProvider = new RamenFileSystemProvider(context);
    context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider('ramen', fileSystemProvider, { 
            isCaseSensitive: true,
            isReadonly: false 
        })
    );
    
    // Initialize file watcher
    fileWatcher = new RamenFileWatcher(context, webviewManager);
    context.subscriptions.push(fileWatcher);
    variablesProvider = new RamenVariablesProvider(context);
    serverProvider = new RamenServerProvider(context, serverManager);
    dependenciesProvider = new RamenDependenciesProvider(context);
    
    // Create tree views
    
    vscode.window.createTreeView('ramenVariables', {
        treeDataProvider: variablesProvider,
        showCollapseAll: true
    });
    
    vscode.window.createTreeView('ramenServer', {
        treeDataProvider: serverProvider,
        showCollapseAll: false
    });
    
    vscode.window.createTreeView('ramenDependencies', {
        treeDataProvider: dependenciesProvider,
        showCollapseAll: true
    });

    // Register custom editor provider for .ramen files
    const customEditorProvider = new RamenCustomEditorProvider(context, webviewManager, serverManager, websocketManager);
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider('ramen.graphEditor', customEditorProvider)
    );

    // Initialize command registry
    commandRegistry = new CommandRegistry(context, stateManager, errorHandler);
    
    // Register all commands using the new registry
    commandRegistry.registerBatch(allCommands);
    
    // Register legacy commands for backward compatibility (only those not in new command registry)
    const commands = new RamenCommands(serverManager, webviewManager, websocketManager, undefined, variablesProvider, serverProvider, dependenciesProvider);
    
    context.subscriptions.push(
        
        vscode.commands.registerCommand('ramen.createNewGraph', async (uri?: vscode.Uri) => {
            await commands.createNewGraph(uri);
        }),
        
        vscode.commands.registerCommand('ramen.manageProjectDependencies', async () => {
            await commands.manageProjectDependencies();
        }),
        
        
        vscode.commands.registerCommand('ramen.refreshDependencies', async () => {
            await commands.refreshDependencies();
        }),
        
        // Server management commands
        vscode.commands.registerCommand('ramen.startServer', async () => {
            await commands.startServer();
        }),
        
        vscode.commands.registerCommand('ramen.stopServer', async () => {
            await commands.stopServer();
        }),
        
        vscode.commands.registerCommand('ramen.restartServer', async () => {
            await commands.restartServer();
        }),
        
        // Register command palette command
        vscode.commands.registerCommand('ramen.showCommandPalette', async () => {
            await commandRegistry.showCommandPalette();
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

    // File watching is now handled by RamenFileWatcher

    // Handle configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('ramen')) {
                handleConfigurationChange();
            }
        })
    );

    // Auto-open graph editor when .ramen file is opened (disabled - using custom editor instead)
    // The custom editor with "default" priority should handle .ramen files directly
    // context.subscriptions.push(
    //     vscode.window.onDidChangeActiveTextEditor((editor) => {
    //         if (editor && editor.document.fileName.endsWith('.ramen')) {
    //             const config = vscode.workspace.getConfiguration('ramen');
    //             const autoOpenEditor = config.get<boolean>('autoOpenEditor', true);
    //             
    //             if (autoOpenEditor) {
    //                 // Small delay to ensure the text editor is ready
    //                 setTimeout(() => {
    //                     commands.openGraphEditor(editor.document.uri);
    //                 }, 100);
    //             }
    //         }
    //     })
    // );

    console.log('Ramen extension activated successfully');
}

export async function deactivate() {
    console.log('Ramen extension is deactivating...');
    
    try {
        // Stop language server first
        if (languageServer) {
            await languageServer.stop();
        }
        
        // Dispose WebSocket manager
        if (websocketManager) {
            websocketManager.dispose();
        }
        
        // Stop server manager (most important)
        if (serverManager) {
            await serverManager.stop();
        }
        
        // Dispose webview manager
        if (webviewManager) {
            webviewManager.disposeAll();
        }
        
        // Clean up other resources
        if (fileWatcher) {
            fileWatcher.dispose();
        }
        
        // ErrorHandler cleanup is automatic
        
        console.log('Ramen extension deactivated successfully');
    } catch (error) {
        console.error('Error during extension deactivation:', error);
        // Even if there's an error, we should still try to force-stop the server
        if (serverManager) {
            try {
                const processId = serverManager.getProcessId();
                if (processId) {
                    process.kill(processId, 'SIGKILL');
                    console.log('Force-killed server process:', processId);
                }
            } catch (killError) {
                console.error('Failed to force-kill server process:', killError);
            }
        }
    }
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
import * as vscode from 'vscode';
import { RamenCustomEditorProvider } from './providers/customEditorProvider';
import { RamenVariablesProvider } from './providers/variablesProvider';
import { RamenServerProvider } from './providers/serverProvider';
import { RamenDependenciesProvider } from './providers/dependenciesProvider';
import { RamenWebviewManager } from './webview/webviewManager';
import { RamenServerManager } from './server/serverManager';
import { getGlobalWebSocketManager } from './api/GlobalWebSocketManager';
import { RamenLanguageServer } from './language/languageServer';
import { RamenCommands } from './commands';
import { RamenFileSystemProvider } from './filesystem/fileSystemProvider';
import { RamenFileWatcher } from './filesystem/fileWatcher';
import { CommandRegistry } from './commands/commandRegistry';
import { allCommands } from './commands/ramenCommands';
import { StateManager } from './core/stateManager';
import { ErrorHandler } from './core/errorHandler';
import { registerGitCommands } from './commands/gitCommands';

let serverManager: RamenServerManager;
let webviewManager: RamenWebviewManager;
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

    // Initialize webview manager (will use GlobalWebSocketManager internally)
    webviewManager = new RamenWebviewManager(context, serverManager);

    // Set initial theme based on current VSCode theme
    const currentTheme = vscode.window.activeColorTheme;
    let initialTheme: string;
    switch (currentTheme.kind) {
        case vscode.ColorThemeKind.Light:
            initialTheme = 'light';
            break;
        case vscode.ColorThemeKind.Dark:
            initialTheme = 'dark';
            break;
        case vscode.ColorThemeKind.HighContrast:
            initialTheme = 'high-contrast';
            break;
        case vscode.ColorThemeKind.HighContrastLight:
            initialTheme = 'high-contrast-light';
            break;
        default:
            initialTheme = 'dark';
    }
    console.log(`🍜 Initial VSCode theme: ${initialTheme}`);
    
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
    const customEditorProvider = new RamenCustomEditorProvider(context, webviewManager, serverManager);
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider('ramen.graphEditor', customEditorProvider)
    );

    // Initialize command registry
    commandRegistry = new CommandRegistry(context, stateManager, errorHandler);

    // Register all commands using the new registry
    commandRegistry.registerBatch(allCommands);

    // Register legacy commands for backward compatibility (only those not in new command registry)
    const commands = new RamenCommands(serverManager, webviewManager, variablesProvider, serverProvider, dependenciesProvider);
    
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
        
        // Server management commands are now registered via CommandRegistry
        // Removed duplicate registrations of startServer, stopServer, restartServer
        
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

    // Handle VSCode theme changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveColorTheme((theme) => {
            // Determine theme type: light, dark, or high-contrast
            let themeKind: string;
            switch (theme.kind) {
                case vscode.ColorThemeKind.Light:
                    themeKind = 'light';
                    break;
                case vscode.ColorThemeKind.Dark:
                    themeKind = 'dark';
                    break;
                case vscode.ColorThemeKind.HighContrast:
                    themeKind = 'high-contrast';
                    break;
                case vscode.ColorThemeKind.HighContrastLight:
                    themeKind = 'high-contrast-light';
                    break;
                default:
                    themeKind = 'dark';
            }

            console.log(`🍜 VSCode theme changed to: ${themeKind}`);
            webviewManager.updateTheme(themeKind);
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

    // Register Git integration commands
    registerGitCommands(context);
    
    console.log('Ramen extension activated successfully');
}

export async function deactivate() {
    console.log('Ramen extension is deactivating...');

    const cleanup = async () => {
        const cleanupTasks: Promise<void>[] = [];

        // 1. Disconnect global WebSocket first to stop new requests
        try {
            const wsManager = getGlobalWebSocketManager();
            wsManager.disconnect();
            console.log('WebSocket disconnected');
        } catch (error) {
            console.error('Error disconnecting WebSocket:', error);
        }

        // 2. Dispose webview manager to close all panels
        try {
            if (webviewManager) {
                webviewManager.disposeAll();
                console.log('Webview manager disposed');
            }
        } catch (error) {
            console.error('Error disposing webview manager:', error);
        }

        // 3. Stop language server
        if (languageServer) {
            cleanupTasks.push(
                languageServer.stop().catch((error) => {
                    console.error('Error stopping language server:', error);
                })
            );
        }

        // 4. Stop server manager (most critical)
        if (serverManager) {
            cleanupTasks.push(
                serverManager.stop().catch((error) => {
                    console.error('Error stopping server manager:', error);
                })
            );
        }

        // 5. Clean up file watcher
        try {
            if (fileWatcher) {
                fileWatcher.dispose();
            }
        } catch (error) {
            console.error('Error disposing file watcher:', error);
        }

        // Wait for all cleanup tasks with timeout
        try {
            await Promise.race([
                Promise.all(cleanupTasks),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Cleanup timeout')), 5000)
                )
            ]);
        } catch (error) {
            console.warn('Cleanup timeout or error:', error);
        }
    };

    try {
        await cleanup();
        console.log('Ramen extension deactivated successfully');
    } catch (error) {
        console.error('Error during extension deactivation:', error);
    } finally {
        // Final fallback: force-kill server process if still running
        if (serverManager) {
            try {
                const processId = serverManager.getProcessId();
                if (processId) {
                    if (process.platform === 'win32') {
                        // Windows
                        const { execSync } = require('child_process');
                        execSync(`taskkill /F /PID ${processId}`, { stdio: 'ignore' });
                        console.log('Force-killed server process (Windows):', processId);
                    } else {
                        // Unix/Linux/macOS
                        process.kill(processId, 'SIGKILL');
                        console.log('Force-killed server process:', processId);
                    }
                }
            } catch (killError) {
                // Ignore errors here - process might already be dead
                console.log('Server process cleanup:', killError);
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
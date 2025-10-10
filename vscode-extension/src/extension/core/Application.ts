/**
 * Application 主類別
 * 管理整個 Extension 的生命週期
 */

import * as vscode from 'vscode';
import { DIContainer, ServiceIdentifiers } from './di/DIContainer';
import { registerAllServices, disposeAllServices } from './di/ServiceRegistry';
import { RamenServerManager } from '../server/serverManager';
import { RamenWebviewManager } from '../webview/webviewManager';
import { RamenCustomEditorProvider } from '../providers/customEditorProvider';
import { RamenVariablesProvider } from '../providers/variablesProvider';
import { RamenServerProvider } from '../providers/serverProvider';
import { RamenDependenciesProvider } from '../providers/dependenciesProvider';
import { RamenProjectExplorer } from '../views/projectExplorer';
import { CommandRegistry } from '../commands/commandRegistry';
import { allCommands } from '../commands/ramenCommands';
import { StateManager } from './stateManager';
import { registerGitCommands } from '../commands/gitCommands';
import { GitStatusBarManager } from '../git/GitStatusBarManager';
import { UVPackageManager } from '../uv/UVPackageManager';
import { registerUVCommands } from '../commands/uvCommands';
import { DebugManager } from '../debug/DebugManager';
import { registerDebugCommands } from '../commands/debugCommands';
import { GitVersionControl } from '../git/GitVersionControl';
import { registerVersionCommands } from '../commands/versionCommands';

/**
 * Application 類別
 * 負責初始化和管理整個 Extension
 */
export class Application {
    private container: DIContainer;
    private disposables: vscode.Disposable[] = [];
    private gitStatusBarManager?: GitStatusBarManager;
    private uvPackageManager?: UVPackageManager;
    private debugManager?: DebugManager;
    private versionControl?: GitVersionControl;

    constructor(private context: vscode.ExtensionContext) {
        this.container = new DIContainer(context);
    }

    /**
     * 啟動應用程式
     */
    async start(): Promise<void> {
        const startTime = performance.now();
        console.log('🍜 [App] Starting Ramen Extension...');

        try {
            // 1. 註冊所有服務
            const regStart = performance.now();
            registerAllServices(this.container);
            const regTime = performance.now() - regStart;
            console.log(`🍜 [Perf] Service registration took ${regTime.toFixed(2)}ms`);

            // 2. 初始化核心服務
            const initStart = performance.now();
            await this.initializeCoreServices();
            const initTime = performance.now() - initStart;
            console.log(`🍜 [Perf] Core service initialization took ${initTime.toFixed(2)}ms`);

            // 3. 註冊 VSCode 整合
            const vscodeStart = performance.now();
            this.registerVSCodeIntegrations();
            const vscodeTime = performance.now() - vscodeStart;
            console.log(`🍜 [Perf] VSCode integrations took ${vscodeTime.toFixed(2)}ms`);

            const totalTime = performance.now() - startTime;
            console.log(`🍜 [Perf] ⚡ Total startup time: ${totalTime.toFixed(2)}ms`);
            console.log('🍜 [App] Ramen Extension started successfully');
        } catch (error) {
            console.error('🍜 [App] Failed to start extension:', error);
            vscode.window.showErrorMessage(`Failed to start Ramen Extension: ${error}`);
            throw error;
        }
    }

    /**
     * 初始化核心服務
     */
    private async initializeCoreServices(): Promise<void> {
        // 從容器解析核心服務
        const serverManager = this.container.resolve<RamenServerManager>(
            ServiceIdentifiers.ServerService
        );
        const stateManager = this.container.resolve<StateManager>(ServiceIdentifiers.StateManager);

        // 設置初始主題
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
        console.log(`🍜 [App] Initial VSCode theme: ${initialTheme}`);

        // 自動啟動伺服器（如果有 .ramen 檔案）
        const config = vscode.workspace.getConfiguration('ramen');
        const autoStart = config.get<boolean>('autoStartServer', true);
        if (autoStart) {
            const hasRamenFiles = await vscode.workspace.findFiles('**/*.ramen', null, 1);
            if (hasRamenFiles.length > 0) {
                await serverManager.start();
            }
        }

        console.log('🍜 [App] Core services initialized');
    }

    /**
     * 註冊 VSCode 整合
     */
    private registerVSCodeIntegrations(): void {
        // 從容器解析服務
        const serverManager = this.container.resolve<RamenServerManager>(
            ServiceIdentifiers.ServerService
        );
        const webviewManager = this.container.resolve<RamenWebviewManager>(
            ServiceIdentifiers.WebviewService
        );
        const stateManager = this.container.resolve<StateManager>(ServiceIdentifiers.StateManager);

        // 1. 註冊 Custom Editor Provider
        const customEditorProvider = new RamenCustomEditorProvider(
            this.context,
            webviewManager,
            serverManager
        );
        this.registerDisposable(
            vscode.window.registerCustomEditorProvider('ramen.graphEditor', customEditorProvider)
        );

        // 2. 註冊 TreeView Providers（從 DI 容器解析）
        const variablesProvider = this.container.resolve<RamenVariablesProvider>(
            ServiceIdentifiers.VariablesProvider
        );
        const serverProvider = this.container.resolve<RamenServerProvider>(
            ServiceIdentifiers.ServerProvider
        );
        const dependenciesProvider = this.container.resolve<RamenDependenciesProvider>(
            ServiceIdentifiers.DependenciesProvider
        );
        const projectExplorer = this.container.resolve<RamenProjectExplorer>(
            ServiceIdentifiers.ProjectExplorer
        );

        vscode.window.createTreeView('ramenProjectExplorer', {
            treeDataProvider: projectExplorer,
            showCollapseAll: false,
        });

        vscode.window.createTreeView('ramenVariables', {
            treeDataProvider: variablesProvider,
            showCollapseAll: true,
        });

        vscode.window.createTreeView('ramenServer', {
            treeDataProvider: serverProvider,
            showCollapseAll: false,
        });

        vscode.window.createTreeView('ramenDependencies', {
            treeDataProvider: dependenciesProvider,
            showCollapseAll: true,
        });

        // 3. 註冊命令系統（已透過 DI 容器管理）
        const commandRegistry = this.container.resolve<CommandRegistry>(
            ServiceIdentifiers.CommandRegistry
        );
        commandRegistry.registerBatch(allCommands);

        this.registerDisposable(
            vscode.commands.registerCommand('ramen.showCommandPalette', async () => {
                await commandRegistry.showCommandPalette();
            })
        );

        // 4. 註冊 Git 命令
        const wsManager = this.container.resolve(ServiceIdentifiers.GlobalWebSocketManager);
        registerGitCommands(this.context, wsManager, serverManager);

        // 5. 初始化 Git 狀態列
        this.gitStatusBarManager = new GitStatusBarManager();
        this.registerDisposable(this.gitStatusBarManager);

        // 註冊 Git 狀態列的顯示命令
        this.registerDisposable(
            vscode.commands.registerCommand('ramen.git.showStatus', async () => {
                if (this.gitStatusBarManager) {
                    await this.gitStatusBarManager.showDetailedStatus();
                }
            })
        );

        // 6. 初始化 UV Package Manager
        this.uvPackageManager = new UVPackageManager();
        this.registerDisposable(this.uvPackageManager);

        // 註冊 UV 命令
        registerUVCommands(this.context, this.uvPackageManager);

        // 7. 初始化 Debug Manager
        this.debugManager = new DebugManager();
        this.registerDisposable(this.debugManager);

        // 註冊 Debug 命令
        registerDebugCommands(this.context, this.debugManager);

        // 8. 初始化 Git Version Control
        this.versionControl = new GitVersionControl();
        this.registerDisposable(this.versionControl);

        // 註冊 Version 命令
        registerVersionCommands(this.context, this.versionControl);

        // 9. 註冊事件監聽器
        this.registerEventListeners(webviewManager, stateManager);

        console.log('🍜 [App] VSCode integrations registered');
    }

    /**
     * 註冊事件監聽器
     */
    private registerEventListeners(
        webviewManager: RamenWebviewManager,
        stateManager: StateManager
    ): void {
        // 監聽配置變更
        this.registerDisposable(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('ramen')) {
                    this.handleConfigurationChange();
                }
            })
        );

        // 監聽主題變更
        this.registerDisposable(
            vscode.window.onDidChangeActiveColorTheme((theme) => {
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

                console.log(`🍜 [App] VSCode theme changed to: ${themeKind}`);
                webviewManager.updateTheme(themeKind);
            })
        );

        // 監聽 Debug 模式變更
        this.registerDisposable(
            stateManager.subscribe('settings.debugMode', (event: any) => {
                console.log(`🍜 [App] Debug mode changed to: ${event.newValue}`);
                webviewManager.updateDebugMode(event.newValue as boolean);
            })
        );
    }

    /**
     * 處理配置變更
     */
    private handleConfigurationChange(): void {
        const config = vscode.workspace.getConfiguration('ramen');
        const serverManager = this.container.resolve<RamenServerManager>(
            ServiceIdentifiers.ServerService
        );
        const webviewManager = this.container.resolve<RamenWebviewManager>(
            ServiceIdentifiers.WebviewService
        );

        // 處理伺服器端口變更
        const newPort = config.get<number>('serverPort', 8000);
        if (serverManager && serverManager.getPort() !== newPort) {
            vscode.window
                .showWarningMessage(
                    'Server port changed. Restart the server to apply changes.',
                    'Restart'
                )
                .then(async (selection) => {
                    if (selection === 'Restart') {
                        await serverManager.restart();
                    }
                });
        }

        // 處理主題變更
        const theme = config.get<string>('theme', 'auto');
        webviewManager.updateTheme(theme);
    }

    /**
     * 停止應用程式
     */
    async stop(): Promise<void> {
        console.log('🍜 [App] Stopping Ramen Extension...');

        try {
            // 1. 斷開 WebSocket
            try {
                const wsManager = this.container.tryResolve<any>(
                    ServiceIdentifiers.WebSocketService
                );
                if (wsManager) {
                    wsManager.disconnect();
                    console.log('🍜 [App] WebSocket disconnected');
                }
            } catch (error) {
                console.error('🍜 [App] Error disconnecting WebSocket:', error);
            }

            // 2. 停止 Webview Manager
            try {
                const webviewManager = this.container.tryResolve<RamenWebviewManager>(
                    ServiceIdentifiers.WebviewService
                );
                if (webviewManager) {
                    webviewManager.disposeAll();
                    console.log('🍜 [App] Webview manager disposed');
                }
            } catch (error) {
                console.error('🍜 [App] Error disposing webview manager:', error);
            }

            // 3. 停止伺服器
            try {
                const serverManager = this.container.tryResolve<RamenServerManager>(
                    ServiceIdentifiers.ServerService
                );
                if (serverManager) {
                    await Promise.race([
                        serverManager.stop(),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Server stop timeout')), 5000)
                        ),
                    ]);
                    console.log('🍜 [App] Server stopped');
                }
            } catch (error) {
                console.error('🍜 [App] Error stopping server:', error);
            }

            // 4. 清理所有 disposables
            this.disposables.forEach((d) => {
                try {
                    d.dispose();
                } catch (error) {
                    console.error('🍜 [App] Error disposing resource:', error);
                }
            });

            // 5. 清理 DI 容器
            disposeAllServices(this.container);

            console.log('🍜 [App] Ramen Extension stopped successfully');
        } catch (error) {
            console.error('🍜 [App] Error during stop:', error);
            throw error;
        }
    }

    /**
     * 獲取 DI 容器
     */
    getContainer(): DIContainer {
        return this.container;
    }

    /**
     * 註冊 disposable 資源
     */
    registerDisposable(disposable: vscode.Disposable): void {
        this.disposables.push(disposable);
        this.context.subscriptions.push(disposable);
    }
}

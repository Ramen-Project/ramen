import * as vscode from 'vscode';
import * as path from 'path';
import * as http from 'http';
import { RamenServerManager } from '../server/serverManager';
import { GlobalWebSocketManager } from '../api/GlobalWebSocketManager';
import { StateManager } from '../core/stateManager';
import { WebviewMessageBus, createMessageBus } from './MessageBus';
import { ExtensionMessageType } from '../../shared/types/extension-messages';

export class RamenWebviewManager {
    private panels: Map<string, vscode.WebviewPanel> = new Map();
    private messageBuses: Map<string, WebviewMessageBus> = new Map();
    private graphStates: Map<string, any> = new Map();

    constructor(
        private context: vscode.ExtensionContext,
        private serverManager: RamenServerManager,
        private wsManager: GlobalWebSocketManager,
        private stateManager?: StateManager
    ) {
        console.log('🍜 [WebviewManager] Initialized with DI-injected GlobalWebSocketManager');
    }

    async openGraph(uri: vscode.Uri) {
        const graphPath = uri.fsPath;
        const graphName = path.basename(graphPath, '.ramen');

        // Ensure server is running before opening webview
        console.log('Ensuring server is running before opening webview...');
        const serverStarted = await this.serverManager.ensureServerRunning();
        if (!serverStarted) {
            vscode.window.showErrorMessage(
                'Failed to start Ramen server. The graph editor may not function properly.'
            );
        }

        // Check if panel already exists for this graph
        let panel = this.panels.get(graphPath);

        if (panel) {
            // Reveal existing panel
            panel.reveal();
            return;
        }

        // Create new webview panel
        panel = vscode.window.createWebviewPanel(
            'ramenGraph',
            `Ramen: ${graphName}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media'), uri],
            }
        );

        // Setup the panel with common functionality
        await this.setupPanel(panel, uri);
    }

    async setupCustomEditor(
        uri: vscode.Uri,
        panel: vscode.WebviewPanel,
        document?: vscode.TextDocument
    ) {
        const graphPath = uri.fsPath;

        // Ensure server is running before opening webview
        console.log('Setting up custom editor for:', graphPath);
        const serverStarted = await this.serverManager.ensureServerRunning();
        if (!serverStarted) {
            vscode.window.showWarningMessage(
                'Ramen server is not running. Some features may be unavailable.'
            );
        }

        // Ensure WebSocket connection via GlobalWebSocketManager
        if (serverStarted) {
            const port = this.serverManager.getPort();
            const wsUrl = `ws://localhost:${port}/ws`;
            try {
                await this.wsManager.connect(wsUrl);
            } catch (error) {
                console.error('Failed to establish WebSocket connection:', error);
            }
        }

        // Configure the webview
        panel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                vscode.Uri.joinPath(this.context.extensionUri, 'resources'),
                uri,
            ],
        };

        // Setup the panel with common functionality
        await this.setupPanel(panel, uri, document);
    }

    private async setupPanel(
        panel: vscode.WebviewPanel,
        uri: vscode.Uri,
        document?: vscode.TextDocument
    ) {
        const graphPath = uri.fsPath;

        // Store panel reference
        this.panels.set(graphPath, panel);

        // Set panel icon
        panel.iconPath = {
            light: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'graph-light.svg'),
            dark: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'graph-dark.svg'),
        };

        // Create MessageBus for this panel
        const messageBus = createMessageBus(panel);
        this.messageBuses.set(graphPath, messageBus);

        // Setup message handlers using MessageBus
        this.setupMessageHandlers(messageBus, graphPath, document);

        // Handle panel disposal
        panel.onDidDispose(() => {
            // Dispose MessageBus
            const bus = this.messageBuses.get(graphPath);
            if (bus) {
                bus.dispose();
                this.messageBuses.delete(graphPath);
            }

            this.panels.delete(graphPath);
            console.log(`🍜 [WebviewManager] Panel closed for ${path.basename(graphPath)}`);
        });

        // If document is provided (custom editor), watch for changes
        if (document) {
            const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
                if (e.document.uri.toString() === document.uri.toString()) {
                    this.updateWebviewFromDocument(panel, document);
                }
            });

            // Clean up subscription when panel is disposed
            panel.onDidDispose(() => {
                changeDocumentSubscription.dispose();
            });

            // Initial content update
            this.updateWebviewFromDocument(panel, document);
        }

        // Set HTML content
        panel.webview.html = await this.getWebviewContent(panel.webview, graphPath);
    }

    private async getWebviewContent(webview: vscode.Webview, graphPath: string): Promise<string> {
        const serverPort = this.serverManager.getPort();

        // Detect current VSCode theme
        const currentTheme = vscode.window.activeColorTheme;
        let theme: string;
        switch (currentTheme.kind) {
            case vscode.ColorThemeKind.Light:
                theme = 'light';
                break;
            case vscode.ColorThemeKind.Dark:
                theme = 'dark';
                break;
            case vscode.ColorThemeKind.HighContrast:
                theme = 'high-contrast';
                break;
            case vscode.ColorThemeKind.HighContrastLight:
                theme = 'high-contrast-light';
                break;
            default:
                theme = 'dark';
        }

        // Get URIs for resources
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview', 'webview.js')
        );

        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.css')
        );

        const vscodeStyleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'vscode.css')
        );

        // NEW APPROACH: Session-based loading
        // Don't read file content here - let the server handle it
        console.log('🍜 [WebviewManager] Using session-based loading for:', graphPath);

        // Generate nonce for CSP
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none';
                img-src ${webview.cspSource} data: https:;
                script-src 'unsafe-eval' 'unsafe-inline' ${webview.cspSource};
                style-src ${webview.cspSource} 'unsafe-inline';
                connect-src ws://localhost:${serverPort} http://localhost:${serverPort};">
            <link href="${vscodeStyleUri}" rel="stylesheet">
            <title>Ramen Graph Editor</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
                    background-color: var(--vscode-editor-background, #1e1e1e);
                    color: var(--vscode-foreground, #cccccc);
                    overflow: hidden;
                }
                #root {
                    width: 100vw;
                    height: 100vh;
                    overflow: hidden;
                }
            </style>
        </head>
        <body data-theme="${theme}">
            <div id="root"></div>
            <script>
                console.log('🍜 [HTML] Inline script executing - this proves HTML is loaded');

                // VSCode API
                const vscode = acquireVsCodeApi();

                // Make VSCode API available globally for the React app
                window.vscode = vscode;

                // Initial configuration for the React app (Session-based approach)
                window.ramenConfig = {
                    graphPath: '${graphPath.replace(/\\/g, '\\\\')}',
                    serverPort: ${serverPort},
                    theme: '${theme}',
                    debugMode: ${this.stateManager?.get<boolean>('settings.debugMode') ?? false},
                    useSessionBasedLoading: true,  // NEW: Flag to use session-based loading
                    isVSCode: true
                };

                console.log('🍜 [HTML] window.ramenConfig set to:', window.ramenConfig);
                
                // Save initial state
                vscode.setState({
                    graphPath: '${graphPath.replace(/\\/g, '\\\\')}'
                });
                
                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'updateTheme':
                            document.body.dataset.theme = message.theme;
                            window.ramenConfig.theme = message.theme;
                            // Dispatch custom event for React app to handle
                            window.dispatchEvent(new CustomEvent('vscode:updateTheme', { detail: message.theme }));
                            break;
                        case 'fileChanged':
                            window.dispatchEvent(new CustomEvent('vscode:fileChanged', { detail: message.path }));
                            break;
                        case 'serverRestarted':
                            window.dispatchEvent(new CustomEvent('vscode:serverRestarted'));
                            break;
                    }
                });
                
                // No need to restore graphData in session-based loading
                // The frontend will request session from server
            </script>
            <script type="module" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private updateWebviewFromDocument(panel: vscode.WebviewPanel, document: vscode.TextDocument) {
        try {
            // Parse the document content as JSON to validate
            const graphData = JSON.parse(document.getText());

            // Send the graph data to the webview
            panel.webview.postMessage({
                command: 'graphUpdate',
                data: graphData,
            });
        } catch (error) {
            // If JSON is invalid, show error in webview
            panel.webview.postMessage({
                command: 'error',
                message: `Invalid JSON: ${error}`,
            });
        }
    }

    /**
     * 設置 MessageBus handlers
     *
     * 將原本的 switch-case 邏輯改為模組化的 handler 註冊
     */
    private setupMessageHandlers(
        messageBus: WebviewMessageBus,
        graphPath: string,
        document?: vscode.TextDocument
    ): void {
        const panel = this.panels.get(graphPath);
        if (!panel) {
            console.error('🍜 [WebviewManager] Panel not found for', graphPath);
            return;
        }

        // ========== Graph Operations ==========

        messageBus.on(ExtensionMessageType.SAVE_GRAPH, async (data: any) => {
            await this.saveGraph(graphPath, data.data as string, document);
            return { success: true };
        });

        messageBus.on(ExtensionMessageType.EXECUTE_GRAPH, async () => {
            await this.executeGraph(graphPath);
            return { success: true };
        });

        // ========== Data Fetching ==========

        messageBus.on(ExtensionMessageType.FETCH_NODES, async () => {
            return await this.fetchNodesForBus(panel);
        });

        messageBus.on(ExtensionMessageType.FETCH_TYPE_CONVERTERS, async () => {
            return await this.fetchTypeConvertersForBus(panel);
        });

        // ========== UI Operations ==========

        messageBus.on(ExtensionMessageType.SHOW_MESSAGE, async (data: any) => {
            const { type, text } = data;
            if (type === 'error') {
                vscode.window.showErrorMessage(text);
            } else if (type === 'warning') {
                vscode.window.showWarningMessage(text);
            } else {
                vscode.window.showInformationMessage(text);
            }
            return { success: true };
        });

        messageBus.on(ExtensionMessageType.OPEN_EXTERNAL, async (data: any) => {
            await vscode.env.openExternal(vscode.Uri.parse(data.url));
            return { success: true };
        });

        // ========== State Management ==========

        messageBus.on(ExtensionMessageType.GET_STATE, async () => {
            return { state: null }; // State is managed in webview
        });

        messageBus.on(ExtensionMessageType.SET_STATE, async () => {
            return { success: true }; // State is managed in webview
        });

        // ========== WebSocket Proxy ==========

        messageBus.on(ExtensionMessageType.WEBSOCKET_REQUEST, async (data: any) => {
            try {
                const response = await this.wsManager.sendRequest(data.type, data.data);
                return response;
            } catch (error) {
                const errorMessage = String(error);

                // Show VSCode notification for critical errors
                if (data.type === 'load_graph') {
                    vscode.window.showErrorMessage(`Failed to load graph: ${errorMessage}`, 'OK');
                }

                throw new Error(errorMessage);
            }
        });

        messageBus.on(ExtensionMessageType.WEBSOCKET_CONNECT, async () => {
            try {
                const port = this.serverManager.getPort();
                const wsUrl = `ws://localhost:${port}/ws`;
                await this.wsManager.connect(wsUrl);
                return {
                    connected: this.wsManager.isConnected(),
                    url: wsUrl,
                };
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                return {
                    connected: false,
                    error: String(error),
                };
            }
        });

        // ========== Logging ==========

        messageBus.on(ExtensionMessageType.LOG, async (data: any) => {
            console.log('[Webview]', data.message);
            return { success: true };
        });

        console.log(`🍜 [WebviewManager] Setup ${messageBus.getStats().handlerCount} handlers`);
    }


    private async saveGraph(graphPath: string, graphData: string, document?: vscode.TextDocument) {
        try {
            // Ensure server is running
            const isServerRunning = await this.serverManager.ensureServerRunning();
            if (!isServerRunning) {
                throw new Error('Failed to start Ramen server');
            }

            const serverPort = this.serverManager.getPort();

            // Parse the graph data to ensure it's valid JSON
            let parsedGraphData;
            try {
                parsedGraphData = JSON.parse(graphData);
            } catch (parseError) {
                throw new Error(`Invalid graph data format: ${parseError}`);
            }

            // Use backend API to save the graph with proper formatting
            const saveRequest = {
                path: graphPath,
                graph: parsedGraphData,
                dependencies: null,
            };

            const response = await this.makeHttpRequest(
                {
                    hostname: 'localhost',
                    port: serverPort,
                    path: '/api/graphs/save',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'VSCode-Extension/1.0.0',
                    },
                },
                JSON.stringify(saveRequest)
            );

            const result = JSON.parse(response);

            if (result.success) {
                // If we have a document (custom editor), reload it to show the formatted content
                if (document) {
                    // Read the saved file and update the document
                    const savedContent = await vscode.workspace.fs.readFile(
                        vscode.Uri.file(graphPath)
                    );
                    const savedText = Buffer.from(savedContent).toString('utf8');

                    const edit = new vscode.WorkspaceEdit();
                    edit.replace(
                        document.uri,
                        new vscode.Range(0, 0, document.lineCount, 0),
                        savedText
                    );
                    await vscode.workspace.applyEdit(edit);
                }

                vscode.window.showInformationMessage('Graph saved successfully');
            } else {
                throw new Error(result.message || 'Failed to save graph');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save graph: ${error}`);
            console.error('Save graph error:', error);
        }
    }

    private async executeGraph(graphPath: string) {
        vscode.commands.executeCommand('ramen.executeGraph', vscode.Uri.file(graphPath));
    }

    private pendingNodeFetches: Map<string, Promise<any>> = new Map();

    /**
     * 為 MessageBus 準備的 fetchNodes 方法
     * 直接返回資料，由 MessageBus 處理回應
     */
    private async fetchNodesForBus(panel: vscode.WebviewPanel): Promise<any> {
        const panelKey = 'global';

        // 如果已經有進行中的請求，等待它完成
        const existingFetch = this.pendingNodeFetches.get(panelKey);
        if (existingFetch) {
            return await existingFetch;
        }

        // 創建新的請求 promise
        const fetchPromise = (async () => {
            try {
                const isServerRunning = await this.serverManager.ensureServerRunning();
                if (!isServerRunning) {
                    throw new Error('Failed to start Ramen server');
                }

                const serverPort = this.serverManager.getPort();
                const wsUrl = `ws://localhost:${serverPort}/ws`;
                const wsClient = await this.wsManager.connect(wsUrl);
                const response = await wsClient.getNodes();

                return response;
            } finally {
                this.pendingNodeFetches.delete(panelKey);
            }
        })();

        this.pendingNodeFetches.set(panelKey, fetchPromise);
        return await fetchPromise;
    }

    /**
     * 為 MessageBus 準備的 fetchTypeConverters 方法
     * 直接返回資料，由 MessageBus 處理回應
     */
    private async fetchTypeConvertersForBus(panel: vscode.WebviewPanel): Promise<any> {
        const isServerRunning = await this.serverManager.ensureServerRunning();
        if (!isServerRunning) {
            throw new Error('Failed to start Ramen server');
        }

        const serverPort = this.serverManager.getPort();
        const wsUrl = `ws://localhost:${serverPort}/ws`;
        const wsClient = await this.wsManager.connect(wsUrl);
        const response = await wsClient.getTypeConverters();

        return response.data;
    }

    notifyFileChange(uri: vscode.Uri) {
        const messageBus = this.messageBuses.get(uri.fsPath);
        if (messageBus) {
            // 使用 MessageBus 發送通知
            messageBus.send(ExtensionMessageType.FILE_CHANGED, {
                path: uri.fsPath,
            });
        } else {
            // 向後相容：使用舊方法
            const panel = this.panels.get(uri.fsPath);
            if (panel) {
                panel.webview.postMessage({
                    command: 'fileChanged',
                    path: uri.fsPath,
                });
            }
        }
    }

    updateTheme(theme: string) {
        this.messageBuses.forEach((messageBus, graphPath) => {
            // 使用 MessageBus 發送主題更新
            messageBus.send(ExtensionMessageType.UPDATE_THEME, { theme });
        });

        // 向後相容：同時使用舊方法
        this.panels.forEach((panel) => {
            if (!this.messageBuses.has(panel.title)) {
                panel.webview.postMessage({
                    command: 'updateTheme',
                    theme: theme,
                });
            }
        });
    }

    updateDebugMode(debugMode: boolean) {
        this.messageBuses.forEach((messageBus) => {
            // 使用 MessageBus 發送 debug mode 更新
            messageBus.send(ExtensionMessageType.TOGGLE_DEBUG_MODE, { debugMode });
        });

        // 向後相容：同時使用舊方法
        this.panels.forEach((panel) => {
            if (!this.messageBuses.has(panel.title)) {
                panel.webview.postMessage({
                    command: 'toggleDebugMode',
                    debugMode: debugMode,
                });
            }
        });
    }

    disposeAll() {
        // Dispose all MessageBuses
        this.messageBuses.forEach((messageBus) => {
            messageBus.dispose();
        });
        this.messageBuses.clear();

        this.panels.forEach((panel) => {
            panel.dispose();
        });
        this.panels.clear();
        this.graphStates.clear();
    }

    hasOpenGraph(uri: vscode.Uri): boolean {
        return this.panels.has(uri.fsPath);
    }

    closeGraph(uri: vscode.Uri) {
        const panel = this.panels.get(uri.fsPath);
        if (panel) {
            panel.dispose();
            this.panels.delete(uri.fsPath);
            this.graphStates.delete(uri.fsPath);
        }
    }

    async reloadGraph(uri: vscode.Uri) {
        const panel = this.panels.get(uri.fsPath);
        if (panel) {
            // Save current state
            const currentState = this.graphStates.get(uri.fsPath);

            // Reload the content
            const graphContent = await vscode.workspace.fs.readFile(uri);
            const graphData = graphContent.toString();

            panel.webview.postMessage({
                command: 'reloadGraph',
                data: graphData,
                previousState: currentState,
            });
        }
    }

    saveGraphState(uri: vscode.Uri, state: any) {
        this.graphStates.set(uri.fsPath, state);
    }

    private makeHttpRequest(options: http.RequestOptions, postData?: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const req = http.request(options, (res: any) => {
                let body = '';

                res.on('data', (chunk: string) => {
                    body += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(body);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                    }
                });
            });

            req.on('error', (error: Error) => {
                reject(error);
            });

            if (postData) {
                req.write(postData);
            }

            req.end();
        });
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}

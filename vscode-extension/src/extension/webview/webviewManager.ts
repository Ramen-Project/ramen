import * as vscode from 'vscode';
import * as path from 'path';
import * as http from 'http';
import { RamenServerManager } from '../server/serverManager';
import { getGlobalWebSocketManager, getOrCreateGlobalWebSocketClient } from '../api/GlobalWebSocketManager';

export class RamenWebviewManager {
    private panels: Map<string, vscode.WebviewPanel> = new Map();
    private graphStates: Map<string, any> = new Map();

    constructor(
        private context: vscode.ExtensionContext,
        private serverManager: RamenServerManager
    ) {
        // WebSocket connection is managed globally by GlobalWebSocketManager
        // No need for separate WebSocketManager instance
    }

    async openGraph(uri: vscode.Uri) {
        const graphPath = uri.fsPath;
        const graphName = path.basename(graphPath, '.ramen');
        
        // Ensure server is running before opening webview
        console.log('Ensuring server is running before opening webview...');
        const serverStarted = await this.serverManager.ensureServerRunning();
        if (!serverStarted) {
            vscode.window.showErrorMessage('Failed to start Ramen server. The graph editor may not function properly.');
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
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                    uri
                ]
            }
        );
        
        // Setup the panel with common functionality
        await this.setupPanel(panel, uri);
    }

    async setupCustomEditor(uri: vscode.Uri, panel: vscode.WebviewPanel, document?: vscode.TextDocument) {
        const graphPath = uri.fsPath;
        
        // Ensure server is running before opening webview
        console.log('Setting up custom editor for:', graphPath);
        const serverStarted = await this.serverManager.ensureServerRunning();
        if (!serverStarted) {
            vscode.window.showWarningMessage('Ramen server is not running. Some features may be unavailable.');
        }

        // Ensure WebSocket connection via GlobalWebSocketManager
        if (serverStarted) {
            const port = this.serverManager.getPort();
            const wsUrl = `ws://localhost:${port}/ws`;
            try {
                await getOrCreateGlobalWebSocketClient(wsUrl);
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
                uri
            ]
        };
        
        // Setup the panel with common functionality
        await this.setupPanel(panel, uri, document);
    }

    private async setupPanel(panel: vscode.WebviewPanel, uri: vscode.Uri, document?: vscode.TextDocument) {
        const graphPath = uri.fsPath;

        // Store panel reference
        this.panels.set(graphPath, panel);

        // Set panel icon
        panel.iconPath = {
            light: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'graph-light.svg'),
            dark: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'graph-dark.svg')
        };

        // Handle panel disposal
        panel.onDidDispose(() => {
            this.panels.delete(graphPath);
            console.log(`🍜 [WebviewManager] Panel closed for ${path.basename(graphPath)}`);
        });
        
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                await this.handleWebviewMessage(message, panel, graphPath, document);
            },
            undefined,
            this.context.subscriptions
        );
        
        // If document is provided (custom editor), watch for changes
        if (document) {
            const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
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
                data: graphData
            });
        } catch (error) {
            // If JSON is invalid, show error in webview
            panel.webview.postMessage({
                command: 'error',
                message: `Invalid JSON: ${error}`
            });
        }
    }

    private async handleWebviewMessage(message: {command: string, [key: string]: unknown}, panel: vscode.WebviewPanel, graphPath: string, document?: vscode.TextDocument) {
        switch (message.command) {
            case 'saveGraph':
                await this.saveGraph(graphPath, message.data as string, document);
                break;
                
            case 'executeGraph':
                await this.executeGraph(graphPath);
                break;
                
            case 'fetchNodes':
                await this.handleFetchNodes(panel);
                break;
                
            case 'showMessage':
                if (message.type === 'error') {
                    vscode.window.showErrorMessage(message.text as string);
                } else if (message.type === 'warning') {
                    vscode.window.showWarningMessage(message.text as string);
                } else {
                    vscode.window.showInformationMessage(message.text as string);
                }
                break;
                
            case 'openExternal':
                vscode.env.openExternal(vscode.Uri.parse(message.url as string));
                break;
                
            case 'getState':
                // VSCode webview doesn't have getState method, this is handled in the webview itself
                panel.webview.postMessage({
                    command: 'setState',
                    state: null // State is managed in the webview
                });
                break;
                
            case 'setState':
                // State is managed in the webview, just acknowledge
                break;
                
            case 'log':
                console.log('[Webview]', message.message);
                break;
                
            case 'websocket-request':
                // Handle WebSocket request/response pattern
                // This allows webview to make any WebSocket API call through the extension
                try {
                    console.log(`🍜 [WebviewManager] Handling websocket-request: ${message.type}`);
                    const wsManager = getGlobalWebSocketManager();
                    const response = await wsManager.sendRequest(
                        message.type as string,
                        message.data
                    );
                    console.log(`🍜 [WebviewManager] WebSocket request succeeded: ${message.type}`);
                    panel.webview.postMessage({
                        type: 'websocket-response',
                        id: message.id,
                        data: response
                    });
                } catch (error) {
                    console.error(`🍜 [WebviewManager] WebSocket request failed: ${message.type}`, error);

                    // Show VSCode notification for critical errors
                    const errorMessage = String(error);

                    console.log(`🍜 [WebviewManager] DEBUG - Checking notification conditions:`, {
                        messageType: message.type,
                        isLoadGraph: message.type === 'load_graph',
                        errorMessage,
                        errorType: typeof error,
                        fullError: error
                    });

                    if (message.type === 'load_graph') {
                        console.log(`🍜 [WebviewManager] ⚠️ SHOWING VSCode notification for load_graph error`);
                        vscode.window.showErrorMessage(
                            `Failed to load graph: ${errorMessage}`,
                            'OK'
                        );
                        console.log(`🍜 [WebviewManager] ✅ showErrorMessage called`);
                    }

                    panel.webview.postMessage({
                        type: 'websocket-error',
                        id: message.id,
                        error: errorMessage
                    });
                }
                break;

            case 'websocket-connect':
                // Ensure WebSocket connection via GlobalWebSocketManager
                try {
                    const port = this.serverManager.getPort();
                    const wsUrl = `ws://localhost:${port}/ws`;
                    await getOrCreateGlobalWebSocketClient(wsUrl);
                    const wsManager = getGlobalWebSocketManager();
                    panel.webview.postMessage({
                        type: 'websocket-status',
                        connected: wsManager.isConnected()
                    });
                } catch (error) {
                    console.error('Failed to connect WebSocket:', error);
                    panel.webview.postMessage({
                        type: 'websocket-status',
                        connected: false
                    });
                }
                break;
        }
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
                dependencies: null
            };
            
            const response = await this.makeHttpRequest({
                hostname: 'localhost',
                port: serverPort,
                path: '/api/graphs/save',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'VSCode-Extension/1.0.0'
                }
            }, JSON.stringify(saveRequest));
            
            const result = JSON.parse(response);
            
            if (result.success) {
                // If we have a document (custom editor), reload it to show the formatted content
                if (document) {
                    // Read the saved file and update the document
                    const savedContent = await vscode.workspace.fs.readFile(vscode.Uri.file(graphPath));
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

    private async handleFetchNodes(panel: vscode.WebviewPanel) {
        const panelKey = 'global'; // 使用全域 key 因為節點列表是共享的

        // 如果已經有進行中的請求，等待它完成
        const existingFetch = this.pendingNodeFetches.get(panelKey);
        if (existingFetch) {
            try {
                const response = await existingFetch;
                panel.webview.postMessage({
                    command: 'nodesResponse',
                    success: true,
                    data: response
                });
                return;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                panel.webview.postMessage({
                    command: 'nodesResponse',
                    success: false,
                    error: errorMessage
                });
                return;
            }
        }

        // 創建新的請求 promise
        const fetchPromise = (async () => {
            try {
                // Ensure server is running
                const isServerRunning = await this.serverManager.ensureServerRunning();
                if (!isServerRunning) {
                    throw new Error('Failed to start Ramen server');
                }

                const serverPort = this.serverManager.getPort();
                const wsUrl = `ws://localhost:${serverPort}/ws`;

                // 使用全域 WebSocket 連接
                const wsClient = await getOrCreateGlobalWebSocketClient(wsUrl);

                // 使用全域連接獲取節點
                const response = await wsClient.getNodes();

                return response;
            } finally {
                // 請求完成後清理
                this.pendingNodeFetches.delete(panelKey);
            }
        })();

        // 記錄進行中的請求
        this.pendingNodeFetches.set(panelKey, fetchPromise);

        try {
            const response = await fetchPromise;

            // Send the result back to webview
            panel.webview.postMessage({
                command: 'nodesResponse',
                success: true,
                data: response
            });

        } catch (error) {
            console.error('🍜 [WebviewManager] Failed to fetch nodes:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            panel.webview.postMessage({
                command: 'nodesResponse',
                success: false,
                error: errorMessage
            });
        }
    }

    notifyFileChange(uri: vscode.Uri) {
        const panel = this.panels.get(uri.fsPath);
        if (panel) {
            panel.webview.postMessage({
                command: 'fileChanged',
                path: uri.fsPath
            });
        }
    }

    updateTheme(theme: string) {
        this.panels.forEach((panel) => {
            panel.webview.postMessage({
                command: 'updateTheme',
                theme: theme
            });
        });
    }

    disposeAll() {
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
                previousState: currentState
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
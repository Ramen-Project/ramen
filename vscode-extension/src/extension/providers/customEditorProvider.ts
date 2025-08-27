import * as vscode from 'vscode';
import { RamenWebviewManager } from '../webview/webviewManager';
import { RamenServerManager } from '../server/serverManager';

/**
 * Custom editor provider for .ramen files
 * This makes Ramen graphs open in the visual editor by default
 */
export class RamenCustomEditorProvider implements vscode.CustomTextEditorProvider {
    
    constructor(
        private context: vscode.ExtensionContext,
        private webviewManager: RamenWebviewManager,
        private serverManager: RamenServerManager
    ) {}

    /**
     * Called when a custom editor is opened
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        console.log('🍜 Resolving custom text editor for:', document.uri.fsPath);
        
        // Configure the webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'out'),
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                vscode.Uri.joinPath(this.context.extensionUri, 'resources'),
                vscode.Uri.file(document.uri.fsPath).with({ path: document.uri.fsPath.substring(0, document.uri.fsPath.lastIndexOf('/')) })
            ]
        };

        // Set the webview content to our graph editor
        console.log('🍜 Setting webview HTML content...');
        const htmlContent = await this.getWebviewContent(webviewPanel.webview, document.uri.fsPath);
        console.log('🍜 HTML content length:', htmlContent.length);
        webviewPanel.webview.html = htmlContent;

        // Update webview when document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                this.updateWebview(webviewPanel, document);
            }
        });

        // Clean up when webview is disposed
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(
            message => this.handleMessage(message, document, webviewPanel),
            undefined,
            this.context.subscriptions
        );

        // Initial content update
        this.updateWebview(webviewPanel, document);
    }

    /**
     * Update the webview content when the document changes
     */
    private updateWebview(webviewPanel: vscode.WebviewPanel, document: vscode.TextDocument) {
        try {
            // Parse the document content as JSON to validate
            const graphData = JSON.parse(document.getText());
            
            // Send the graph data to the webview
            webviewPanel.webview.postMessage({
                type: 'graphUpdate',
                data: graphData
            });
        } catch (error) {
            // If JSON is invalid, show error in webview
            webviewPanel.webview.postMessage({
                type: 'error',
                message: `Invalid JSON: ${error}`
            });
        }
    }

    /**
     * Handle messages from the webview
     */
    private async handleMessage(
        message: any, 
        document: vscode.TextDocument, 
        webviewPanel: vscode.WebviewPanel
    ) {
        switch (message.type) {
            case 'saveGraph':
                await this.saveGraph(document, message.data);
                break;
                
            case 'executeGraph':
                await this.executeGraph(document.uri);
                break;
                
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    /**
     * Save graph data to the document
     */
    private async saveGraph(document: vscode.TextDocument, graphData: any) {
        const edit = new vscode.WorkspaceEdit();
        
        // Format the JSON nicely
        const formattedJson = JSON.stringify(graphData, null, 2);
        
        // Replace the entire document content
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            formattedJson
        );

        await vscode.workspace.applyEdit(edit);
    }

    /**
     * Execute the graph
     */
    private async executeGraph(uri: vscode.Uri) {
        if (!this.serverManager.isRunning()) {
            const started = await this.serverManager.start();
            if (!started) {
                vscode.window.showErrorMessage('Failed to start Ramen server');
                return;
            }
        }

        const result = await this.serverManager.executeGraph(uri.fsPath);
        
        if (result.success) {
            vscode.window.showInformationMessage('Graph executed successfully');
            if (result.output) {
                const outputChannel = vscode.window.createOutputChannel('Ramen Graph Output');
                outputChannel.appendLine(result.output);
                outputChannel.show();
            }
        } else {
            vscode.window.showErrorMessage(`Graph execution failed: ${result.error}`);
        }
    }

    /**
     * Generate HTML content for the webview
     */
    private async getWebviewContent(webview: vscode.Webview, graphPath: string): Promise<string> {
        console.log('🍜 Generating webview content for:', graphPath);
        const serverPort = this.serverManager.getPort();
        const config = vscode.workspace.getConfiguration('ramen');
        const theme = config.get<string>('theme', 'auto');
        
        // Get URIs for the built React webview resources
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview', 'webview.js')
        );
        
        const vscodeStyleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'vscode.css')
        );
        
        console.log('🍜 Script URI:', scriptUri.toString());
        console.log('🍜 VSCode Style URI:', vscodeStyleUri.toString());
        
        // Read graph content
        let graphData = '';
        try {
            const graphContent = await vscode.workspace.fs.readFile(vscode.Uri.file(graphPath));
            graphData = graphContent.toString();
        } catch (error) {
            console.error('Error reading graph file:', error);
            graphData = '{"version": "1.0", "nodes": [], "edges": []}'; // Default empty graph
        }
        
        // Generate nonce for CSP
        const nonce = this.getNonce();
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
                img-src ${webview.cspSource} data: https:; 
                script-src 'unsafe-eval' 'unsafe-inline' 'nonce-${nonce}' ${webview.cspSource}; 
                style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com;
                font-src ${webview.cspSource} https://fonts.gstatic.com;
                connect-src ws://localhost:${serverPort} http://localhost:${serverPort};">
            <title>Ramen Graph Editor</title>
            <link href="${vscodeStyleUri}" rel="stylesheet">
            <style nonce="${nonce}">
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
            
            <script nonce="${nonce}">
                // VS Code API setup - make it globally available
                const vscode = acquireVsCodeApi();
                window.vscode = vscode;
                
                // Initial configuration for React app
                window.ramenConfig = {
                    graphPath: '${graphPath.replace(/\\/g, '\\\\')}',
                    serverPort: ${serverPort},
                    theme: '${theme}',
                    graphData: ${JSON.stringify(graphData)},
                    isVSCode: true,
                    isCustomEditor: true,
                    // Disable problematic features for VSCode webview
                    disableServiceWorker: true,
                    healthCheckInterval: 30000, // Less frequent health checks (30s instead of default)
                    offlineMode: false
                };
                
                // Save state
                vscode.setState({
                    graphPath: '${graphPath.replace(/\\/g, '\\\\')}',
                    graphData: window.ramenConfig.graphData
                });
                
                // Disable service worker registration for VSCode webview
                if ('serviceWorker' in navigator) {
                    // Override navigator.serviceWorker to prevent registration
                    Object.defineProperty(navigator, 'serviceWorker', {
                        value: undefined,
                        writable: false
                    });
                }
                
                // Throttle health check requests
                let lastHealthCheck = 0;
                const HEALTH_CHECK_THROTTLE = 10000; // 10 seconds
                
                // Intercept fetch for debugging and throttling
                const originalFetch = window.fetch;
                window.fetch = function(...args) {
                    const url = args[0];
                    
                    // Throttle health check requests
                    if (typeof url === 'string' && url.includes('/health')) {
                        const now = Date.now();
                        if (now - lastHealthCheck < HEALTH_CHECK_THROTTLE) {
                            console.log('🍜 Health check throttled, using cached result');
                            return Promise.resolve(new Response('{"status": "healthy"}', {
                                status: 200,
                                statusText: 'OK',
                                headers: { 'Content-Type': 'application/json' }
                            }));
                        }
                        lastHealthCheck = now;
                    }
                    
                    console.log('🍜 Fetch request:', args[0]);
                    return originalFetch.apply(this, args)
                        .then(response => {
                            console.log('🍜 Fetch response:', response.status, response.url);
                            return response;
                        })
                        .catch(error => {
                            console.error('🍜 Fetch error:', error, 'for URL:', args[0]);
                            throw error;
                        });
                };
                
                console.log('🍜 Ramen Custom Editor initialized');
                console.log('🍜 Config:', window.ramenConfig);
                console.log('🍜 VSCode API:', vscode);
                console.log('🍜 Root element:', document.getElementById('root'));
                console.log('🍜 Service Worker disabled:', !('serviceWorker' in navigator));
                
                // Debug: Check if script will load
                window.addEventListener('load', () => {
                    console.log('🍜 Window loaded');
                    setTimeout(() => {
                        console.log('🍜 Checking React mount after 2s...');
                        const root = document.getElementById('root');
                        console.log('🍜 Root content:', root?.innerHTML);
                    }, 2000);
                });
                
                // Listen for any errors
                window.addEventListener('error', (e) => {
                    console.error('🍜 Window error:', e.error);
                });
                
                window.addEventListener('unhandledrejection', (e) => {
                    console.error('🍜 Unhandled promise rejection:', e.reason);
                });
            </script>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    /**
     * Escape HTML characters to prevent injection
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Generate a random nonce for CSP
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
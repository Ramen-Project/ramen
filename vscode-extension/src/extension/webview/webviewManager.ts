import * as vscode from 'vscode';
import * as path from 'path';
import { RamenServerManager } from '../server/serverManager';

export class RamenWebviewManager {
    private panels: Map<string, vscode.WebviewPanel> = new Map();
    
    constructor(
        private context: vscode.ExtensionContext,
        private serverManager: RamenServerManager
    ) {}

    async openGraph(uri: vscode.Uri) {
        const graphPath = uri.fsPath;
        const graphName = path.basename(graphPath, '.ramen');
        
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
        });
        
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                await this.handleWebviewMessage(message, panel!, graphPath);
            },
            undefined,
            this.context.subscriptions
        );
        
        // Set HTML content
        panel.webview.html = await this.getWebviewContent(panel.webview, graphPath);
    }

    private async getWebviewContent(webview: vscode.Webview, graphPath: string): Promise<string> {
        const serverPort = this.serverManager.getPort();
        const config = vscode.workspace.getConfiguration('ramen');
        const theme = config.get<string>('theme', 'auto');
        
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
        
        // Read graph content
        const graphContent = await vscode.workspace.fs.readFile(vscode.Uri.file(graphPath));
        const graphData = graphContent.toString();
        
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
                // VSCode API
                const vscode = acquireVsCodeApi();
                
                // Make VSCode API available globally for the React app
                window.vscode = vscode;
                
                // Initial configuration for the React app
                window.ramenConfig = {
                    graphPath: '${graphPath.replace(/\\/g, '\\\\')}',
                    serverPort: ${serverPort},
                    theme: '${theme}',
                    graphData: ${JSON.stringify(graphData)},
                    isVSCode: true
                };
                
                // Save initial state
                vscode.setState({
                    graphPath: '${graphPath.replace(/\\/g, '\\\\')}',
                    graphData: window.ramenConfig.graphData
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
                
                // Restore state if available
                const previousState = vscode.getState();
                if (previousState && previousState.graphData) {
                    window.ramenConfig.graphData = previousState.graphData;
                }
            </script>
            <script type="module" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private async handleWebviewMessage(message: {command: string, [key: string]: unknown}, panel: vscode.WebviewPanel, graphPath: string) {
        switch (message.command) {
            case 'saveGraph':
                await this.saveGraph(graphPath, message.data as string);
                break;
                
            case 'executeGraph':
                await this.executeGraph(graphPath);
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
        }
    }

    private async saveGraph(graphPath: string, graphData: string) {
        try {
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(graphPath),
                Buffer.from(graphData, 'utf8')
            );
            
            vscode.window.showInformationMessage('Graph saved successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save graph: ${error}`);
        }
    }

    private async executeGraph(graphPath: string) {
        vscode.commands.executeCommand('ramen.executeGraph', vscode.Uri.file(graphPath));
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
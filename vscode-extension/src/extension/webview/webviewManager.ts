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
                    vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview'),
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
            vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', 'webview.js')
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
                script-src 'nonce-${nonce}' ${webview.cspSource}; 
                style-src ${webview.cspSource} 'unsafe-inline';
                connect-src ws://localhost:${serverPort} http://localhost:${serverPort};">
            <link href="${vscodeStyleUri}" rel="stylesheet">
            <link href="${styleUri}" rel="stylesheet">
            <title>Ramen Graph Editor</title>
        </head>
        <body data-theme="${theme}">
            <div id="root">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading Ramen Graph Editor...</p>
                </div>
            </div>
            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                
                // Initial configuration
                window.ramenConfig = {
                    graphPath: '${graphPath.replace(/\\/g, '\\\\')}',
                    serverPort: ${serverPort},
                    theme: '${theme}',
                    graphData: ${JSON.stringify(graphData)},
                    isVSCode: true
                };
                
                // Save state
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
                            if (window.ramenApp) {
                                window.ramenApp.updateTheme(message.theme);
                            }
                            break;
                        case 'fileChanged':
                            if (window.ramenApp) {
                                window.ramenApp.reloadGraph();
                            }
                            break;
                        case 'serverRestarted':
                            if (window.ramenApp) {
                                window.ramenApp.reconnect();
                            }
                            break;
                    }
                });
                
                // Restore state if available
                const previousState = vscode.getState();
                if (previousState && previousState.graphData) {
                    window.ramenConfig.graphData = previousState.graphData;
                }
            </script>
            <script nonce="${nonce}" src="${scriptUri}"></script>
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
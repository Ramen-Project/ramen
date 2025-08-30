import * as vscode from 'vscode';
import * as path from 'path';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
    RevealOutputChannelOn,
    DocumentSelector
} from 'vscode-languageclient/node';

/**
 * Language Server Protocol implementation for Ramen
 * Provides intellisense, completions, and diagnostics
 */
export class RamenLanguageServer {
    private client: LanguageClient | null = null;
    private outputChannel: vscode.OutputChannel;
    private readonly documentSelector: DocumentSelector = [
        { scheme: 'file', language: 'ramen' },
        { scheme: 'file', pattern: '**/*.ramen' }
    ];
    
    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('Ramen Language Server');
    }
    
    async start(): Promise<void> {
        const serverModule = this.getServerModule();
        
        if (!serverModule) {
            this.outputChannel.appendLine('Language server module not found');
            return;
        }
        
        // Server options
        const serverOptions: ServerOptions = {
            run: {
                module: serverModule,
                transport: TransportKind.ipc,
                args: ['--node-ipc']
            },
            debug: {
                module: serverModule,
                transport: TransportKind.ipc,
                args: ['--node-ipc', '--debug']
            }
        };
        
        // Client options
        const clientOptions: LanguageClientOptions = {
            documentSelector: this.documentSelector,
            synchronize: {
                fileEvents: vscode.workspace.createFileSystemWatcher('**/*.ramen')
            },
            outputChannel: this.outputChannel,
            revealOutputChannelOn: RevealOutputChannelOn.Error,
            initializationOptions: {
                ramenPath: this.getRamenPath(),
                pythonPath: this.getPythonPath()
            }
        };
        
        // Create and start client
        this.client = new LanguageClient(
            'ramenLanguageServer',
            'Ramen Language Server',
            serverOptions,
            clientOptions
        );
        
        // Register additional features
        this.registerFeatures();
        
        // Start the client
        await this.client.start();
        
        this.outputChannel.appendLine('Language server started');
    }
    
    async stop(): Promise<void> {
        if (this.client) {
            await this.client.stop();
            this.client = null;
            this.outputChannel.appendLine('Language server stopped');
        }
    }
    
    async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }
    
    private getServerModule(): string | undefined {
        // Check for compiled server
        const serverPath = path.join(
            this.context.extensionPath,
            'out',
            'server',
            'languageServer.js'
        );
        
        if (require('fs').existsSync(serverPath)) {
            return serverPath;
        }
        
        // Development path
        const devPath = path.join(
            this.context.extensionPath,
            'src',
            'server',
            'languageServer.ts'
        );
        
        if (require('fs').existsSync(devPath)) {
            return devPath;
        }
        
        return undefined;
    }
    
    private getRamenPath(): string {
        const config = vscode.workspace.getConfiguration('ramen');
        return config.get<string>('installPath', '');
    }
    
    private getPythonPath(): string {
        const config = vscode.workspace.getConfiguration('ramen');
        return config.get<string>('pythonPath', 'python');
    }
    
    private registerFeatures(): void {
        if (!this.client) return;
        
        // Register custom commands
        this.registerCommands();
        
        // Register code actions
        this.registerCodeActions();
        
        // Register semantic tokens
        this.registerSemanticTokens();
    }
    
    private registerCommands(): void {
        // Register LSP-specific commands
        this.context.subscriptions.push(
            vscode.commands.registerCommand('ramen.lsp.restart', () => {
                this.restart();
            }),
            
            vscode.commands.registerCommand('ramen.lsp.showOutput', () => {
                this.outputChannel.show();
            })
        );
    }
    
    private registerCodeActions(): void {
        // Register code action provider for quick fixes
        const provider = vscode.languages.registerCodeActionsProvider(
            this.documentSelector,
            {
                provideCodeActions(
                    document: vscode.TextDocument,
                    range: vscode.Range | vscode.Selection,
                    context: vscode.CodeActionContext
                ): vscode.CodeAction[] {
                    const actions: vscode.CodeAction[] = [];
                    
                    // Add node quick fix
                    if (context.diagnostics.some(d => d.code === 'missing-node')) {
                        const action = new vscode.CodeAction(
                            'Add missing node',
                            vscode.CodeActionKind.QuickFix
                        );
                        action.command = {
                            command: 'ramen.insertNode',
                            title: 'Insert Node'
                        };
                        actions.push(action);
                    }
                    
                    // Fix connection quick fix
                    if (context.diagnostics.some(d => d.code === 'invalid-connection')) {
                        const action = new vscode.CodeAction(
                            'Fix connection',
                            vscode.CodeActionKind.QuickFix
                        );
                        action.command = {
                            command: 'ramen.fixConnection',
                            title: 'Fix Connection'
                        };
                        actions.push(action);
                    }
                    
                    return actions;
                }
            }
        );
        
        this.context.subscriptions.push(provider);
    }
    
    private registerSemanticTokens(): void {
        // Register semantic token provider for syntax highlighting
        const tokenTypes = ['node', 'edge', 'parameter', 'variable', 'function'];
        const tokenModifiers = ['declaration', 'readonly', 'static', 'deprecated'];
        
        const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
        
        const provider = vscode.languages.registerDocumentSemanticTokensProvider(
            this.documentSelector,
            {
                provideDocumentSemanticTokens(
                    document: vscode.TextDocument
                ): vscode.SemanticTokens {
                    const builder = new vscode.SemanticTokensBuilder(legend);
                    
                    // Parse document and add tokens
                    try {
                        const content = document.getText();
                        const graph = JSON.parse(content);
                        
                        // Add tokens for nodes
                        if (graph.nodes) {
                            for (const node of graph.nodes) {
                                const pos = document.positionAt(
                                    content.indexOf(`"id": "${node.id}"`)
                                );
                                builder.push(
                                    pos.line,
                                    pos.character + 7,
                                    node.id.length,
                                    0, // node type
                                    0  // no modifiers
                                );
                            }
                        }
                        
                        // Add tokens for edges
                        if (graph.edges) {
                            for (const edge of graph.edges) {
                                const pos = document.positionAt(
                                    content.indexOf(`"id": "${edge.id}"`)
                                );
                                builder.push(
                                    pos.line,
                                    pos.character + 7,
                                    edge.id.length,
                                    1, // edge type
                                    0  // no modifiers
                                );
                            }
                        }
                    } catch (error) {
                        // Invalid JSON, skip semantic tokens
                    }
                    
                    return builder.build();
                }
            },
            legend
        );
        
        this.context.subscriptions.push(provider);
    }
    
    isRunning(): boolean {
        return this.client !== null && this.client.isRunning();
    }
    
    async sendRequest<T>(method: string, params?: any): Promise<T | undefined> {
        if (!this.client || !this.client.isRunning()) {
            return undefined;
        }
        
        try {
            return await this.client.sendRequest(method, params);
        } catch (error) {
            this.outputChannel.appendLine(`Request failed: ${error}`);
            return undefined;
        }
    }
    
    async sendNotification(method: string, params?: any): Promise<void> {
        if (!this.client || !this.client.isRunning()) {
            return;
        }
        
        try {
            await this.client.sendNotification(method, params);
        } catch (error) {
            this.outputChannel.appendLine(`Notification failed: ${error}`);
        }
    }
    
    onNotification(method: string, handler: (params: any) => void): void {
        if (!this.client) return;
        
        this.client.onNotification(method, handler);
    }
    
    dispose(): void {
        if (this.client) {
            this.client.stop();
        }
    }
}
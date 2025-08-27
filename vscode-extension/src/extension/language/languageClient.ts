import * as vscode from 'vscode';
import * as path from 'path';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';
import { RamenServerManager } from '../server/serverManager';

export class RamenLanguageClient {
    private client: LanguageClient | null = null;
    
    constructor(
        private context: vscode.ExtensionContext,
        private serverManager: RamenServerManager
    ) {}
    
    async start() {
        // Server options
        const serverModule = path.join(
            this.context.extensionPath,
            'src',
            'language-server',
            'server.py'
        );
        
        const pythonPath = await this.findPythonInterpreter();
        if (!pythonPath) {
            vscode.window.showWarningMessage(
                'Python interpreter not found. Language server features will be disabled.'
            );
            return;
        }
        
        const serverOptions: ServerOptions = {
            run: {
                command: pythonPath,
                args: [serverModule],
                transport: TransportKind.stdio
            },
            debug: {
                command: pythonPath,
                args: [serverModule, '--debug'],
                transport: TransportKind.stdio
            }
        };
        
        // Client options
        const clientOptions: LanguageClientOptions = {
            documentSelector: [
                { scheme: 'file', language: 'ramen' }
            ],
            synchronize: {
                fileEvents: vscode.workspace.createFileSystemWatcher('**/*.ramen')
            },
            initializationOptions: {
                serverPort: this.serverManager.getPort()
            }
        };
        
        // Create and start the language client
        this.client = new LanguageClient(
            'ramenLanguageServer',
            'Ramen Language Server',
            serverOptions,
            clientOptions
        );
        
        // Start the client
        await this.client.start();
        
        console.log('Ramen language server started');
    }
    
    async stop() {
        if (this.client) {
            await this.client.stop();
            this.client = null;
        }
    }
    
    private async findPythonInterpreter(): Promise<string | null> {
        const config = vscode.workspace.getConfiguration('ramen');
        const configuredPath = config.get<string>('pythonPath');
        
        if (configuredPath) {
            return configuredPath;
        }
        
        // First try to find the project's virtual environment
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            // Check for ramen project .venv (Windows)
            const venvPath = path.join(workspaceFolder.uri.fsPath, '.venv', 'Scripts', 'python.exe');
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(venvPath));
                return venvPath;
            } catch {
                // .venv doesn't exist, continue to other methods
            }
            
            // Check for ramen project .venv (Unix)
            const venvPathUnix = path.join(workspaceFolder.uri.fsPath, '.venv', 'bin', 'python');
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(venvPathUnix));
                return venvPathUnix;
            } catch {
                // .venv doesn't exist, continue to other methods
            }
        }
        
        // Try to get Python from the Python extension
        try {
            const pythonExtension = vscode.extensions.getExtension('ms-python.python');
            if (pythonExtension) {
                await pythonExtension.activate();
                const pythonApi = pythonExtension.exports;
                const interpreter = await pythonApi.settings.getExecutionDetails();
                if (interpreter?.execCommand) {
                    return interpreter.execCommand[0];
                }
            }
        } catch {
            // Python extension not available
        }
        
        // Fallback to system Python
        return 'python3';
    }
}
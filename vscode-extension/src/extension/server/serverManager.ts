import * as vscode from 'vscode';
import { spawn, execSync, ChildProcess } from 'child_process';
import * as net from 'net';
import * as path from 'path';

export class RamenServerManager {
    private serverProcess: ChildProcess | null = null;
    private port: number;
    private outputChannel: vscode.OutputChannel;
    private isServerRunning: boolean = false;
    private startTime: number | null = null;
    private pythonPath: string | null = null;
    private _onDidChangeStatus = new vscode.EventEmitter<void>();
    readonly onDidChangeStatus = this._onDidChangeStatus.event;
    
    constructor(private context: vscode.ExtensionContext) {
        const config = vscode.workspace.getConfiguration('ramen');
        this.port = config.get<number>('serverPort', 8000);
        this.outputChannel = vscode.window.createOutputChannel('Ramen Server');
    }
    
    async start(): Promise<boolean> {
        if (this.isServerRunning) {
            console.log('Ramen server is already running');
            return true;
        }
        
        // Check if port is available
        const portAvailable = await this.isPortAvailable(this.port);
        if (!portAvailable) {
            const useAnyway = await vscode.window.showWarningMessage(
                `Port ${this.port} is already in use. Try to connect anyway?`,
                'Yes',
                'No',
                'Change Port'
            );
            
            if (useAnyway === 'No') {
                return false;
            } else if (useAnyway === 'Change Port') {
                const newPort = await vscode.window.showInputBox({
                    prompt: 'Enter new port number',
                    value: String(this.port + 1),
                    validateInput: (value) => {
                        const port = parseInt(value);
                        if (isNaN(port) || port < 1024 || port > 65535) {
                            return 'Please enter a valid port number between 1024 and 65535';
                        }
                        return null;
                    }
                });
                
                if (newPort) {
                    this.port = parseInt(newPort);
                    // Update configuration
                    await vscode.workspace.getConfiguration('ramen').update(
                        'serverPort',
                        this.port,
                        vscode.ConfigurationTarget.Global
                    );
                } else {
                    return false;
                }
            }
        }
        
        // Find Python interpreter
        const pythonPath = await this.findPythonInterpreter();
        if (!pythonPath) {
            vscode.window.showErrorMessage('Python interpreter not found. Please install Python 3.12 or later.');
            return false;
        }
        
        // Start server process
        this.outputChannel.show();
        this.outputChannel.appendLine(`Starting Ramen server on port ${this.port}...`);
        
        try {
            // Determine the command to run
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }
            
            let command = pythonPath;
            let args: string[] = [];
            let cwd = workspaceFolder.uri.fsPath;
            
            // Handle special case for uv run python
            if (pythonPath === 'uv run python') {
                command = 'uv';
                args = ['run', 'python'];
                // Set cwd to the Ramen project root
                cwd = workspaceFolder.uri.fsPath.replace(/vscode-extension.*$/, '');
            }
            
            args.push(
                '-m',
                'ramen.entrypoint',
                'server',
                '--port',
                String(this.port)
            );
            
            const config = vscode.workspace.getConfiguration('ramen');
            if (config.get<boolean>('debugMode', false)) {
                args.push('--debug');
            }
            
            this.outputChannel.appendLine(`Command: ${command} ${args.join(' ')}`);
            this.outputChannel.appendLine(`Working directory: ${cwd}`);
            
            this.serverProcess = spawn(command, args, {
                cwd: cwd,
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1'
                }
            });
            
            // Handle stdout
            this.serverProcess.stdout?.on('data', (data) => {
                const message = data.toString();
                this.outputChannel.append(message);
                
                // Check if server started successfully
                if (message.includes('Server started') || message.includes('Uvicorn running')) {
                    this.isServerRunning = true;
                    this.startTime = Date.now();
                    this._onDidChangeStatus.fire();
                    vscode.window.showInformationMessage('Ramen server started successfully');
                }
            });
            
            // Handle stderr
            this.serverProcess.stderr?.on('data', (data) => {
                const message = data.toString();
                this.outputChannel.append(`[ERROR] ${message}`);
            });
            
            // Handle process exit
            this.serverProcess.on('exit', (code) => {
                this.isServerRunning = false;
                this.startTime = null;
                this._onDidChangeStatus.fire();
                this.outputChannel.appendLine(`Server process exited with code ${code}`);
                if (code !== 0) {
                    vscode.window.showErrorMessage(`Ramen server exited with code ${code}`);
                }
                this.serverProcess = null;
            });
            
            // Wait for server to start (with timeout)
            await this.waitForServer();
            
            return this.isServerRunning;
        } catch (error) {
            this.outputChannel.appendLine(`Failed to start server: ${error}`);
            vscode.window.showErrorMessage(`Failed to start Ramen server: ${error}`);
            return false;
        }
    }
    
    async stop(): Promise<void> {
        if (this.serverProcess) {
            this.outputChannel.appendLine('Stopping Ramen server...');
            this.serverProcess.kill();
            this.serverProcess = null;
            this.isServerRunning = false;
            this.startTime = null;
            this._onDidChangeStatus.fire();
        }
    }
    
    async restart(): Promise<void> {
        await this.stop();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
        await this.start();
    }
    
    isRunning(): boolean {
        return this.isServerRunning;
    }
    
    getPort(): number {
        return this.port;
    }
    
    async executeGraph(graphPath: string): Promise<{success: boolean, output?: string, error?: string}> {
        if (!this.isServerRunning) {
            return {
                success: false,
                error: 'Server is not running'
            };
        }
        
        // Send execution request to server
        try {
            const response = await this.sendRequest('POST', '/api/execute', {
                graphPath: graphPath
            }) as { success: boolean; output?: string; error?: string };
            
            return response;
        } catch (error) {
            return {
                success: false,
                error: String(error)
            };
        }
    }
    
    private async findPythonInterpreter(): Promise<string | null> {
        const config = vscode.workspace.getConfiguration('ramen');
        const configuredPath = config.get<string>('pythonPath');
        
        if (configuredPath) {
            this.pythonPath = configuredPath;
            return configuredPath;
        }
        
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            // First, try to find the Ramen project's virtual environment
            const ramenProjectPath = workspaceFolder.uri.fsPath.replace(/vscode-extension.*$/, '');
            
            // Try both Windows and Unix paths
            const pythonPaths = [
                path.join(ramenProjectPath, '.venv', 'Scripts', 'python.exe'), // Windows
                path.join(ramenProjectPath, '.venv', 'bin', 'python')          // Unix
            ];
            
            for (const uvVenvPath of pythonPaths) {
                try {
                    const result = execSync(`"${uvVenvPath}" --version`, {
                        encoding: 'utf8'
                    });
                    
                    // Check if ramen module is available in this environment
                    try {
                        execSync(`"${uvVenvPath}" -c "import ramen"`, {
                            encoding: 'utf8',
                            stdio: 'ignore'
                        });
                        this.outputChannel.appendLine(`Using Ramen project Python: ${uvVenvPath}`);
                        this.pythonPath = uvVenvPath;
                        return uvVenvPath;
                    } catch {
                        this.outputChannel.appendLine(`Ramen module not found in ${uvVenvPath}`);
                    }
                } catch {
                    // Try next path
                }
            }
            
            this.outputChannel.appendLine(`Virtual environment not found at ${ramenProjectPath}/.venv`);
            
            // Try uv run command as an alternative
            try {
                execSync('uv --version', { encoding: 'utf8', stdio: 'ignore' });
                // If uv is available, we can use "uv run python"
                this.outputChannel.appendLine('Using uv run python for Ramen project');
                this.pythonPath = 'uv run python';
                return 'uv run python';
            } catch {
                this.outputChannel.appendLine('uv not available');
            }
        }
        
        // Try common Python commands
        const candidates = ['python3.12', 'python3', 'python'];
        
        for (const candidate of candidates) {
            try {
                const result = execSync(`${candidate} --version`, {
                    encoding: 'utf8'
                });
                
                // Check version
                const versionMatch = result.match(/Python (\d+)\.(\d+)/);
                if (versionMatch) {
                    const major = parseInt(versionMatch[1]);
                    const minor = parseInt(versionMatch[2]);
                    
                    if (major === 3 && minor >= 12) {
                        this.pythonPath = candidate;
                        return candidate;
                    }
                }
            } catch {
                // Try next candidate
            }
        }
        
        // Try to find Python from Python extension
        try {
            const pythonExtension = vscode.extensions.getExtension('ms-python.python');
            if (pythonExtension) {
                await pythonExtension.activate();
                const pythonApi = pythonExtension.exports;
                const interpreter = await pythonApi.settings.getExecutionDetails();
                if (interpreter?.execCommand) {
                    this.pythonPath = interpreter.execCommand[0];
                    return interpreter.execCommand[0];
                }
            }
        } catch {
            // Python extension not available
        }
        
        return null;
    }
    
    private async isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.once('error', () => {
                resolve(false);
            });
            
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            
            server.listen(port);
        });
    }
    
    private async waitForServer(timeout: number = 10000): Promise<void> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (this.isServerRunning) {
                return;
            }
            
            // Try to connect to server
            try {
                await this.sendRequest('GET', '/health');
                this.isServerRunning = true;
                return;
            } catch {
                // Server not ready yet
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        throw new Error('Server startup timeout');
    }
    
    private async sendRequest(method: string, path: string, body?: unknown): Promise<unknown> {
        const url = `http://localhost:${this.port}${path}`;
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });
        
        if (!response.ok) {
            throw new Error(`Server request failed: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
    }
    
    getProcessId(): number | null {
        return this.serverProcess?.pid || null;
    }
    
    getUptime(): number | null {
        if (!this.isServerRunning || !this.startTime) {
            return null;
        }
        return Date.now() - this.startTime;
    }
    
    getPythonPath(): string | null {
        return this.pythonPath;
    }
}
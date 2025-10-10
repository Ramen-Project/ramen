import { spawn, ChildProcess } from 'child_process';
import {
    BaseBackendConnection,
    BackendType,
    ConnectionOptions,
    ConnectionStatus,
    BackendProvider,
} from './backendInterface';

/**
 * Local backend connection implementation
 * Connects to a local Python server process
 */
export class LocalBackendConnection extends BaseBackendConnection {
    private serverProcess: ChildProcess | null = null;
    private requestCounter = 0;
    private pendingRequests = new Map<
        number,
        {
            resolve: (value: any) => void;
            reject: (error: Error) => void;
            timeout: NodeJS.Timeout;
        }
    >();

    constructor() {
        super(`local-${Date.now()}`, BackendType.LOCAL, {
            execution: true,
            streaming: true,
            debugging: true,
            profiling: true,
            versioning: true,
            customNodes: true,
        });
    }

    async connect(options: ConnectionOptions): Promise<void> {
        this.setStatus(ConnectionStatus.CONNECTING);

        try {
            // Start local server process
            await this.startServerProcess(options);

            // Wait for server to be ready
            await this.waitForServer(options.timeout || 10000);

            this.setStatus(ConnectionStatus.CONNECTED);
        } catch (error) {
            this.setStatus(ConnectionStatus.ERROR);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.serverProcess) {
            this.serverProcess.kill();
            this.serverProcess = null;
        }

        // Clean up pending requests
        this.pendingRequests.forEach(({ reject, timeout }) => {
            clearTimeout(timeout);
            reject(new Error('Connection closed'));
        });
        this.pendingRequests.clear();

        this.setStatus(ConnectionStatus.DISCONNECTED);
    }

    async sendRequest<T = unknown>(method: string, params?: unknown): Promise<T> {
        if (this.status !== ConnectionStatus.CONNECTED) {
            throw new Error('Not connected to backend');
        }

        const requestId = ++this.requestCounter;
        const timeout = 30000; // 30 seconds default timeout

        return new Promise<T>((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request timeout: ${method}`));
            }, timeout);

            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                timeout: timeoutHandle,
            });

            // Send request to server process
            this.sendToProcess({
                jsonrpc: '2.0',
                id: requestId,
                method,
                params,
            });
        });
    }

    sendNotification(method: string, params?: unknown): void {
        if (this.status !== ConnectionStatus.CONNECTED) {
            console.warn('Cannot send notification: not connected');
            return;
        }

        this.sendToProcess({
            jsonrpc: '2.0',
            method,
            params,
        });
    }

    private async startServerProcess(options: ConnectionOptions): Promise<void> {
        const pythonPath = await this.findPythonInterpreter();
        const port = options.port || 8000;

        this.serverProcess = spawn(
            pythonPath,
            ['-m', 'ramen.entrypoint', 'server', '--port', String(port)],
            {
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1',
                },
            }
        );

        this.serverProcess.stdout?.on('data', (data) => {
            this.handleProcessOutput(data.toString());
        });

        this.serverProcess.stderr?.on('data', (data) => {
            console.error('Server error:', data.toString());
        });

        this.serverProcess.on('exit', (code) => {
            this.setStatus(ConnectionStatus.DISCONNECTED);
            console.log(`Server process exited with code ${code}`);
        });
    }

    private handleProcessOutput(data: string): void {
        // Parse JSON-RPC messages from process output
        const lines = data.split('\n').filter((line) => line.trim());

        for (const line of lines) {
            try {
                if (line.startsWith('{')) {
                    const message = JSON.parse(line);

                    if ('id' in message) {
                        // Response to a request
                        const pending = this.pendingRequests.get(message.id);
                        if (pending) {
                            clearTimeout(pending.timeout);
                            this.pendingRequests.delete(message.id);

                            if ('error' in message) {
                                pending.reject(new Error(message.error.message));
                            } else {
                                pending.resolve(message.result);
                            }
                        }
                    } else if ('method' in message) {
                        // Notification from server
                        this.handleNotification(message.method, message.params);
                    }
                }
            } catch (error) {
                // Not a JSON message, ignore
            }
        }
    }

    private sendToProcess(message: Record<string, unknown>): void {
        if (this.serverProcess && this.serverProcess.stdin) {
            this.serverProcess.stdin.write(JSON.stringify(message) + '\n');
        }
    }

    private async waitForServer(timeout: number): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                const result = await this.sendRequest<{ status: string }>('health');
                if (result && result.status === 'healthy') {
                    return;
                }
            } catch {
                // Server not ready yet
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        throw new Error('Server startup timeout');
    }

    private async findPythonInterpreter(): Promise<string> {
        // Implementation would check for Python in various locations
        // For now, return a simple default
        return 'python3';
    }
}

/**
 * Provider for local backend connections
 */
export class LocalBackendProvider implements BackendProvider {
    async createConnection(options: ConnectionOptions): Promise<LocalBackendConnection> {
        const connection = new LocalBackendConnection();
        await connection.connect(options);
        return connection;
    }

    validateOptions(options: ConnectionOptions): boolean {
        // Validate port if provided
        if (options.port && (options.port < 1024 || options.port > 65535)) {
            return false;
        }
        return true;
    }

    getDefaultOptions(): ConnectionOptions {
        return {
            port: 8000,
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
        };
    }
}

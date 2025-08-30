import * as vscode from 'vscode';

/**
 * Abstract interface for backend communication
 * Allows swapping between different backend implementations
 */
export interface IBackendConnection {
    readonly id: string;
    readonly type: BackendType;
    readonly status: ConnectionStatus;
    readonly capabilities: BackendCapabilities;
    
    connect(options: ConnectionOptions): Promise<void>;
    disconnect(): Promise<void>;
    sendRequest<T = any>(method: string, params?: any): Promise<T>;
    sendNotification(method: string, params?: any): void;
    onRequest(method: string, handler: RequestHandler): vscode.Disposable;
    onNotification(method: string, handler: NotificationHandler): vscode.Disposable;
    onStatusChange(handler: (status: ConnectionStatus) => void): vscode.Disposable;
}

export enum BackendType {
    LOCAL = 'local',
    REMOTE = 'remote',
    EMBEDDED = 'embedded',
    CLOUD = 'cloud'
}

export enum ConnectionStatus {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    ERROR = 'error',
    RECONNECTING = 'reconnecting'
}

export interface ConnectionOptions {
    host?: string;
    port?: number;
    token?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    secure?: boolean;
}

export interface BackendCapabilities {
    execution: boolean;
    streaming: boolean;
    debugging: boolean;
    profiling: boolean;
    versioning: boolean;
    collaboration?: boolean;
    customNodes?: boolean;
}

export type RequestHandler = (params: any) => Promise<any>;
export type NotificationHandler = (params: any) => void;

/**
 * Factory for creating backend connections
 */
export class BackendConnectionFactory {
    private static providers = new Map<BackendType, BackendProvider>();
    
    static registerProvider(type: BackendType, provider: BackendProvider): void {
        this.providers.set(type, provider);
    }
    
    static async createConnection(type: BackendType, options: ConnectionOptions): Promise<IBackendConnection> {
        const provider = this.providers.get(type);
        if (!provider) {
            throw new Error(`No provider registered for backend type: ${type}`);
        }
        return provider.createConnection(options);
    }
    
    static getAvailableTypes(): BackendType[] {
        return Array.from(this.providers.keys());
    }
}

export interface BackendProvider {
    createConnection(options: ConnectionOptions): Promise<IBackendConnection>;
    validateOptions(options: ConnectionOptions): boolean;
    getDefaultOptions(): ConnectionOptions;
}

/**
 * Base implementation for backend connections
 */
export abstract class BaseBackendConnection implements IBackendConnection {
    protected _status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
    protected _statusEmitter = new vscode.EventEmitter<ConnectionStatus>();
    protected requestHandlers = new Map<string, RequestHandler>();
    protected notificationHandlers = new Map<string, Set<NotificationHandler>>();
    
    constructor(
        public readonly id: string,
        public readonly type: BackendType,
        public readonly capabilities: BackendCapabilities
    ) {}
    
    get status(): ConnectionStatus {
        return this._status;
    }
    
    protected setStatus(status: ConnectionStatus): void {
        if (this._status !== status) {
            this._status = status;
            this._statusEmitter.fire(status);
        }
    }
    
    abstract connect(options: ConnectionOptions): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract sendRequest<T = any>(method: string, params?: any): Promise<T>;
    abstract sendNotification(method: string, params?: any): void;
    
    onRequest(method: string, handler: RequestHandler): vscode.Disposable {
        if (this.requestHandlers.has(method)) {
            throw new Error(`Request handler already registered for method: ${method}`);
        }
        this.requestHandlers.set(method, handler);
        return new vscode.Disposable(() => {
            this.requestHandlers.delete(method);
        });
    }
    
    onNotification(method: string, handler: NotificationHandler): vscode.Disposable {
        if (!this.notificationHandlers.has(method)) {
            this.notificationHandlers.set(method, new Set());
        }
        const handlers = this.notificationHandlers.get(method)!;
        handlers.add(handler);
        return new vscode.Disposable(() => {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.notificationHandlers.delete(method);
            }
        });
    }
    
    onStatusChange(handler: (status: ConnectionStatus) => void): vscode.Disposable {
        return this._statusEmitter.event(handler);
    }
    
    protected async handleRequest(method: string, params: any): Promise<any> {
        const handler = this.requestHandlers.get(method);
        if (!handler) {
            throw new Error(`No handler registered for request method: ${method}`);
        }
        return handler(params);
    }
    
    protected handleNotification(method: string, params: any): void {
        const handlers = this.notificationHandlers.get(method);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(params);
                } catch (error) {
                    console.error(`Error in notification handler for ${method}:`, error);
                }
            });
        }
    }
    
    dispose(): void {
        this.disconnect();
        this._statusEmitter.dispose();
        this.requestHandlers.clear();
        this.notificationHandlers.clear();
    }
}
import * as vscode from 'vscode';
import { RamenServerManager } from '../server/serverManager';
import { errorHandler, RamenError, ErrorCategory, ErrorSeverity } from '../core/errorHandler';

interface WebSocketMessage {
    type: string;
    data: any;
    id?: string;
    timestamp?: number;
    retryCount?: number;
}

interface QueuedMessage extends WebSocketMessage {
    timestamp: number;
    retryCount: number;
    priority: number;
}

export class WebSocketManager {
    private ws: WebSocket | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // Start with 1 second
    private messageHandlers = new Map<string, Set<(data: any) => void>>();
    private connectionPromise: Promise<void> | null = null;
    private isConnecting = false;
    private outputChannel: vscode.OutputChannel;
    
    // Message queue implementation
    private messageQueue: QueuedMessage[] = [];
    private maxQueueSize = 1000;
    private queueFlushTimer: NodeJS.Timeout | null = null;
    private sentMessages = new Map<string, QueuedMessage>();
    private messageAckTimeout = 30000; // 30 seconds
    private persistQueue = true;
    
    private _onMessage = new vscode.EventEmitter<WebSocketMessage>();
    readonly onMessage = this._onMessage.event;
    
    private _onConnectionChange = new vscode.EventEmitter<boolean>();
    readonly onConnectionChange = this._onConnectionChange.event;
    
    constructor(
        private serverManager: RamenServerManager,
        private context: vscode.ExtensionContext
    ) {
        this.outputChannel = vscode.window.createOutputChannel('Ramen WebSocket');
        
        // Subscribe to server status changes
        this.serverManager.onDidChangeStatus(() => {
            if (this.serverManager.isRunning()) {
                this.connect();
            } else {
                this.disconnect();
            }
        });
    }
    
    async connect(): Promise<void> {
        // Avoid multiple simultaneous connection attempts
        if (this.isConnecting) {
            return this.connectionPromise || Promise.resolve();
        }
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }
        
        this.isConnecting = true;
        this.connectionPromise = this._connect();
        
        try {
            await this.connectionPromise;
        } finally {
            this.isConnecting = false;
            this.connectionPromise = null;
        }
    }
    
    private async _connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const port = this.serverManager.getPort();
            const wsUrl = `ws://localhost:${port}/ws`;
            
            this.outputChannel.appendLine(`Connecting to WebSocket at ${wsUrl}...`);
            
            try {
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    this.outputChannel.appendLine('WebSocket connected');
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;
                    this._onConnectionChange.fire(true);
                    
                    // Flush queued messages
                    this.flushMessageQueue();
                    
                    // Load persisted queue if any
                    this.loadPersistedQueue();
                    
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        this.outputChannel.appendLine(`Failed to parse WebSocket message: ${error}`);
                    }
                };
                
                this.ws.onerror = (error) => {
                    this.outputChannel.appendLine(`WebSocket error: ${error}`);
                    reject(error);
                };
                
                this.ws.onclose = (event) => {
                    this.outputChannel.appendLine(`WebSocket closed: ${event.code} ${event.reason}`);
                    this._onConnectionChange.fire(false);
                    
                    // Attempt to reconnect if not manually closed
                    if (event.code !== 1000 && this.serverManager.isRunning()) {
                        this.scheduleReconnect();
                    }
                };
            } catch (error) {
                this.outputChannel.appendLine(`Failed to create WebSocket: ${error}`);
                reject(error);
            }
        });
    }
    
    private scheduleReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.outputChannel.appendLine('Max reconnection attempts reached');
            vscode.window.showWarningMessage(
                'Lost connection to Ramen server. Please restart the server.',
                'Restart Server'
            ).then(selection => {
                if (selection === 'Restart Server') {
                    this.serverManager.restart();
                }
            });
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Max 30 seconds
        
        this.outputChannel.appendLine(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        this.reconnectTimer = setTimeout(() => {
            this.connect().catch(error => {
                this.outputChannel.appendLine(`Reconnection failed: ${error}`);
            });
        }, delay);
    }
    
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        // Persist queue before disconnecting
        if (this.persistQueue && this.messageQueue.length > 0) {
            this.persistMessageQueue();
        }
        
        if (this.ws) {
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
        }
        
        this._onConnectionChange.fire(false);
    }
    
    sendMessage(type: string, data: any, id?: string, priority: number = 5): void {
        const message: QueuedMessage = {
            type,
            data,
            id: id || this.generateId(),
            timestamp: Date.now(),
            retryCount: 0,
            priority
        };
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.outputChannel.appendLine('WebSocket not connected, queuing message');
            this.queueMessage(message);
            return;
        }
        
        try {
            this.ws.send(JSON.stringify(message));
            
            // Track sent messages for acknowledgment
            if (message.id) {
                this.sentMessages.set(message.id, message);
                
                // Set timeout for acknowledgment
                setTimeout(() => {
                    if (this.sentMessages.has(message.id!)) {
                        this.handleUnacknowledgedMessage(message);
                    }
                }, this.messageAckTimeout);
            }
        } catch (error) {
            errorHandler.handle(
                new RamenError(
                    `Failed to send WebSocket message: ${error}`,
                    ErrorCategory.WEBSOCKET,
                    ErrorSeverity.ERROR,
                    JSON.stringify({ message, error })
                )
            );
            this.queueMessage(message);
        }
    }
    
    async sendRequest<T = any>(type: string, data: any): Promise<T> {
        return new Promise((resolve, reject) => {
            const id = this.generateId();
            const timeout = setTimeout(() => {
                reject(new Error(`Request timeout: ${type}`));
            }, 30000); // 30 second timeout
            
            const handler = (message: WebSocketMessage) => {
                if (message.id === id) {
                    clearTimeout(timeout);
                    this.off('response', handler);
                    
                    if (message.type === 'error') {
                        reject(new Error(message.data.error || 'Unknown error'));
                    } else {
                        resolve(message.data);
                    }
                }
            };
            
            this.on('response', handler);
            this.sendMessage(type, data, id);
        });
    }
    
    on(type: string, handler: (data: any) => void): void {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        this.messageHandlers.get(type)!.add(handler);
    }
    
    off(type: string, handler: (data: any) => void): void {
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
            handlers.delete(handler);
        }
    }
    
    private handleMessage(message: WebSocketMessage) {
        this._onMessage.fire(message);
        
        const handlers = this.messageHandlers.get(message.type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(message.data);
                } catch (error) {
                    this.outputChannel.appendLine(`Error in message handler: ${error}`);
                }
            });
        }
        
        // Special handling for specific message types
        switch (message.type) {
            case 'execution_started':
                vscode.window.showInformationMessage(`Execution started: ${message.data.execution_id}`);
                break;
            case 'execution_completed':
                vscode.window.showInformationMessage('Execution completed successfully');
                break;
            case 'execution_error':
                vscode.window.showErrorMessage(`Execution error: ${message.data.error}`);
                break;
            case 'node_executed':
                // Could update a status bar item or tree view
                break;
        }
    }
    
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
    
    getConnectionState(): string {
        if (!this.ws) {return 'Disconnected';}
        
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'Connecting';
            case WebSocket.OPEN:
                return 'Connected';
            case WebSocket.CLOSING:
                return 'Closing';
            case WebSocket.CLOSED:
                return 'Closed';
            default:
                return 'Unknown';
        }
    }
    
    dispose() {
        // Clear queue flush timer
        if (this.queueFlushTimer) {
            clearTimeout(this.queueFlushTimer);
        }
        
        // Persist queue before disposing
        if (this.persistQueue && this.messageQueue.length > 0) {
            this.persistMessageQueue();
        }
        
        this.disconnect();
        this._onMessage.dispose();
        this._onConnectionChange.dispose();
        this.messageHandlers.clear();
        this.sentMessages.clear();
    }
    
    // Message Queue Management Methods
    
    private queueMessage(message: QueuedMessage): void {
        // Check queue size limit
        if (this.messageQueue.length >= this.maxQueueSize) {
            // Remove oldest low-priority messages
            this.messageQueue.sort((a, b) => {
                // Sort by priority first, then by timestamp
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                return a.timestamp - b.timestamp;
            });
            
            // Remove bottom 10% of queue
            const removeCount = Math.floor(this.maxQueueSize * 0.1);
            this.messageQueue.splice(-removeCount, removeCount);
            
            this.outputChannel.appendLine(`Message queue full, removed ${removeCount} old messages`);
        }
        
        this.messageQueue.push(message);
        this.outputChannel.appendLine(`Message queued: ${message.type} (Queue size: ${this.messageQueue.length})`);
        
        // Persist queue periodically
        if (this.persistQueue) {
            this.schedulePersistQueue();
        }
    }
    
    private flushMessageQueue(): void {
        if (this.messageQueue.length === 0) {
            return;
        }
        
        this.outputChannel.appendLine(`Flushing ${this.messageQueue.length} queued messages...`);
        
        // Sort by priority and timestamp
        this.messageQueue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return a.timestamp - b.timestamp;
        });
        
        // Send messages in batches to avoid overwhelming the connection
        const batchSize = 10;
        let sent = 0;
        
        const sendBatch = () => {
            const batch = this.messageQueue.splice(0, batchSize);
            
            for (const message of batch) {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    try {
                        // Update retry count
                        message.retryCount++;
                        this.ws.send(JSON.stringify(message));
                        sent++;
                    } catch (error) {
                        // Put back in queue if failed
                        this.messageQueue.unshift(message);
                        this.outputChannel.appendLine(`Failed to flush message: ${error}`);
                        break;
                    }
                } else {
                    // Put back in queue if connection lost
                    this.messageQueue.unshift(...batch);
                    break;
                }
            }
            
            if (this.messageQueue.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
                // Schedule next batch
                setTimeout(sendBatch, 100);
            } else {
                this.outputChannel.appendLine(`Flushed ${sent} messages, ${this.messageQueue.length} remaining`);
            }
        };
        
        sendBatch();
    }
    
    private handleUnacknowledgedMessage(message: QueuedMessage): void {
        this.sentMessages.delete(message.id!);
        
        // Retry if under retry limit
        if (message.retryCount < 3) {
            this.outputChannel.appendLine(`Message ${message.id} not acknowledged, retrying...`);
            message.retryCount++;
            this.queueMessage(message);
        } else {
            errorHandler.handle(
                new RamenError(
                    `Message ${message.id} failed after ${message.retryCount} retries`,
                    ErrorCategory.WEBSOCKET,
                    ErrorSeverity.WARNING,
                    JSON.stringify({ message })
                )
            );
        }
    }
    
    private persistMessageQueue(): void {
        try {
            const queueData = JSON.stringify(this.messageQueue);
            this.context.workspaceState.update('websocket.messageQueue', queueData);
            this.outputChannel.appendLine(`Persisted ${this.messageQueue.length} queued messages`);
        } catch (error) {
            errorHandler.handle(
                new RamenError(
                    `Failed to persist message queue: ${error}`,
                    ErrorCategory.WEBSOCKET,
                    ErrorSeverity.WARNING
                )
            );
        }
    }
    
    private loadPersistedQueue(): void {
        try {
            const queueData = this.context.workspaceState.get<string>('websocket.messageQueue');
            if (queueData) {
                const persistedQueue = JSON.parse(queueData) as QueuedMessage[];
                
                // Filter out expired messages (older than 1 hour)
                const now = Date.now();
                const validMessages = persistedQueue.filter(msg => 
                    now - msg.timestamp < 3600000
                );
                
                if (validMessages.length > 0) {
                    this.messageQueue.push(...validMessages);
                    this.outputChannel.appendLine(`Loaded ${validMessages.length} persisted messages`);
                    
                    // Clear persisted queue
                    this.context.workspaceState.update('websocket.messageQueue', undefined);
                    
                    // Flush loaded messages
                    this.flushMessageQueue();
                }
            }
        } catch (error) {
            errorHandler.handle(
                new RamenError(
                    `Failed to load persisted queue: ${error}`,
                    ErrorCategory.WEBSOCKET,
                    ErrorSeverity.WARNING
                )
            );
        }
    }
    
    private schedulePersistQueue(): void {
        if (this.queueFlushTimer) {
            clearTimeout(this.queueFlushTimer);
        }
        
        // Persist queue after 5 seconds of inactivity
        this.queueFlushTimer = setTimeout(() => {
            this.persistMessageQueue();
        }, 5000);
    }
    
    // Message acknowledgment handling
    handleAcknowledgment(messageId: string): void {
        if (this.sentMessages.has(messageId)) {
            this.sentMessages.delete(messageId);
            this.outputChannel.appendLine(`Message ${messageId} acknowledged`);
        }
    }
    
    // Get queue statistics
    getQueueStats(): { size: number; oldestMessage: number | null; priorities: Map<number, number> } {
        const priorities = new Map<number, number>();
        let oldestTimestamp: number | null = null;
        
        for (const msg of this.messageQueue) {
            const count = priorities.get(msg.priority) || 0;
            priorities.set(msg.priority, count + 1);
            
            if (!oldestTimestamp || msg.timestamp < oldestTimestamp) {
                oldestTimestamp = msg.timestamp;
            }
        }
        
        return {
            size: this.messageQueue.length,
            oldestMessage: oldestTimestamp ? Date.now() - oldestTimestamp : null,
            priorities
        };
    }
}
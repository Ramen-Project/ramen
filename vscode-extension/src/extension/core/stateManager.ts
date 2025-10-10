import * as vscode from 'vscode';
import { errorHandler, RamenError, ErrorCategory, ErrorSeverity } from './errorHandler';

/**
 * Application state structure
 */
export interface AppState {
    server: ServerState;
    websocket: WebSocketState;
    graphs: Map<string, GraphState>;
    ui: UIState;
    settings: SettingsState;
    session: SessionState;
}

export interface ServerState {
    running: boolean;
    port: number;
    pid: number | null;
    startTime: number | null;
    health: 'healthy' | 'unhealthy' | 'unknown';
    version: string | null;
}

export interface WebSocketState {
    connected: boolean;
    reconnectAttempts: number;
    lastConnectedTime: number | null;
    queueSize: number;
}

export interface GraphState {
    id: string;
    path: string;
    name: string;
    isDirty: boolean;
    isExecuting: boolean;
    lastExecutionTime: number | null;
    lastExecutionStatus: 'success' | 'error' | null;
    nodes: number;
    edges: number;
    variables: Record<string, unknown>;
}

export interface UIState {
    activeGraph: string | null;
    openPanels: Set<string>;
    sidebarVisible: boolean;
    theme: 'light' | 'dark' | 'auto';
    zoom: number;
}

export interface SettingsState {
    pythonPath: string | null;
    autoStartServer: boolean;
    debugMode: boolean;
    autoSave: boolean;
    autoSaveInterval: number;
}

export interface SessionState {
    id: string;
    startTime: number;
    user: string | null;
    workspace: string | null;
}

/**
 * State change event
 */
export interface StateChangeEvent<T = any> {
    path: string;
    oldValue: T;
    newValue: T;
    timestamp: number;
}

/**
 * State subscriber
 */
export type StateSubscriber<T = any> = (event: StateChangeEvent<T>) => void;

/**
 * State persistence adapter
 */
interface StatePersistenceAdapter {
    save(state: Partial<AppState>): Promise<void>;
    load(): Promise<Partial<AppState>>;
}

/**
 * Centralized state manager
 */
export class StateManager {
    private static instance: StateManager;
    private state: AppState;
    private subscribers = new Map<string, Set<StateSubscriber>>();
    private globalSubscribers = new Set<StateSubscriber>();
    private history: StateChangeEvent[] = [];
    private maxHistorySize = 100;
    private persistenceAdapter?: StatePersistenceAdapter;
    private persistenceTimer?: NodeJS.Timeout;
    private persistenceDelay = 5000; // 5 seconds
    private outputChannel: vscode.OutputChannel;

    private constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('Ramen State');
        this.state = this.createInitialState();
        this.setupPersistence();
        this.loadPersistedState();
    }

    static getInstance(context?: vscode.ExtensionContext): StateManager {
        if (!StateManager.instance) {
            if (!context) {
                throw new Error('Context required for first initialization');
            }
            StateManager.instance = new StateManager(context);
        }
        return StateManager.instance;
    }

    /**
     * Get current state
     */
    getState(): Readonly<AppState> {
        return Object.freeze(this.deepClone(this.state));
    }

    /**
     * Get state by path
     */
    get<T = any>(path: string): T | undefined {
        const keys = path.split('.');
        let current: unknown = this.state;

        for (const key of keys) {
            if (current === null || current === undefined) {
                return undefined;
            }

            // Handle Map access
            if (current instanceof Map) {
                current = current.get(key);
            } else {
                current = (current as Record<string, unknown>)[key];
            }
        }

        return current as T;
    }

    /**
     * Update state
     */
    update<T = any>(path: string, value: T): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        let current: any = this.state;

        // Navigate to parent
        for (const key of keys) {
            if (current[key] === undefined) {
                current[key] = {};
            }
            current = current[key];
        }

        // Get old value
        const oldValue = current instanceof Map ? current.get(lastKey) : current[lastKey];

        // Skip if no change
        if (oldValue === value) {
            return;
        }

        // Update value
        if (current instanceof Map) {
            current.set(lastKey, value);
        } else {
            current[lastKey] = value;
        }

        // Create event
        const event: StateChangeEvent<T> = {
            path,
            oldValue,
            newValue: value,
            timestamp: Date.now(),
        };

        // Add to history
        this.addToHistory(event);

        // Notify subscribers
        this.notifySubscribers(path, event);

        // Schedule persistence
        this.schedulePersistence();

        // Log change
        this.log(`State updated: ${path}`, value);
    }

    /**
     * Batch update multiple state values
     */
    batchUpdate(updates: Record<string, any>): void {
        const events: StateChangeEvent[] = [];

        // Collect all changes
        for (const [path, value] of Object.entries(updates)) {
            const oldValue = this.get(path);
            if (oldValue !== value) {
                // Apply update without notifying
                this.applyUpdate(path, value);

                events.push({
                    path,
                    oldValue,
                    newValue: value,
                    timestamp: Date.now(),
                });
            }
        }

        // Add all events to history
        events.forEach((event) => this.addToHistory(event));

        // Notify subscribers for all changes
        events.forEach((event) => {
            this.notifySubscribers(event.path, event);
        });

        // Schedule persistence once
        this.schedulePersistence();

        this.log(`Batch update: ${events.length} changes`);
    }

    /**
     * Subscribe to state changes
     */
    subscribe<T = any>(path: string, callback: StateSubscriber<T>): vscode.Disposable {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }

        this.subscribers.get(path)!.add(callback);

        return new vscode.Disposable(() => {
            this.subscribers.get(path)?.delete(callback);
        });
    }

    /**
     * Subscribe to all state changes
     */
    subscribeAll(callback: StateSubscriber): vscode.Disposable {
        this.globalSubscribers.add(callback);

        return new vscode.Disposable(() => {
            this.globalSubscribers.delete(callback);
        });
    }

    /**
     * Add graph to state
     */
    addGraph(graph: GraphState): void {
        const graphs = new Map(this.state.graphs);
        graphs.set(graph.id, graph);
        this.update('graphs', graphs);
    }

    /**
     * Remove graph from state
     */
    removeGraph(graphId: string): void {
        const graphs = new Map(this.state.graphs);
        graphs.delete(graphId);
        this.update('graphs', graphs);
    }

    /**
     * Update graph state
     */
    updateGraph(graphId: string, updates: Partial<GraphState>): void {
        const graph = this.state.graphs.get(graphId);
        if (!graph) {
            throw new RamenError(
                `Graph ${graphId} not found`,
                ErrorCategory.VALIDATION,
                ErrorSeverity.ERROR
            );
        }

        const updatedGraph = { ...graph, ...updates };
        const graphs = new Map(this.state.graphs);
        graphs.set(graphId, updatedGraph);
        this.update('graphs', graphs);
    }

    /**
     * Reset state
     */
    reset(): void {
        const newState = this.createInitialState();
        const oldState = this.state;
        this.state = newState;

        // Notify all subscribers
        this.globalSubscribers.forEach((subscriber) => {
            subscriber({
                path: '',
                oldValue: oldState,
                newValue: newState,
                timestamp: Date.now(),
            });
        });

        this.log('State reset to initial values');
    }

    /**
     * Get state history
     */
    getHistory(count?: number): StateChangeEvent[] {
        if (count) {
            return this.history.slice(-count);
        }
        return [...this.history];
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        this.history = [];
        this.log('State history cleared');
    }

    /**
     * Toggle debug mode
     */
    toggleDebugMode(): boolean {
        const currentDebugMode = this.get<boolean>('settings.debugMode');
        const newDebugMode = !currentDebugMode;
        this.update('settings.debugMode', newDebugMode);
        this.log(`Debug mode ${newDebugMode ? 'enabled' : 'disabled'}`);
        return newDebugMode;
    }

    /**
     * Export state snapshot
     */
    async exportSnapshot(): Promise<void> {
        const snapshot = {
            timestamp: new Date().toISOString(),
            state: this.serializeState(this.state),
            history: this.history,
        };

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('ramen-state.json'),
            filters: {
                JSON: ['json'],
            },
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(
                uri,
                Buffer.from(JSON.stringify(snapshot, null, 2))
            );
            vscode.window.showInformationMessage('State snapshot exported');
        }
    }

    /**
     * Import state snapshot
     */
    async importSnapshot(): Promise<void> {
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: {
                JSON: ['json'],
            },
        });

        if (uris && uris.length > 0) {
            try {
                const content = await vscode.workspace.fs.readFile(uris[0]);
                const snapshot = JSON.parse(content.toString());

                if (snapshot.state) {
                    this.state = this.deserializeState(snapshot.state);
                    this.history = snapshot.history || [];

                    // Notify all subscribers
                    this.globalSubscribers.forEach((subscriber) => {
                        subscriber({
                            path: '',
                            oldValue: null,
                            newValue: this.state,
                            timestamp: Date.now(),
                        });
                    });

                    vscode.window.showInformationMessage('State snapshot imported');
                }
            } catch (error) {
                errorHandler.handle(
                    new RamenError(
                        `Failed to import snapshot: ${error}`,
                        ErrorCategory.FILESYSTEM,
                        ErrorSeverity.ERROR
                    )
                );
            }
        }
    }

    // Private methods

    private createInitialState(): AppState {
        return {
            server: {
                running: false,
                port: 8000,
                pid: null,
                startTime: null,
                health: 'unknown',
                version: null,
            },
            websocket: {
                connected: false,
                reconnectAttempts: 0,
                lastConnectedTime: null,
                queueSize: 0,
            },
            graphs: new Map(),
            ui: {
                activeGraph: null,
                openPanels: new Set(),
                sidebarVisible: true,
                theme: 'auto',
                zoom: 100,
            },
            settings: {
                pythonPath: null,
                autoStartServer: true,
                debugMode: false,
                autoSave: true,
                autoSaveInterval: 60000,
            },
            session: {
                id: this.generateSessionId(),
                startTime: Date.now(),
                user: null,
                workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || null,
            },
        };
    }

    private applyUpdate(path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        let current: any = this.state;

        for (const key of keys) {
            if (current[key] === undefined) {
                current[key] = {};
            }
            current = current[key];
        }

        if (current instanceof Map) {
            current.set(lastKey, value);
        } else {
            current[lastKey] = value;
        }
    }

    private notifySubscribers(path: string, event: StateChangeEvent): void {
        // Notify specific path subscribers
        this.subscribers.get(path)?.forEach((subscriber) => {
            try {
                subscriber(event);
            } catch (error) {
                errorHandler.handle(
                    new RamenError(
                        `Subscriber error: ${error}`,
                        ErrorCategory.UNKNOWN,
                        ErrorSeverity.WARNING,
                        JSON.stringify({ path, event })
                    )
                );
            }
        });

        // Notify parent path subscribers
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            this.subscribers.get(parentPath)?.forEach((subscriber) => {
                try {
                    subscriber(event);
                } catch (error) {
                    errorHandler.handle(
                        new RamenError(
                            `Parent subscriber error: ${error}`,
                            ErrorCategory.UNKNOWN,
                            ErrorSeverity.WARNING,
                            JSON.stringify({ path: parentPath, event })
                        )
                    );
                }
            });
        }

        // Notify global subscribers
        this.globalSubscribers.forEach((subscriber) => {
            try {
                subscriber(event);
            } catch (error) {
                errorHandler.handle(
                    new RamenError(
                        `Global subscriber error: ${error}`,
                        ErrorCategory.UNKNOWN,
                        ErrorSeverity.WARNING,
                        JSON.stringify({ event })
                    )
                );
            }
        });
    }

    private addToHistory(event: StateChangeEvent): void {
        this.history.push(event);

        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    private setupPersistence(): void {
        this.persistenceAdapter = {
            save: async (state) => {
                const serialized = this.serializeState(state);
                await this.context.workspaceState.update('ramen.state', serialized);
            },
            load: async () => {
                const serialized = this.context.workspaceState.get<any>('ramen.state');
                return serialized ? this.deserializeState(serialized) : {};
            },
        };
    }

    private schedulePersistence(): void {
        if (this.persistenceTimer) {
            clearTimeout(this.persistenceTimer);
        }

        this.persistenceTimer = setTimeout(() => {
            this.persistState();
        }, this.persistenceDelay);
    }

    private async persistState(): Promise<void> {
        if (!this.persistenceAdapter) {
            return;
        }

        try {
            await this.persistenceAdapter.save(this.state);
            this.log('State persisted');
        } catch (error) {
            errorHandler.handle(
                new RamenError(
                    `Failed to persist state: ${error}`,
                    ErrorCategory.FILESYSTEM,
                    ErrorSeverity.WARNING
                )
            );
        }
    }

    private async loadPersistedState(): Promise<void> {
        if (!this.persistenceAdapter) {
            return;
        }

        try {
            const persisted = await this.persistenceAdapter.load();

            // Merge with initial state
            if (persisted.server) {
                Object.assign(this.state.server, persisted.server);
            }
            if (persisted.ui) {
                Object.assign(this.state.ui, persisted.ui);
            }
            if (persisted.settings) {
                Object.assign(this.state.settings, persisted.settings);
            }

            this.log('Persisted state loaded');
        } catch (error) {
            errorHandler.handle(
                new RamenError(
                    `Failed to load persisted state: ${error}`,
                    ErrorCategory.FILESYSTEM,
                    ErrorSeverity.WARNING
                )
            );
        }
    }

    private serializeState(state: any): any {
        if (state instanceof Map) {
            return {
                __type: 'Map',
                entries: Array.from(state.entries()),
            };
        }

        if (state instanceof Set) {
            return {
                __type: 'Set',
                values: Array.from(state.values()),
            };
        }

        if (typeof state === 'object' && state !== null) {
            const serialized: any = {};
            for (const [key, value] of Object.entries(state)) {
                serialized[key] = this.serializeState(value);
            }
            return serialized;
        }

        return state;
    }

    private deserializeState(serialized: any): any {
        if (serialized && serialized.__type === 'Map') {
            return new Map(serialized.entries);
        }

        if (serialized && serialized.__type === 'Set') {
            return new Set(serialized.values);
        }

        if (typeof serialized === 'object' && serialized !== null) {
            const deserialized: any = {};
            for (const [key, value] of Object.entries(serialized)) {
                deserialized[key] = this.deserializeState(value);
            }
            return deserialized;
        }

        return serialized;
    }

    private deepClone<T>(obj: T): T {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime()) as T;
        }

        if (obj instanceof Map) {
            const clonedMap = new Map();
            for (const [key, value] of obj) {
                clonedMap.set(key, this.deepClone(value));
            }
            return clonedMap as T;
        }

        if (obj instanceof Set) {
            return new Set(Array.from(obj.values()).map((v) => this.deepClone(v))) as T;
        }

        if (obj instanceof Array) {
            return obj.map((item) => this.deepClone(item)) as T;
        }

        const cloned: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = this.deepClone((obj as any)[key]);
            }
        }

        return cloned;
    }

    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private log(message: string, data?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;

        this.outputChannel.appendLine(logMessage);
        if (data !== undefined) {
            this.outputChannel.appendLine(JSON.stringify(data, null, 2));
        }
    }

    clear(): void {
        // Clear all state
        const oldState = { ...this.state };
        this.state = this.createInitialState();

        // Record history
        this.addToHistory({
            path: '*',
            oldValue: oldState,
            newValue: this.state,
            timestamp: Date.now(),
        });

        // Notify all subscribers
        this.notifySubscribers('*', {
            path: '*',
            oldValue: oldState,
            newValue: this.state,
            timestamp: Date.now(),
        });

        // Clear from persistence
        if (this.context) {
            this.context.globalState.update('ramen.state', undefined);
        }
    }

    dispose(): void {
        if (this.persistenceTimer) {
            clearTimeout(this.persistenceTimer);
        }

        // Final persistence
        this.persistState();

        this.subscribers.clear();
        this.globalSubscribers.clear();
        this.history = [];
    }
}

// Export singleton getter
export function getStateManager(context?: vscode.ExtensionContext): StateManager {
    return StateManager.getInstance(context);
}

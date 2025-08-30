import * as vscode from 'vscode';
import { errorHandler, RamenError, ErrorCategory, ErrorSeverity } from './errorHandler';
import { ChildProcess } from 'child_process';

/**
 * Resource types for tracking
 */
export enum ResourceType {
    DISPOSABLE = 'disposable',
    TIMER = 'timer',
    PROCESS = 'process',
    FILE_WATCHER = 'fileWatcher',
    EVENT_LISTENER = 'eventListener',
    WEBSOCKET = 'websocket',
    OUTPUT_CHANNEL = 'outputChannel',
    STATUS_BAR = 'statusBar',
    TERMINAL = 'terminal',
    CUSTOM = 'custom'
}

/**
 * Resource metadata
 */
interface ResourceMetadata {
    id: string;
    type: ResourceType;
    name: string;
    createdAt: number;
    context?: any;
    parentId?: string;
}

/**
 * Tracked resource
 */
interface TrackedResource {
    resource: any;
    metadata: ResourceMetadata;
    cleanup?: () => Promise<void>;
}

/**
 * Resource lifecycle hooks
 */
interface ResourceLifecycleHooks {
    onBeforeDispose?: (resource: TrackedResource) => Promise<void>;
    onAfterDispose?: (resource: TrackedResource) => void;
    onError?: (error: Error, resource: TrackedResource) => void;
}

/**
 * Unified resource manager for the extension
 */
export class ResourceManager {
    private static instance: ResourceManager;
    private resources = new Map<string, TrackedResource>();
    private resourcesByType = new Map<ResourceType, Set<string>>();
    private childResources = new Map<string, Set<string>>();
    private lifecycleHooks = new Map<ResourceType, ResourceLifecycleHooks>();
    private disposed = false;
    private outputChannel: vscode.OutputChannel;
    private memoryMonitorTimer?: NodeJS.Timeout;
    private resourceLeakThreshold = 100; // Warn if more than 100 resources of same type
    
    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Ramen Resources');
        this.setupDefaultHooks();
        this.startMemoryMonitoring();
    }
    
    static getInstance(): ResourceManager {
        if (!ResourceManager.instance) {
            ResourceManager.instance = new ResourceManager();
        }
        return ResourceManager.instance;
    }
    
    /**
     * Register a resource for tracking
     */
    register<T = any>(
        resource: T,
        type: ResourceType,
        name: string,
        cleanup?: () => Promise<void>,
        parentId?: string
    ): string {
        if (this.disposed) {
            throw new Error('ResourceManager has been disposed');
        }
        
        const id = this.generateId();
        const metadata: ResourceMetadata = {
            id,
            type,
            name,
            createdAt: Date.now(),
            parentId
        };
        
        const trackedResource: TrackedResource = {
            resource,
            metadata,
            cleanup
        };
        
        // Store resource
        this.resources.set(id, trackedResource);
        
        // Track by type
        if (!this.resourcesByType.has(type)) {
            this.resourcesByType.set(type, new Set());
        }
        this.resourcesByType.get(type)!.add(id);
        
        // Track parent-child relationship
        if (parentId) {
            if (!this.childResources.has(parentId)) {
                this.childResources.set(parentId, new Set());
            }
            this.childResources.get(parentId)!.add(id);
        }
        
        // Check for potential leaks
        this.checkResourceLeaks(type);
        
        this.log(`Registered ${type}: ${name} (${id})`);
        
        return id;
    }
    
    /**
     * Register a VSCode Disposable
     */
    registerDisposable(disposable: vscode.Disposable, name: string, parentId?: string): string {
        return this.register(
            disposable,
            ResourceType.DISPOSABLE,
            name,
            async () => disposable.dispose(),
            parentId
        );
    }
    
    /**
     * Register a timer
     */
    registerTimer(timer: NodeJS.Timeout, name: string, parentId?: string): string {
        return this.register(
            timer,
            ResourceType.TIMER,
            name,
            async () => clearTimeout(timer),
            parentId
        );
    }
    
    /**
     * Register a child process
     */
    registerProcess(process: ChildProcess, name: string, parentId?: string): string {
        return this.register(
            process,
            ResourceType.PROCESS,
            name,
            async () => {
                return new Promise<void>((resolve) => {
                    if (process.killed) {
                        resolve();
                        return;
                    }
                    
                    process.once('exit', () => resolve());
                    
                    // Try graceful shutdown first
                    process.kill('SIGTERM');
                    
                    // Force kill after timeout
                    setTimeout(() => {
                        if (!process.killed) {
                            process.kill('SIGKILL');
                        }
                        resolve();
                    }, 5000);
                });
            },
            parentId
        );
    }
    
    /**
     * Unregister and dispose a resource
     */
    async unregister(id: string): Promise<void> {
        const tracked = this.resources.get(id);
        if (!tracked) {
            return;
        }
        
        await this.disposeResource(tracked);
        
        // Remove from tracking
        this.resources.delete(id);
        this.resourcesByType.get(tracked.metadata.type)?.delete(id);
        
        // Dispose child resources
        const children = this.childResources.get(id);
        if (children) {
            for (const childId of children) {
                await this.unregister(childId);
            }
            this.childResources.delete(id);
        }
        
        // Remove from parent's children
        if (tracked.metadata.parentId) {
            this.childResources.get(tracked.metadata.parentId)?.delete(id);
        }
    }
    
    /**
     * Dispose a specific resource
     */
    private async disposeResource(tracked: TrackedResource): Promise<void> {
        const hooks = this.lifecycleHooks.get(tracked.metadata.type);
        
        try {
            // Before dispose hook
            if (hooks?.onBeforeDispose) {
                await hooks.onBeforeDispose(tracked);
            }
            
            // Custom cleanup
            if (tracked.cleanup) {
                await tracked.cleanup();
            } else {
                // Default cleanup based on type
                await this.defaultCleanup(tracked);
            }
            
            // After dispose hook
            if (hooks?.onAfterDispose) {
                hooks.onAfterDispose(tracked);
            }
            
            this.log(`Disposed ${tracked.metadata.type}: ${tracked.metadata.name}`);
        } catch (error) {
            const ramenError = new RamenError(
                `Failed to dispose resource: ${tracked.metadata.name}`,
                ErrorCategory.UNKNOWN,
                ErrorSeverity.WARNING,
                { resource: tracked.metadata, error }
            );
            
            if (hooks?.onError) {
                hooks.onError(ramenError, tracked);
            } else {
                errorHandler.handle(ramenError);
            }
        }
    }
    
    /**
     * Default cleanup for known resource types
     */
    private async defaultCleanup(tracked: TrackedResource): Promise<void> {
        const resource = tracked.resource;
        
        switch (tracked.metadata.type) {
            case ResourceType.DISPOSABLE:
                if (resource && typeof resource.dispose === 'function') {
                    resource.dispose();
                }
                break;
                
            case ResourceType.TIMER:
                clearTimeout(resource);
                clearInterval(resource);
                break;
                
            case ResourceType.WEBSOCKET:
                if (resource && resource.readyState === 1) { // OPEN
                    resource.close();
                }
                break;
                
            case ResourceType.OUTPUT_CHANNEL:
                if (resource && typeof resource.dispose === 'function') {
                    resource.dispose();
                }
                break;
                
            case ResourceType.TERMINAL:
                if (resource && typeof resource.dispose === 'function') {
                    resource.dispose();
                }
                break;
        }
    }
    
    /**
     * Dispose all resources
     */
    async disposeAll(): Promise<void> {
        if (this.disposed) {
            return;
        }
        
        this.log('Disposing all resources...');
        const startTime = Date.now();
        
        // Stop memory monitoring
        if (this.memoryMonitorTimer) {
            clearInterval(this.memoryMonitorTimer);
        }
        
        // Group resources by type for ordered disposal
        const disposalOrder = [
            ResourceType.WEBSOCKET,
            ResourceType.PROCESS,
            ResourceType.TIMER,
            ResourceType.FILE_WATCHER,
            ResourceType.EVENT_LISTENER,
            ResourceType.TERMINAL,
            ResourceType.STATUS_BAR,
            ResourceType.OUTPUT_CHANNEL,
            ResourceType.DISPOSABLE,
            ResourceType.CUSTOM
        ];
        
        for (const type of disposalOrder) {
            const resourceIds = this.resourcesByType.get(type);
            if (resourceIds) {
                for (const id of resourceIds) {
                    const resource = this.resources.get(id);
                    if (resource) {
                        await this.disposeResource(resource);
                    }
                }
            }
        }
        
        // Clear all tracking
        this.resources.clear();
        this.resourcesByType.clear();
        this.childResources.clear();
        
        const elapsed = Date.now() - startTime;
        this.log(`All resources disposed in ${elapsed}ms`);
        
        this.disposed = true;
    }
    
    /**
     * Get resource by ID
     */
    getResource<T = any>(id: string): T | undefined {
        return this.resources.get(id)?.resource;
    }
    
    /**
     * Get all resources of a type
     */
    getResourcesByType(type: ResourceType): TrackedResource[] {
        const ids = this.resourcesByType.get(type);
        if (!ids) {
            return [];
        }
        
        return Array.from(ids)
            .map(id => this.resources.get(id))
            .filter(Boolean) as TrackedResource[];
    }
    
    /**
     * Register lifecycle hooks for a resource type
     */
    registerLifecycleHooks(type: ResourceType, hooks: ResourceLifecycleHooks): void {
        this.lifecycleHooks.set(type, hooks);
    }
    
    /**
     * Check for potential resource leaks
     */
    private checkResourceLeaks(type: ResourceType): void {
        const count = this.resourcesByType.get(type)?.size || 0;
        
        if (count > this.resourceLeakThreshold) {
            const warning = `Potential resource leak detected: ${count} ${type} resources`;
            this.log(warning, 'warning');
            
            errorHandler.handle(
                new RamenError(
                    warning,
                    ErrorCategory.UNKNOWN,
                    ErrorSeverity.WARNING,
                    { type, count, resources: this.getResourcesByType(type) }
                )
            );
        }
    }
    
    /**
     * Start memory monitoring
     */
    private startMemoryMonitoring(): void {
        // Monitor every 30 seconds
        this.memoryMonitorTimer = setInterval(() => {
            const stats = this.getStatistics();
            
            // Log statistics
            this.log(`Resource stats: ${JSON.stringify(stats)}`);
            
            // Check for leaks
            for (const [type, count] of Object.entries(stats.byType)) {
                if (count > this.resourceLeakThreshold) {
                    this.checkResourceLeaks(type as ResourceType);
                }
            }
            
            // Check for old resources (older than 1 hour)
            const oneHourAgo = Date.now() - 3600000;
            for (const resource of this.resources.values()) {
                if (resource.metadata.createdAt < oneHourAgo) {
                    this.log(
                        `Old resource detected: ${resource.metadata.name} (${resource.metadata.type})`,
                        'warning'
                    );
                }
            }
        }, 30000);
    }
    
    /**
     * Get resource statistics
     */
    getStatistics(): {
        total: number;
        byType: Record<string, number>;
        oldestResource: ResourceMetadata | null;
        memoryUsage: NodeJS.MemoryUsage;
    } {
        const byType: Record<string, number> = {};
        let oldestResource: ResourceMetadata | null = null;
        
        for (const [type, ids] of this.resourcesByType.entries()) {
            byType[type] = ids.size;
        }
        
        for (const resource of this.resources.values()) {
            if (!oldestResource || resource.metadata.createdAt < oldestResource.createdAt) {
                oldestResource = resource.metadata;
            }
        }
        
        return {
            total: this.resources.size,
            byType,
            oldestResource,
            memoryUsage: process.memoryUsage()
        };
    }
    
    /**
     * Setup default lifecycle hooks
     */
    private setupDefaultHooks(): void {
        // Process cleanup hook
        this.registerLifecycleHooks(ResourceType.PROCESS, {
            onBeforeDispose: async (resource) => {
                const process = resource.resource as ChildProcess;
                if (process.pid) {
                    this.log(`Terminating process ${process.pid}`);
                }
            },
            onError: (error, resource) => {
                this.log(`Failed to terminate process: ${error.message}`, 'error');
            }
        });
        
        // WebSocket cleanup hook
        this.registerLifecycleHooks(ResourceType.WEBSOCKET, {
            onBeforeDispose: async (resource) => {
                const ws = resource.resource;
                if (ws && ws.readyState === 1) {
                    this.log(`Closing WebSocket connection`);
                }
            }
        });
    }
    
    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Log message
     */
    private log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        this.outputChannel.appendLine(logMessage);
        
        if (level === 'error') {
            console.error(logMessage);
        } else if (level === 'warning') {
            console.warn(logMessage);
        }
    }
    
    /**
     * Export resource report
     */
    async exportReport(): Promise<void> {
        const stats = this.getStatistics();
        const resources = Array.from(this.resources.values()).map(r => ({
            ...r.metadata,
            age: Date.now() - r.metadata.createdAt
        }));
        
        const report = {
            timestamp: new Date().toISOString(),
            statistics: stats,
            resources: resources
        };
        
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('ramen-resources.json'),
            filters: {
                'JSON': ['json']
            }
        });
        
        if (uri) {
            await vscode.workspace.fs.writeFile(
                uri,
                Buffer.from(JSON.stringify(report, null, 2))
            );
            vscode.window.showInformationMessage('Resource report exported successfully');
        }
    }
}

// Export singleton instance
export const resourceManager = ResourceManager.getInstance();
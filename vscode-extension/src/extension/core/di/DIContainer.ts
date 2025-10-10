/**
 * 依賴注入容器
 * 管理所有服務的生命週期和依賴關係
 */

import * as vscode from 'vscode';

// 服務識別符號類型
export type ServiceIdentifier<T = any> = symbol | string | { new (...args: any[]): T };

// 服務工廠函數
export type ServiceFactory<T> = (container: DIContainer) => T;

// 服務生命週期
export enum ServiceLifetime {
    /** 每次請求都建立新實例 */
    TRANSIENT = 'transient',
    /** 整個容器生命週期內只有一個實例 */
    SINGLETON = 'singleton',
    /** 每個 scope 內只有一個實例 */
    SCOPED = 'scoped',
}

// 服務註冊資訊
interface ServiceRegistration<T> {
    identifier: ServiceIdentifier<T>;
    factory: ServiceFactory<T>;
    lifetime: ServiceLifetime;
    instance?: T;
}

/**
 * 簡單的依賴注入容器實作
 */
export class DIContainer {
    private services = new Map<ServiceIdentifier, ServiceRegistration<any>>();
    private parent?: DIContainer;
    private isDisposed = false;

    constructor(
        private context: vscode.ExtensionContext,
        parent?: DIContainer
    ) {
        this.parent = parent;

        // 註冊容器本身和 context
        this.registerInstance(DIContainer, this);
        this.registerInstance('ExtensionContext', context);
    }

    /**
     * 註冊暫態服務（每次都建立新實例）
     */
    registerTransient<T>(identifier: ServiceIdentifier<T>, factory: ServiceFactory<T>): this {
        this.register(identifier, factory, ServiceLifetime.TRANSIENT);
        return this;
    }

    /**
     * 註冊單例服務（整個容器生命週期內只有一個實例）
     */
    registerSingleton<T>(identifier: ServiceIdentifier<T>, factory: ServiceFactory<T>): this {
        this.register(identifier, factory, ServiceLifetime.SINGLETON);
        return this;
    }

    /**
     * 註冊延遲載入的單例服務（直到首次使用時才建立）
     * 與 registerSingleton 相同，但語義更明確
     *
     * 注意：DIContainer 的 Singleton 本身就是延遲初始化的，
     * 這個方法主要是為了語義清晰，明確標示哪些服務是延遲載入
     */
    registerLazy<T>(identifier: ServiceIdentifier<T>, factory: ServiceFactory<T>): this {
        this.register(identifier, factory, ServiceLifetime.SINGLETON);
        return this;
    }

    /**
     * 註冊已存在的實例
     */
    registerInstance<T>(identifier: ServiceIdentifier<T>, instance: T): this {
        this.services.set(identifier, {
            identifier,
            factory: () => instance,
            lifetime: ServiceLifetime.SINGLETON,
            instance,
        });
        return this;
    }

    /**
     * 解析服務實例
     */
    resolve<T>(identifier: ServiceIdentifier<T>): T {
        this.checkDisposed();

        const registration = this.getRegistration(identifier);

        if (!registration) {
            throw new Error(`Service not registered: ${String(identifier)}`);
        }

        // 根據生命週期返回實例
        switch (registration.lifetime) {
            case ServiceLifetime.SINGLETON:
                if (!registration.instance) {
                    registration.instance = registration.factory(this);
                }
                return registration.instance;

            case ServiceLifetime.TRANSIENT:
                return registration.factory(this);

            case ServiceLifetime.SCOPED:
                // Scoped 目前與 Singleton 相同
                // 未來可以擴展為支援真正的 scope
                if (!registration.instance) {
                    registration.instance = registration.factory(this);
                }
                return registration.instance;

            default:
                throw new Error(`Unknown lifetime: ${registration.lifetime}`);
        }
    }

    /**
     * 嘗試解析服務，如果不存在則返回 undefined
     */
    tryResolve<T>(identifier: ServiceIdentifier<T>): T | undefined {
        try {
            return this.resolve(identifier);
        } catch {
            return undefined;
        }
    }

    /**
     * 檢查服務是否已註冊
     */
    isRegistered<T>(identifier: ServiceIdentifier<T>): boolean {
        return this.services.has(identifier) || (this.parent?.isRegistered(identifier) ?? false);
    }

    /**
     * 建立子容器（用於 scope）
     */
    createChildContainer(): DIContainer {
        return new DIContainer(this.context, this);
    }

    /**
     * 清理資源
     */
    dispose(): void {
        if (this.isDisposed) {
            return;
        }

        // 清理所有單例實例
        for (const registration of this.services.values()) {
            if (registration.instance && typeof registration.instance.dispose === 'function') {
                try {
                    registration.instance.dispose();
                } catch (error) {
                    console.error('Error disposing service:', error);
                }
            }
        }

        this.services.clear();
        this.isDisposed = true;
    }

    /**
     * 獲取 VSCode Extension Context
     */
    getContext(): vscode.ExtensionContext {
        return this.context;
    }

    // Private methods

    private register<T>(
        identifier: ServiceIdentifier<T>,
        factory: ServiceFactory<T>,
        lifetime: ServiceLifetime
    ): void {
        this.checkDisposed();

        if (this.services.has(identifier)) {
            throw new Error(`Service already registered: ${String(identifier)}`);
        }

        this.services.set(identifier, {
            identifier,
            factory,
            lifetime,
        });
    }

    private getRegistration<T>(
        identifier: ServiceIdentifier<T>
    ): ServiceRegistration<T> | undefined {
        const registration = this.services.get(identifier);
        if (registration) {
            return registration;
        }

        // 嘗試從父容器獲取
        if (this.parent) {
            return this.parent.getRegistration(identifier);
        }

        return undefined;
    }

    private checkDisposed(): void {
        if (this.isDisposed) {
            throw new Error('Container has been disposed');
        }
    }
}

/**
 * 服務識別符號定義（使用 Symbol 避免命名衝突）
 */
export const ServiceIdentifiers = {
    // Core Services
    StateManager: Symbol.for('StateManager'),
    ErrorHandler: Symbol.for('ErrorHandler'),

    // Infrastructure Services
    ServerService: Symbol.for('ServerService'),
    ProcessManager: Symbol.for('ProcessManager'),
    HealthChecker: Symbol.for('HealthChecker'),
    PortManager: Symbol.for('PortManager'),

    WebSocketService: Symbol.for('WebSocketService'),
    GlobalWebSocketManager: Symbol.for('GlobalWebSocketManager'),
    SessionService: Symbol.for('SessionService'),

    // UI Services
    WebviewService: Symbol.for('WebviewService'),
    WebviewContentBuilder: Symbol.for('WebviewContentBuilder'),
    WebviewMessageHandler: Symbol.for('WebviewMessageHandler'),

    // Providers
    CustomEditorProvider: Symbol.for('CustomEditorProvider'),
    VariablesProvider: Symbol.for('VariablesProvider'),
    ServerProvider: Symbol.for('ServerProvider'),
    DependenciesProvider: Symbol.for('DependenciesProvider'),
    ProjectExplorer: Symbol.for('ProjectExplorer'),

    // File System
    FileSystemProvider: Symbol.for('FileSystemProvider'),
    FileWatcher: Symbol.for('FileWatcher'),

    // Language Server
    LanguageServer: Symbol.for('LanguageServer'),

    // Commands
    CommandRegistry: Symbol.for('CommandRegistry'),

    // Application
    Application: Symbol.for('Application'),
};

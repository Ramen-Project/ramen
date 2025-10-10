/**
 * 服務註冊表
 * 集中管理所有服務的註冊和配置
 */

import * as vscode from 'vscode';
import { DIContainer, ServiceIdentifiers } from './DIContainer';
import { StateManager } from '../stateManager';
import { ErrorHandler } from '../errorHandler';
import { RamenServerManager } from '../../server/serverManager';
import { RamenWebviewManager } from '../../webview/webviewManager';
import { RamenVariablesProvider } from '../../providers/variablesProvider';
import { RamenServerProvider } from '../../providers/serverProvider';
import { RamenDependenciesProvider } from '../../providers/dependenciesProvider';
import { RamenLanguageServer } from '../../language/languageServer';
import { RamenFileSystemProvider } from '../../filesystem/fileSystemProvider';
import { RamenFileWatcher } from '../../filesystem/fileWatcher';
import { CommandRegistry } from '../../commands/commandRegistry';
import { GlobalWebSocketManager } from '../../api/GlobalWebSocketManager';
import { SessionManager } from '../../session/sessionManager';
import { RamenProjectExplorer } from '../../views/projectExplorer';

/**
 * 註冊所有核心服務
 */
export function registerCoreServices(container: DIContainer): void {
    const context = container.getContext();

    // ===== State Management =====
    container.registerSingleton(ServiceIdentifiers.StateManager, () =>
        StateManager.getInstance(context)
    );

    // ===== Error Handler =====
    container.registerSingleton(ServiceIdentifiers.ErrorHandler, () => {
        const errorHandler = ErrorHandler.getInstance();
        errorHandler.setContainer(container);
        return errorHandler;
    });

    // ===== Infrastructure Services =====

    // Global WebSocket Manager - 全域 WebSocket 連接管理（需先註冊，供其他服務使用）
    container.registerSingleton(
        ServiceIdentifiers.GlobalWebSocketManager,
        () => new GlobalWebSocketManager()
    );

    // Server Manager - 管理 Python 後端伺服器（注入 GlobalWebSocketManager）
    container.registerSingleton(ServiceIdentifiers.ServerService, (c) => {
        const wsManager = c.resolve<GlobalWebSocketManager>(
            ServiceIdentifiers.GlobalWebSocketManager
        );
        return new RamenServerManager(context, wsManager);
    });

    // WebSocket Manager - 全域 WebSocket 連接（原有，保留向後相容）
    container.registerSingleton(ServiceIdentifiers.WebSocketService, (c) => {
        console.warn(
            '🍜 [DEPRECATED] WebSocketService is deprecated. Use GlobalWebSocketManager instead.'
        );
        // 返回同一個 GlobalWebSocketManager 實例以確保一致性
        return c.resolve<GlobalWebSocketManager>(ServiceIdentifiers.GlobalWebSocketManager);
    });

    // Session Manager - 管理編輯 Session 和 Lock
    container.registerSingleton(
        ServiceIdentifiers.SessionService,
        () => new SessionManager(context)
    );

    // ===== UI Services =====

    // Webview Manager - 管理 Webview 生命週期
    container.registerSingleton(ServiceIdentifiers.WebviewService, (c) => {
        const serverManager = c.resolve<RamenServerManager>(ServiceIdentifiers.ServerService);
        const wsManager = c.resolve<GlobalWebSocketManager>(
            ServiceIdentifiers.GlobalWebSocketManager
        );
        const stateManager = c.resolve<StateManager>(ServiceIdentifiers.StateManager);
        return new RamenWebviewManager(context, serverManager, wsManager, stateManager);
    });
}

/**
 * 註冊 Provider 服務（使用延遲載入）
 *
 * 注意：這些 Provider 只在 VSCode UI 需要時才會被建立
 */
export function registerProviders(container: DIContainer): void {
    const context = container.getContext();

    // ===== TreeView Providers（延遲載入） =====
    // 這些服務只在首次被 resolve 時才會建立，減少啟動時間

    // Variables Provider
    container.registerLazy(
        ServiceIdentifiers.VariablesProvider,
        () => {
            console.log('🍜 [DI] Creating VariablesProvider (lazy)');
            return new RamenVariablesProvider(context);
        }
    );

    // Server Provider
    container.registerLazy(ServiceIdentifiers.ServerProvider, (c) => {
        console.log('🍜 [DI] Creating ServerProvider (lazy)');
        const serverManager = c.resolve<RamenServerManager>(ServiceIdentifiers.ServerService);
        return new RamenServerProvider(context, serverManager);
    });

    // Dependencies Provider
    container.registerLazy(
        ServiceIdentifiers.DependenciesProvider,
        () => {
            console.log('🍜 [DI] Creating DependenciesProvider (lazy)');
            return new RamenDependenciesProvider(context);
        }
    );

    // Project Explorer
    container.registerLazy(
        ServiceIdentifiers.ProjectExplorer,
        () => {
            console.log('🍜 [DI] Creating ProjectExplorer (lazy)');
            return new RamenProjectExplorer(context);
        }
    );

    // ===== File System Services（延遲載入） =====

    // File System Provider
    container.registerLazy(
        ServiceIdentifiers.FileSystemProvider,
        () => {
            console.log('🍜 [DI] Creating FileSystemProvider (lazy)');
            return new RamenFileSystemProvider(context);
        }
    );

    // File Watcher
    container.registerLazy(ServiceIdentifiers.FileWatcher, (c) => {
        console.log('🍜 [DI] Creating FileWatcher (lazy)');
        const webviewManager = c.resolve<RamenWebviewManager>(ServiceIdentifiers.WebviewService);
        return new RamenFileWatcher(context, webviewManager);
    });

    // ===== Language Server（延遲載入） =====

    // Language Server (條件性啟動，只在實際需要時建立)
    container.registerLazy(
        ServiceIdentifiers.LanguageServer,
        () => {
            console.log('🍜 [DI] Creating LanguageServer (lazy)');
            return new RamenLanguageServer(context);
        }
    );
}

/**
 * 註冊命令服務
 */
export function registerCommands(container: DIContainer): void {
    const context = container.getContext();

    // Command Registry
    container.registerSingleton(ServiceIdentifiers.CommandRegistry, (c) => {
        const stateManager = c.resolve<StateManager>(ServiceIdentifiers.StateManager);
        const errorHandler = c.resolve<ErrorHandler>(ServiceIdentifiers.ErrorHandler);
        return new CommandRegistry(context, stateManager, errorHandler, c);
    });
}

/**
 * 完整的服務註冊流程
 */
export function registerAllServices(container: DIContainer): void {
    console.log('🍜 [DI] Registering all services...');

    // 1. 核心服務
    registerCoreServices(container);
    console.log('🍜 [DI] Core services registered');

    // 2. Providers
    registerProviders(container);
    console.log('🍜 [DI] Providers registered');

    // 3. Commands
    registerCommands(container);
    console.log('🍜 [DI] Commands registered');

    console.log('🍜 [DI] All services registered successfully');
}

/**
 * 清理所有服務
 */
export function disposeAllServices(container: DIContainer): void {
    console.log('🍜 [DI] Disposing all services...');
    container.dispose();
    console.log('🍜 [DI] All services disposed');
}

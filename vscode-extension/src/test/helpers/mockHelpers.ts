/**
 * 測試用的 Mock 輔助工具
 * 提供建立 Mock 服務、Context 和 DI Container 的工具函數
 */

import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { DIContainer, ServiceIdentifiers } from '../../extension/core/di/DIContainer';
import { StateManager } from '../../extension/core/stateManager';
import { ErrorHandler } from '../../extension/core/errorHandler';
import { RamenServerManager } from '../../extension/server/serverManager';
import { RamenWebviewManager } from '../../extension/webview/webviewManager';

/**
 * 建立 Mock ExtensionContext
 */
export function createMockExtensionContext(): vscode.ExtensionContext {
    return {
        subscriptions: [],
        workspaceState: {
            get: sinon.stub().returns(undefined),
            update: sinon.stub().resolves(),
            keys: sinon.stub().returns([]),
        },
        globalState: {
            get: sinon.stub().returns(undefined),
            update: sinon.stub().resolves(),
            keys: sinon.stub().returns([]),
            setKeysForSync: sinon.stub(),
        },
        secrets: {
            get: sinon.stub().resolves(undefined),
            store: sinon.stub().resolves(),
            delete: sinon.stub().resolves(),
        } as any,
        extensionUri: vscode.Uri.file('/mock/extension/path'),
        extensionPath: '/mock/extension/path',
        asAbsolutePath: (relativePath: string) => `/mock/extension/path/${relativePath}`,
        storagePath: '/mock/storage',
        globalStoragePath: '/mock/global-storage',
        logPath: '/mock/logs',
        extensionMode: vscode.ExtensionMode.Test,
        extension: {} as any,
        environmentVariableCollection: {} as any,
        storageUri: vscode.Uri.file('/mock/storage'),
        globalStorageUri: vscode.Uri.file('/mock/global-storage'),
        logUri: vscode.Uri.file('/mock/logs'),
        languageModelAccessInformation: {} as any,
    } as vscode.ExtensionContext;
}

/**
 * 建立測試用的 DI Container
 */
export function createTestDIContainer(context?: vscode.ExtensionContext): DIContainer {
    const mockContext = context || createMockExtensionContext();
    return new DIContainer(mockContext);
}

/**
 * 建立 Mock StateManager
 */
export function createMockStateManager(context?: vscode.ExtensionContext): StateManager {
    const mockContext = context || createMockExtensionContext();
    return StateManager.getInstance(mockContext);
}

/**
 * 建立 Mock ServerManager
 */
export function createMockServerManager(
    context?: vscode.ExtensionContext
): sinon.SinonStubbedInstance<RamenServerManager> {
    const mockContext = context || createMockExtensionContext();
    const mock = sinon.createStubInstance(RamenServerManager);

    // 設置常見的預設行為
    mock.isRunning.returns(false);
    mock.getPort.returns(8000);
    mock.start.resolves(true);
    mock.stop.resolves();
    mock.restart.resolves();
    mock.ensureServerRunning.resolves(true);

    return mock as any;
}

/**
 * 建立 Mock WebviewManager
 */
export function createMockWebviewManager(): sinon.SinonStubbedInstance<RamenWebviewManager> {
    const mock = sinon.createStubInstance(RamenWebviewManager);

    // 設置常見的預設行為
    mock.openGraph.resolves();
    mock.setupCustomEditor.resolves();
    mock.disposeAll.returns();

    return mock as any;
}

/**
 * 建立 Mock ErrorHandler
 */
export function createMockErrorHandler(): ErrorHandler {
    return ErrorHandler.getInstance();
}

/**
 * 註冊測試用的服務到 DI Container
 */
export function registerMockServices(
    container: DIContainer,
    options: {
        serverManager?: RamenServerManager;
        webviewManager?: RamenWebviewManager;
        stateManager?: StateManager;
        errorHandler?: ErrorHandler;
    } = {}
): void {
    const context = container.getContext();

    // 註冊 StateManager
    if (options.stateManager) {
        container.registerInstance(ServiceIdentifiers.StateManager, options.stateManager);
    } else {
        container.registerSingleton(ServiceIdentifiers.StateManager, () =>
            StateManager.getInstance(context)
        );
    }

    // 註冊 ErrorHandler
    if (options.errorHandler) {
        container.registerInstance(ServiceIdentifiers.ErrorHandler, options.errorHandler);
    } else {
        container.registerSingleton(ServiceIdentifiers.ErrorHandler, () => {
            const errorHandler = ErrorHandler.getInstance();
            errorHandler.setContainer(container);
            return errorHandler;
        });
    }

    // 註冊 ServerManager
    if (options.serverManager) {
        container.registerInstance(ServiceIdentifiers.ServerService, options.serverManager);
    }

    // 註冊 WebviewManager
    if (options.webviewManager) {
        container.registerInstance(ServiceIdentifiers.WebviewService, options.webviewManager);
    }
}

/**
 * 清理測試資源
 */
export function cleanupTestResources(): void {
    sinon.restore();
}

/**
 * 建立完整配置的測試 DI Container
 */
export function createFullyConfiguredTestContainer(context?: vscode.ExtensionContext): DIContainer {
    const container = createTestDIContainer(context);

    registerMockServices(container, {
        serverManager: createMockServerManager(context) as any,
        webviewManager: createMockWebviewManager() as any,
    });

    return container;
}

/**
 * 服務介面定義
 * 定義所有服務的契約，方便測試和替換實作
 */

import * as vscode from 'vscode';

/**
 * 可清理的服務
 */
export interface IDisposable {
    dispose(): void;
}

/**
 * 狀態管理服務介面
 */
export interface IStateManager extends IDisposable {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    delete(key: string): void;
    has(key: string): boolean;
    clear(): void;
}

/**
 * 伺服器管理服務介面
 */
export interface IServerManager extends IDisposable {
    start(): Promise<boolean>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    isRunning(): boolean;
    getServerUrl(): string | null;
    getServerPort(): number | null;
}

/**
 * WebSocket 管理服務介面
 */
export interface IWebSocketManager {
    connect(serverUrl: string): Promise<any>;
    disconnect(): void;
    isConnected(): boolean;
    sendRequest<T = any>(type: string, data?: any, timeout?: number): Promise<T>;
}

/**
 * Webview 管理服務介面
 */
export interface IWebviewManager extends IDisposable {
    createWebview(uri: vscode.Uri): Promise<vscode.WebviewPanel>;
    getActiveWebview(): vscode.WebviewPanel | undefined;
    closeAllWebviews(): void;
}

/**
 * 命令註冊服務介面
 */
export interface ICommandRegistry extends IDisposable {
    register(command: string, handler: (...args: any[]) => any): void;
    unregister(command: string): void;
    execute(command: string, ...args: any[]): Promise<any>;
}

/**
 * 錯誤處理服務介面
 */
export interface IErrorHandler {
    handleError(error: Error, context?: string): void;
    showErrorMessage(message: string, ...actions: string[]): Promise<string | undefined>;
    logError(error: Error, context?: string): void;
}

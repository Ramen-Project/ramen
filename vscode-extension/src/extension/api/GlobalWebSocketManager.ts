/**
 * 全域 WebSocket 管理器 (DI-friendly)
 * 整個 Extension 共用一個 WebSocket 連接
 *
 * 從 Singleton 模式遷移到 DI 架構
 * 現在透過 DIContainer 管理生命週期
 */

import * as vscode from 'vscode';
import { NodeWebSocketClient, createWebSocketClient, MessageType } from './WebSocketClient';

/**
 * 全域 WebSocket 管理器
 *
 * 負責管理 Extension 與 Backend 之間的 WebSocket 連接
 * - 單一連接複用
 * - 自動重連機制
 * - Promise-based API
 */
export class GlobalWebSocketManager implements vscode.Disposable {
    private wsClient: NodeWebSocketClient | null = null;
    private serverUrl: string | null = null;
    private connectionPromise: Promise<NodeWebSocketClient> | null = null;

    constructor() {
        // DI 友好的建構函數
        console.log('🍜 [GlobalWebSocketManager] Initialized via DI');
    }

    /**
     * 初始化並連接到 WebSocket 伺服器
     */
    async connect(serverUrl: string): Promise<NodeWebSocketClient> {
        // 如果 URL 相同且已經有連接，直接返回
        if (this.serverUrl === serverUrl && this.wsClient?.isConnectedToServer()) {
            return this.wsClient;
        }

        // 如果正在連接中，等待現有的連接完成
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        // 如果 URL 改變，先斷開舊連接
        if (this.wsClient && this.serverUrl !== serverUrl) {
            console.log('🍜 [GlobalWS] Server URL changed, disconnecting old connection');
            this.wsClient.disconnect();
            this.wsClient = null;
        }

        // 建立新連接
        this.serverUrl = serverUrl;

        this.connectionPromise = (async () => {
            try {
                this.wsClient = await createWebSocketClient(serverUrl, 'global-extension-client');
                return this.wsClient;
            } catch (error) {
                // 連接失敗，清理狀態
                this.wsClient = null;
                this.serverUrl = null;
                throw error;
            } finally {
                this.connectionPromise = null;
            }
        })();

        return this.connectionPromise;
    }

    /**
     * 獲取當前的 WebSocket 客戶端
     */
    getClient(): NodeWebSocketClient | null {
        return this.wsClient;
    }

    /**
     * 檢查是否已連接
     */
    isConnected(): boolean {
        return this.wsClient?.isConnectedToServer() ?? false;
    }

    /**
     * 發送 WebSocket 請求
     */
    async sendRequest<T = any>(
        type: string | MessageType,
        data?: any,
        timeout?: number
    ): Promise<T> {
        if (!this.wsClient) {
            throw new Error('WebSocket client not initialized. Call connect() first.');
        }
        return this.wsClient.sendRequest<T>(type, data, timeout);
    }

    /**
     * 斷開連接
     */
    disconnect(): void {
        if (this.wsClient) {
            console.log('🍜 [GlobalWS] Disconnecting global connection');
            this.wsClient.disconnect();
            this.wsClient = null;
            this.serverUrl = null;
        }
    }

    /**
     * 實作 vscode.Disposable 介面
     * 在 Extension deactivate 時自動清理資源
     */
    dispose(): void {
        console.log('🍜 [GlobalWebSocketManager] Disposing...');
        this.disconnect();
    }
}

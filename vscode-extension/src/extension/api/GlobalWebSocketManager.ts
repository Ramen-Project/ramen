/**
 * 全域 WebSocket 管理器（單例模式）
 * 整個 Extension 共用一個 WebSocket 連接
 */

import { NodeWebSocketClient, createWebSocketClient } from './WebSocketClient';

class GlobalWebSocketManager {
  private static instance: GlobalWebSocketManager | null = null;
  private wsClient: NodeWebSocketClient | null = null;
  private serverUrl: string | null = null;
  private connectionPromise: Promise<NodeWebSocketClient> | null = null;

  private constructor() {
    // 私有建構函數，確保單例
  }

  /**
   * 獲取全域管理器實例
   */
  static getInstance(): GlobalWebSocketManager {
    if (!GlobalWebSocketManager.instance) {
      GlobalWebSocketManager.instance = new GlobalWebSocketManager();
    }
    return GlobalWebSocketManager.instance;
  }

  /**
   * 初始化並連接到 WebSocket 伺服器
   */
  async connect(serverUrl: string): Promise<NodeWebSocketClient> {
    // 如果 URL 相同且已經有連接，直接返回
    if (this.serverUrl === serverUrl && this.wsClient?.isConnectedToServer()) {
      console.log('🍜 [GlobalWS] Using existing connection');
      return this.wsClient;
    }

    // 如果正在連接中，等待現有的連接完成
    if (this.connectionPromise) {
      console.log('🍜 [GlobalWS] Connection in progress, waiting...');
      return this.connectionPromise;
    }

    // 如果 URL 改變，先斷開舊連接
    if (this.wsClient && this.serverUrl !== serverUrl) {
      console.log('🍜 [GlobalWS] Server URL changed, disconnecting old connection');
      this.wsClient.disconnect();
      this.wsClient = null;
    }

    // 建立新連接
    console.log(`🍜 [GlobalWS] Creating new connection to ${serverUrl}`);
    this.serverUrl = serverUrl;

    this.connectionPromise = createWebSocketClient(serverUrl, 'global-extension-client');

    try {
      this.wsClient = await this.connectionPromise;
      console.log('🍜 [GlobalWS] Connection established successfully');
      return this.wsClient;
    } finally {
      this.connectionPromise = null;
    }
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
   * 重置管理器（用於測試或重啟）
   */
  static reset(): void {
    if (GlobalWebSocketManager.instance) {
      GlobalWebSocketManager.instance.disconnect();
      GlobalWebSocketManager.instance = null;
    }
  }
}

// 導出單例訪問函數
export function getGlobalWebSocketManager(): GlobalWebSocketManager {
  return GlobalWebSocketManager.getInstance();
}

/**
 * 便捷函數：獲取或建立全域 WebSocket 客戶端
 */
export async function getOrCreateGlobalWebSocketClient(serverUrl: string): Promise<NodeWebSocketClient> {
  const manager = getGlobalWebSocketManager();
  return manager.connect(serverUrl);
}

/**
 * 便捷函數：獲取當前的全域 WebSocket 客戶端（如果存在）
 */
export function getGlobalWebSocketClient(): NodeWebSocketClient | null {
  const manager = getGlobalWebSocketManager();
  return manager.getClient();
}
/**
 * Extension Client
 *
 * 統一的 VSCode Extension ↔ Webview 通訊客戶端
 * - 使用共享型別定義 (ExtensionMessageType)
 * - 支援 Request/Response 模式
 * - 自動錯誤處理和超時管理
 * - 與 Extension 的 MessageBus 對應
 */

import { nanoid } from 'nanoid';

/**
 * Extension 訊息類型枚舉（複製自共享型別）
 *
 * 注意：這應該從 ../../shared/types/extension-messages 匯入
 * 但為了避免 webview-build 的構建配置問題，暫時複製定義
 */
export enum ExtensionMessageType {
    // ========== Graph Operations ==========
    SAVE_GRAPH = 'saveGraph',
    EXECUTE_GRAPH = 'executeGraph',
    RELOAD_GRAPH = 'reloadGraph',
    GRAPH_UPDATE = 'graphUpdate',

    // ========== Data Fetching ==========
    FETCH_NODES = 'fetchNodes',
    NODES_RESPONSE = 'nodesResponse',
    FETCH_TYPE_CONVERTERS = 'fetchTypeConverters',
    TYPE_CONVERTERS_RESPONSE = 'typeConvertersResponse',

    // ========== UI Operations ==========
    SHOW_MESSAGE = 'showMessage',
    OPEN_EXTERNAL = 'openExternal',
    UPDATE_THEME = 'updateTheme',
    TOGGLE_DEBUG_MODE = 'toggleDebugMode',

    // ========== State Management ==========
    GET_STATE = 'getState',
    SET_STATE = 'setState',
    STATE_UPDATED = 'stateUpdated',

    // ========== WebSocket Proxy ==========
    WEBSOCKET_REQUEST = 'websocket-request',
    WEBSOCKET_RESPONSE = 'websocket-response',
    WEBSOCKET_ERROR = 'websocket-error',
    WEBSOCKET_CONNECT = 'websocket-connect',
    WEBSOCKET_STATUS = 'websocket-status',

    // ========== File Events ==========
    FILE_CHANGED = 'fileChanged',
    SERVER_RESTARTED = 'serverRestarted',

    // ========== Logging ==========
    LOG = 'log',

    // ========== Error Handling ==========
    ERROR = 'error',
}

/**
 * Extension 訊息結構
 */
export interface ExtensionMessage<T = any> {
    type: ExtensionMessageType | string;
    id?: string;
    data?: T;
    timestamp?: string;
}

/**
 * Extension 回應結構
 */
export interface ExtensionResponse<T = any> {
    type: ExtensionMessageType | string;
    id?: string;
    success: boolean;
    data?: T;
    error?: string;
    timestamp?: string;
}

/**
 * 訊息 Handler 類型
 */
export type MessageHandler<T = any> = (data?: T) => void;

/**
 * Pending Request 資訊
 */
interface PendingRequest {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timer: number;
    type: ExtensionMessageType | string;
}

/**
 * VSCode API 介面
 */
interface VSCodeAPI {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
}

/**
 * Extension Client
 *
 * 提供統一的 Extension 通訊 API
 */
export class ExtensionClient {
    private vscode: VSCodeAPI;
    private handlers = new Map<ExtensionMessageType | string, Set<MessageHandler>>();
    private pendingRequests = new Map<string, PendingRequest>();
    private messageListener?: (event: MessageEvent) => void;

    constructor() {
        // 獲取 VSCode API
        if (typeof window === 'undefined' || !(window as any).vscode) {
            throw new Error('ExtensionClient can only be used in VSCode webview');
        }

        this.vscode = (window as any).vscode;
        this.setupMessageListener();

        console.log('🍜 [ExtensionClient] Initialized');
    }

    /**
     * 設置訊息監聽器
     */
    private setupMessageListener(): void {
        this.messageListener = (event: MessageEvent) => {
            const message = event.data;
            this.handleMessage(message);
        };

        window.addEventListener('message', this.messageListener);
    }

    /**
     * 發送單向訊息到 Extension
     *
     * @param type 訊息類型
     * @param data 訊息資料
     */
    send<T = any>(type: ExtensionMessageType | string, data?: T): void {
        const message: ExtensionMessage<T> = {
            type,
            data,
            timestamp: new Date().toISOString(),
        };

        this.vscode.postMessage(message);
        console.log(`🍜 [ExtensionClient] Sent message: ${type}`);
    }

    /**
     * 發送請求並等待回應
     *
     * @param type 請求類型
     * @param data 請求資料
     * @param timeout 超時時間（毫秒），預設 30 秒
     * @returns Promise<回應資料>
     */
    request<TRequest = any, TResponse = any>(
        type: ExtensionMessageType | string,
        data?: TRequest,
        timeout = 30000
    ): Promise<TResponse> {
        const id = this.generateRequestId();

        const message: ExtensionMessage<TRequest> = {
            type,
            id,
            data,
            timestamp: new Date().toISOString(),
        };

        return new Promise<TResponse>((resolve, reject) => {
            // 設置超時定時器
            const timer = window.setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Request timeout: ${type} (${timeout}ms)`));
            }, timeout);

            // 儲存 pending request
            this.pendingRequests.set(id, {
                resolve,
                reject,
                timer,
                type,
            });

            // 發送訊息
            this.vscode.postMessage(message);
            console.log(`🍜 [ExtensionClient] Sent request: ${type} (id: ${id})`);
        });
    }

    /**
     * 註冊訊息 handler
     *
     * @param type 訊息類型
     * @param handler Handler 函數
     * @returns 取消註冊函數
     */
    on<T = any>(type: ExtensionMessageType | string, handler: MessageHandler<T>): () => void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }

        const handlers = this.handlers.get(type)!;
        handlers.add(handler);

        console.log(`🍜 [ExtensionClient] Registered handler for: ${type}`);

        // 返回取消註冊函數
        return () => {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.handlers.delete(type);
            }
            console.log(`🍜 [ExtensionClient] Unregistered handler for: ${type}`);
        };
    }

    /**
     * 移除指定類型的所有 handlers
     *
     * @param type 訊息類型
     */
    off(type: ExtensionMessageType | string): void {
        if (this.handlers.delete(type)) {
            console.log(`🍜 [ExtensionClient] Removed all handlers for: ${type}`);
        }
    }

    /**
     * 處理來自 Extension 的訊息
     */
    private handleMessage(message: any): void {
        // 檢查是否為有效訊息
        if (!message || typeof message !== 'object') {
            return;
        }

        const { type, id, success, data, error } = message;

        console.log(`🍜 [ExtensionClient] Received message: ${type}`, id ? `(id: ${id})` : '');

        // 檢查是否為 response（回應之前的 request）
        if (id && typeof success === 'boolean') {
            this.handleResponse(message as ExtensionResponse);
            return;
        }

        // 觸發對應的 handlers
        const handlers = this.handlers.get(type);
        if (handlers && handlers.size > 0) {
            handlers.forEach((handler) => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`🍜 [ExtensionClient] Handler error for ${type}:`, error);
                }
            });
        } else {
            console.log(`🍜 [ExtensionClient] No handlers registered for: ${type}`);
        }
    }

    /**
     * 處理 response（回應之前的 request）
     */
    private handleResponse(response: ExtensionResponse): void {
        const { id, success, data, error } = response;

        if (!id) {
            console.warn('🍜 [ExtensionClient] Received response without id');
            return;
        }

        const pending = this.pendingRequests.get(id);
        if (!pending) {
            console.warn(`🍜 [ExtensionClient] No pending request for id: ${id}`);
            return;
        }

        // 清理
        clearTimeout(pending.timer);
        this.pendingRequests.delete(id);

        // 處理結果
        if (success) {
            console.log(`🍜 [ExtensionClient] Request succeeded: ${pending.type} (id: ${id})`);
            pending.resolve(data);
        } else {
            console.error(`🍜 [ExtensionClient] Request failed: ${pending.type} (id: ${id})`, error);
            pending.reject(new Error(error || 'Request failed'));
        }
    }

    /**
     * 生成唯一的 request ID
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${nanoid(8)}`;
    }

    /**
     * 清理資源
     */
    dispose(): void {
        // 清理所有 pending requests
        this.pendingRequests.forEach((pending, id) => {
            clearTimeout(pending.timer);
            pending.reject(new Error('ExtensionClient disposed'));
        });
        this.pendingRequests.clear();

        // 清理 handlers
        this.handlers.clear();

        // 清理訊息監聽器
        if (this.messageListener) {
            window.removeEventListener('message', this.messageListener);
            this.messageListener = undefined;
        }

        console.log('🍜 [ExtensionClient] Disposed');
    }

    /**
     * 獲取統計資訊
     */
    getStats(): {
        handlerCount: number;
        pendingRequestCount: number;
        handlers: string[];
    } {
        return {
            handlerCount: this.handlers.size,
            pendingRequestCount: this.pendingRequests.size,
            handlers: Array.from(this.handlers.keys()).map(String),
        };
    }
}

// ========== 全域實例 ==========

let globalExtensionClient: ExtensionClient | null = null;

/**
 * 獲取全域 ExtensionClient 實例
 *
 * @returns ExtensionClient 實例
 */
export function getExtensionClient(): ExtensionClient {
    if (!globalExtensionClient) {
        globalExtensionClient = new ExtensionClient();
    }
    return globalExtensionClient;
}

/**
 * 初始化 ExtensionClient（可選，會在第一次 getExtensionClient 時自動初始化）
 */
export function initializeExtensionClient(): ExtensionClient {
    if (globalExtensionClient) {
        console.warn('🍜 [ExtensionClient] Already initialized');
        return globalExtensionClient;
    }

    globalExtensionClient = new ExtensionClient();
    return globalExtensionClient;
}

/**
 * 清理全域 ExtensionClient
 */
export function disposeExtensionClient(): void {
    if (globalExtensionClient) {
        globalExtensionClient.dispose();
        globalExtensionClient = null;
    }
}

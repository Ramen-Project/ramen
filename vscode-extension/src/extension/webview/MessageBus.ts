/**
 * Webview Message Bus
 *
 * 提供統一的 Extension ↔ Webview 訊息收發管理
 * - 統一訊息格式
 * - Request/Response 模式
 * - 自動錯誤處理
 * - Handler 模組化管理
 */

import * as vscode from 'vscode';
import {
    ExtensionMessage,
    ExtensionResponse,
    ExtensionMessageType,
    MessageHandler,
    createExtensionMessage,
    createSuccessResponse,
    createErrorResponse,
    isExtensionResponse,
} from '../../shared/types/extension-messages';

/**
 * Pending Request 資訊
 */
interface PendingRequest {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
    type: ExtensionMessageType | string;
}

/**
 * Webview Message Bus
 *
 * 負責管理 Extension 與 Webview 之間的訊息通訊
 */
export class WebviewMessageBus {
    private handlers = new Map<ExtensionMessageType | string, MessageHandler>();
    private pendingRequests = new Map<string, PendingRequest>();
    private messageListener?: vscode.Disposable;
    private isDisposed = false;

    constructor(private panel: vscode.WebviewPanel) {
        this.setupMessageListener();
        console.log('🍜 [MessageBus] Initialized for panel:', panel.title);
    }

    /**
     * 設置訊息監聽器
     */
    private setupMessageListener(): void {
        this.messageListener = this.panel.webview.onDidReceiveMessage(
            async (message: ExtensionMessage) => {
                await this.handleMessage(message);
            }
        );
    }

    /**
     * 發送訊息到 Webview
     *
     * @param type 訊息類型
     * @param data 訊息資料
     * @param id 可選的訊息 ID（用於 response）
     */
    async send<T>(
        type: ExtensionMessageType | string,
        data?: T,
        id?: string
    ): Promise<void> {
        this.checkDisposed();

        const message = createExtensionMessage(type as ExtensionMessageType, data, id);

        try {
            await this.panel.webview.postMessage(message);
            console.log(`🍜 [MessageBus] Sent message: ${type}`, id ? `(id: ${id})` : '');
        } catch (error) {
            console.error(`🍜 [MessageBus] Failed to send message: ${type}`, error);
            throw error;
        }
    }

    /**
     * 發送成功回應到 Webview
     *
     * @param type 回應類型
     * @param data 回應資料
     * @param id 請求 ID
     */
    async sendSuccess<T>(
        type: ExtensionMessageType | string,
        data?: T,
        id?: string
    ): Promise<void> {
        const response = createSuccessResponse(type as ExtensionMessageType, data, id);
        await this.panel.webview.postMessage(response);
        console.log(`🍜 [MessageBus] Sent success response: ${type}`, id ? `(id: ${id})` : '');
    }

    /**
     * 發送錯誤回應到 Webview
     *
     * @param type 回應類型
     * @param error 錯誤訊息
     * @param id 請求 ID
     */
    async sendError(
        type: ExtensionMessageType | string,
        error: string,
        id?: string
    ): Promise<void> {
        const response = createErrorResponse(type as ExtensionMessageType, error, id);
        await this.panel.webview.postMessage(response);
        console.error(`🍜 [MessageBus] Sent error response: ${type}`, error);
    }

    /**
     * 發送請求並等待回應
     *
     * @param type 請求類型
     * @param data 請求資料
     * @param timeout 超時時間（毫秒），預設 30 秒
     * @returns Promise<回應資料>
     */
    async request<TRequest = any, TResponse = any>(
        type: ExtensionMessageType | string,
        data?: TRequest,
        timeout = 30000
    ): Promise<TResponse> {
        this.checkDisposed();

        const id = this.generateRequestId();
        const message = createExtensionMessage(type as ExtensionMessageType, data, id);

        return new Promise<TResponse>((resolve, reject) => {
            // 設置超時定時器
            const timer = setTimeout(() => {
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
            Promise.resolve(this.panel.webview.postMessage(message))
                .then(() => {
                    console.log(`🍜 [MessageBus] Sent request: ${type} (id: ${id})`);
                })
                .catch((error: any) => {
                    clearTimeout(timer);
                    this.pendingRequests.delete(id);
                    reject(error);
                });
        });
    }

    /**
     * 註冊訊息 handler
     *
     * @param type 訊息類型
     * @param handler Handler 函數
     */
    on<TRequest = any, TResponse = any>(
        type: ExtensionMessageType | string,
        handler: MessageHandler<TRequest, TResponse>
    ): this {
        if (this.handlers.has(type)) {
            console.warn(`🍜 [MessageBus] Handler for ${type} already exists, overwriting`);
        }

        this.handlers.set(type, handler);
        console.log(`🍜 [MessageBus] Registered handler for: ${type}`);
        return this;
    }

    /**
     * 移除訊息 handler
     *
     * @param type 訊息類型
     */
    off(type: ExtensionMessageType | string): this {
        if (this.handlers.delete(type)) {
            console.log(`🍜 [MessageBus] Removed handler for: ${type}`);
        }
        return this;
    }

    /**
     * 檢查是否有指定類型的 handler
     *
     * @param type 訊息類型
     */
    has(type: ExtensionMessageType | string): boolean {
        return this.handlers.has(type);
    }

    /**
     * 處理來自 Webview 的訊息
     */
    private async handleMessage(message: ExtensionMessage): Promise<void> {
        const { type, id, data } = message;

        console.log(`🍜 [MessageBus] Received message: ${type}`, id ? `(id: ${id})` : '');

        // 檢查是否為 response（回應之前的 request）
        if (isExtensionResponse(message)) {
            this.handleResponse(message as ExtensionResponse);
            return;
        }

        // 查找對應的 handler
        const handler = this.handlers.get(type);
        if (!handler) {
            console.warn(`🍜 [MessageBus] No handler registered for: ${type}`);

            // 如果有 id，回傳錯誤
            if (id) {
                await this.sendError(type, `No handler registered for message type: ${type}`, id);
            }
            return;
        }

        // 執行 handler
        try {
            const result = await handler(data);

            // 如果有 id，回傳成功結果
            if (id) {
                await this.sendSuccess(type, result, id);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`🍜 [MessageBus] Handler error for ${type}:`, errorMessage);

            // 如果有 id，回傳錯誤
            if (id) {
                await this.sendError(type, errorMessage, id);
            }
        }
    }

    /**
     * 處理 response（回應之前的 request）
     */
    private handleResponse(response: ExtensionResponse): void {
        const { id, success, data, error } = response;

        if (!id) {
            console.warn('🍜 [MessageBus] Received response without id');
            return;
        }

        const pending = this.pendingRequests.get(id);
        if (!pending) {
            console.warn(`🍜 [MessageBus] No pending request for id: ${id}`);
            return;
        }

        // 清理
        clearTimeout(pending.timer);
        this.pendingRequests.delete(id);

        // 處理結果
        if (success) {
            console.log(`🍜 [MessageBus] Request succeeded: ${pending.type} (id: ${id})`);
            pending.resolve(data);
        } else {
            console.error(`🍜 [MessageBus] Request failed: ${pending.type} (id: ${id})`, error);
            pending.reject(new Error(error || 'Request failed'));
        }
    }

    /**
     * 生成唯一的 request ID
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * 檢查是否已 dispose
     */
    private checkDisposed(): void {
        if (this.isDisposed) {
            throw new Error('MessageBus has been disposed');
        }
    }

    /**
     * 清理資源
     */
    dispose(): void {
        if (this.isDisposed) {
            return;
        }

        console.log('🍜 [MessageBus] Disposing...');

        // 清理所有 pending requests
        this.pendingRequests.forEach((pending, id) => {
            clearTimeout(pending.timer);
            pending.reject(new Error('MessageBus disposed'));
        });
        this.pendingRequests.clear();

        // 清理 handlers
        this.handlers.clear();

        // 清理訊息監聽器
        if (this.messageListener) {
            this.messageListener.dispose();
            this.messageListener = undefined;
        }

        this.isDisposed = true;
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

/**
 * 建立 MessageBus 實例的便捷函數
 */
export function createMessageBus(panel: vscode.WebviewPanel): WebviewMessageBus {
    return new WebviewMessageBus(panel);
}

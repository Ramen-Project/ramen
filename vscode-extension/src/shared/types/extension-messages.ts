/**
 * Extension ↔ Webview 訊息協議
 *
 * 此檔案定義 VSCode Extension 與 Webview 之間的訊息通訊協議。
 * 提供型別安全的訊息定義，確保前端和後端的一致性。
 */

import { UUID, Timestamp } from './common';

/**
 * Extension 訊息類型枚舉
 *
 * 定義所有 Extension ↔ Webview 之間的訊息類型
 */
export enum ExtensionMessageType {
    // ========== Graph Operations ==========
    /** 保存圖形到檔案 */
    SAVE_GRAPH = 'saveGraph',
    /** 執行圖形 */
    EXECUTE_GRAPH = 'executeGraph',
    /** 重新載入圖形 */
    RELOAD_GRAPH = 'reloadGraph',
    /** 圖形更新通知 */
    GRAPH_UPDATE = 'graphUpdate',

    // ========== Data Fetching ==========
    /** 獲取節點列表 */
    FETCH_NODES = 'fetchNodes',
    /** 節點列表回應 */
    NODES_RESPONSE = 'nodesResponse',
    /** 獲取型別轉換器列表 */
    FETCH_TYPE_CONVERTERS = 'fetchTypeConverters',
    /** 型別轉換器回應 */
    TYPE_CONVERTERS_RESPONSE = 'typeConvertersResponse',

    // ========== UI Operations ==========
    /** 顯示訊息 (info/warning/error) */
    SHOW_MESSAGE = 'showMessage',
    /** 打開外部連結 */
    OPEN_EXTERNAL = 'openExternal',
    /** 更新主題 */
    UPDATE_THEME = 'updateTheme',
    /** 切換 Debug 模式 */
    TOGGLE_DEBUG_MODE = 'toggleDebugMode',

    // ========== State Management ==========
    /** 獲取狀態 */
    GET_STATE = 'getState',
    /** 設置狀態 */
    SET_STATE = 'setState',
    /** 狀態已更新通知 */
    STATE_UPDATED = 'stateUpdated',

    // ========== WebSocket Proxy ==========
    /** WebSocket 請求（透過 Extension 代理） */
    WEBSOCKET_REQUEST = 'websocket-request',
    /** WebSocket 回應 */
    WEBSOCKET_RESPONSE = 'websocket-response',
    /** WebSocket 錯誤 */
    WEBSOCKET_ERROR = 'websocket-error',
    /** 建立 WebSocket 連接 */
    WEBSOCKET_CONNECT = 'websocket-connect',
    /** WebSocket 連接狀態 */
    WEBSOCKET_STATUS = 'websocket-status',

    // ========== File Events ==========
    /** 檔案已變更通知 */
    FILE_CHANGED = 'fileChanged',
    /** 伺服器已重啟通知 */
    SERVER_RESTARTED = 'serverRestarted',

    // ========== Logging ==========
    /** 記錄日誌 */
    LOG = 'log',

    // ========== Error Handling ==========
    /** 錯誤訊息 */
    ERROR = 'error',
}

/**
 * Extension 訊息基礎結構
 *
 * 所有從 Extension 發送到 Webview 或從 Webview 發送到 Extension 的訊息都應使用此結構
 */
export interface ExtensionMessage<T = any> {
    /** 訊息類型 */
    type: ExtensionMessageType | string;
    /** 請求 ID，用於 request/response 配對 */
    id?: UUID | string;
    /** 訊息資料 payload */
    data?: T;
    /** 訊息時間戳 */
    timestamp?: Timestamp;
}

/**
 * Extension 回應結構
 *
 * 用於回應 Webview 的請求
 */
export interface ExtensionResponse<T = any> {
    /** 回應類型（通常與請求類型相關） */
    type: ExtensionMessageType | string;
    /** 請求 ID，用於配對原始請求 */
    id?: UUID | string;
    /** 是否成功 */
    success: boolean;
    /** 回應資料 */
    data?: T;
    /** 錯誤訊息（如果 success 為 false） */
    error?: string;
    /** 回應時間戳 */
    timestamp?: Timestamp;
}

/**
 * 訊息 Handler 函數類型
 */
export type MessageHandler<TRequest = any, TResponse = any> = (
    data?: TRequest
) => Promise<TResponse> | TResponse;

// ========== 特定訊息類型的 Payload 定義 ==========

/**
 * 保存圖形請求 (Extension 層級)
 */
export interface ExtensionSaveGraphRequest {
    /** 圖形資料（JSON 字串或物件） */
    data: string | any;
}

/**
 * 保存圖形回應 (Extension 層級)
 */
export interface ExtensionSaveGraphResponse {
    /** 是否成功保存 */
    success: boolean;
    /** 錯誤訊息 */
    message?: string;
}

/**
 * 顯示訊息請求
 */
export interface ShowMessageRequest {
    /** 訊息類型 */
    type: 'info' | 'warning' | 'error';
    /** 訊息文字 */
    text: string;
}

/**
 * 打開外部連結請求
 */
export interface OpenExternalRequest {
    /** 要打開的 URL */
    url: string;
}

/**
 * 更新主題請求
 */
export interface UpdateThemeRequest {
    /** 主題名稱 */
    theme: 'light' | 'dark' | 'high-contrast' | 'high-contrast-light';
}

/**
 * 切換 Debug 模式請求
 */
export interface ToggleDebugModeRequest {
    /** 是否啟用 Debug 模式 */
    debugMode: boolean;
}

/**
 * 獲取節點列表回應 (Extension 層級)
 */
export interface ExtensionNodesResponse {
    /** 節點定義 */
    nodes: Record<string, any[]>;
    /** 總節點數量 */
    total_count?: number;
}

/**
 * 獲取型別轉換器回應
 */
export interface TypeConvertersResponse {
    /** 型別轉換器列表 */
    converters: any[];
}

/**
 * WebSocket 請求（透過 Extension 代理）
 */
export interface WebSocketProxyRequest {
    /** WebSocket 訊息類型 */
    type: string;
    /** WebSocket 請求資料 */
    data?: any;
}

/**
 * WebSocket 連接狀態
 */
export interface WebSocketStatus {
    /** 是否已連接 */
    connected: boolean;
    /** 連接的伺服器 URL */
    url?: string;
}

/**
 * 檔案變更通知
 */
export interface FileChangedNotification {
    /** 變更的檔案路徑 */
    path: string;
}

/**
 * 日誌訊息
 */
export interface LogMessage {
    /** 日誌級別 */
    level?: 'info' | 'warn' | 'error' | 'debug';
    /** 日誌訊息 */
    message: string;
    /** 額外資料 */
    data?: any;
}

/**
 * 錯誤訊息
 */
export interface ErrorMessage {
    /** 錯誤訊息 */
    message: string;
    /** 錯誤代碼 */
    code?: string;
    /** 錯誤堆疊 */
    stack?: string;
}

// ========== Helper Functions ==========

/**
 * 建立 Extension 訊息
 */
export function createExtensionMessage<T = any>(
    type: ExtensionMessageType,
    data?: T,
    id?: UUID | string
): ExtensionMessage<T> {
    return {
        type,
        id,
        data,
        timestamp: new Date().toISOString(),
    };
}

/**
 * 建立 Extension 回應
 */
export function createExtensionResponse<T = any>(
    type: ExtensionMessageType,
    success: boolean,
    data?: T,
    error?: string,
    id?: UUID | string
): ExtensionResponse<T> {
    return {
        type,
        id,
        success,
        data,
        error,
        timestamp: new Date().toISOString(),
    };
}

/**
 * 建立成功回應
 */
export function createSuccessResponse<T = any>(
    type: ExtensionMessageType,
    data?: T,
    id?: UUID | string
): ExtensionResponse<T> {
    return createExtensionResponse(type, true, data, undefined, id);
}

/**
 * 建立錯誤回應
 */
export function createErrorResponse(
    type: ExtensionMessageType,
    error: string,
    id?: UUID | string
): ExtensionResponse {
    return createExtensionResponse(type, false, undefined, error, id);
}

/**
 * Type guard: 檢查是否為 Extension 訊息
 */
export function isExtensionMessage(value: unknown): value is ExtensionMessage {
    return (
        typeof value === 'object' &&
        value !== null &&
        'type' in value &&
        typeof (value as any).type === 'string'
    );
}

/**
 * Type guard: 檢查是否為 Extension 回應
 */
export function isExtensionResponse(value: unknown): value is ExtensionResponse {
    return (
        isExtensionMessage(value) &&
        'success' in value &&
        typeof (value as any).success === 'boolean'
    );
}

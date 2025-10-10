/**
 * REST API 類型定義
 * 定義 HTTP API 的請求和回應格式
 */

/**
 * 標準 API 回應
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ErrorInfo;
    message?: string;
}

/**
 * 錯誤資訊
 */
export interface ErrorInfo {
    code: string;
    message: string;
    details?: Record<string, any>;
    stack?: string;
}

/**
 * 分頁請求參數
 */
export interface PaginationParams {
    page?: number;
    page_size?: number;
    offset?: number;
    limit?: number;
}

/**
 * 分頁回應
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
    };
}

/**
 * 排序參數
 */
export interface SortParams {
    sort_by?: string;
    order?: 'asc' | 'desc';
}

/**
 * 過濾參數
 */
export type FilterParams = Record<string, any>;

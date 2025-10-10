/**
 * 共享的通用類型定義
 * 這些類型在 Extension、Webview 和 Backend 之間共享
 */

/**
 * 位置座標
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * 尺寸
 */
export interface Size {
    width: number;
    height: number;
}

/**
 * 顏色（十六進位）
 */
export type Color = string;

/**
 * 圖標名稱
 */
export type IconName = string;

/**
 * 時間戳（ISO 8601 格式字符串）
 */
export type Timestamp = string;

/**
 * UUID
 */
export type UUID = string;

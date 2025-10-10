/**
 * TypeScript 類型守衛
 * 運行時類型檢查
 */

import {
    GraphData,
    NodeData,
    EdgeData,
    PortData,
    GraphMetadata,
    WebSocketMessage,
    WebSocketResponse,
    WebSocketError,
    MessageType
} from '../types';

/**
 * 檢查是否為有效的 UUID
 */
export function isUUID(value: any): value is string {
    if (typeof value !== 'string') {return false;}
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

/**
 * 檢查是否為有效的 Position
 */
export function isPosition(value: any): value is { x: number; y: number } {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof value.x === 'number' &&
        typeof value.y === 'number'
    );
}

/**
 * 檢查是否為有效的 PortData
 */
export function isPortData(value: any): value is PortData {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof value.id === 'string' &&
        typeof value.name === 'string' &&
        typeof value.type === 'string' &&
        typeof value.data_type === 'string'
    );
}

/**
 * 檢查是否為有效的 NodeData
 */
export function isNodeData(value: any): value is NodeData {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof value.id === 'string' &&
        typeof value.type === 'string' &&
        isPosition(value.position) &&
        typeof value.data === 'object'
    );
}

/**
 * 檢查是否為有效的 EdgeData
 */
export function isEdgeData(value: any): value is EdgeData {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof value.id === 'string' &&
        typeof value.source === 'string' &&
        typeof value.source_handle === 'string' &&
        typeof value.target === 'string' &&
        typeof value.target_handle === 'string'
    );
}

/**
 * 檢查是否為有效的 GraphMetadata
 */
export function isGraphMetadata(value: any): value is GraphMetadata {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof value.name === 'string'
    );
}

/**
 * 檢查是否為有效的 GraphData
 */
export function isGraphData(value: any): value is GraphData {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof value.id === 'string' &&
        isGraphMetadata(value.metadata) &&
        Array.isArray(value.nodes) &&
        value.nodes.every(isNodeData) &&
        Array.isArray(value.edges) &&
        value.edges.every(isEdgeData)
    );
}

/**
 * 檢查是否為有效的 WebSocketMessage
 */
export function isWebSocketMessage(value: any): value is WebSocketMessage {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof value.type === 'string'
    );
}

/**
 * 檢查是否為有效的 WebSocketResponse
 */
export function isWebSocketResponse(value: any): value is WebSocketResponse {
    return (
        value !== null &&
        typeof value === 'object' &&
        typeof value.type === 'string' &&
        typeof value.success === 'boolean'
    );
}

/**
 * 檢查是否為 WebSocket 錯誤
 */
export function isWebSocketError(value: any): value is WebSocketError {
    return (
        value !== null &&
        typeof value === 'object' &&
        value.type === MessageType.ERROR &&
        value.success === false &&
        typeof value.error === 'string'
    );
}

/**
 * 驗證並斷言類型
 */
export function assertType<T>(
    value: any,
    guard: (value: any) => value is T,
    errorMessage: string
): asserts value is T {
    if (!guard(value)) {
        throw new TypeError(errorMessage);
    }
}

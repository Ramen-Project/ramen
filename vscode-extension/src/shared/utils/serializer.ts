/**
 * 序列化/反序列化工具
 * 處理前後端資料格式轉換（camelCase <-> snake_case）
 */

/**
 * 將 snake_case 轉換為 camelCase
 */
export function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 將 camelCase 轉換為 snake_case
 */
export function camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * 深度轉換物件鍵名：snake_case -> camelCase
 */
export function keysToCamel<T = any>(obj: any): T {
    if (Array.isArray(obj)) {
        return obj.map(v => keysToCamel(v)) as any;
    } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = snakeToCamel(key);
            result[camelKey] = keysToCamel(obj[key]);
            return result;
        }, {} as any);
    }
    return obj;
}

/**
 * 深度轉換物件鍵名：camelCase -> snake_case
 */
export function keysToSnake<T = any>(obj: any): T {
    if (Array.isArray(obj)) {
        return obj.map(v => keysToSnake(v)) as any;
    } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const snakeKey = camelToSnake(key);
            result[snakeKey] = keysToSnake(obj[key]);
            return result;
        }, {} as any);
    }
    return obj;
}

/**
 * 序列化資料為 JSON（自動轉換為 snake_case）
 */
export function serialize<T = any>(data: T): string {
    const snakeCaseData = keysToSnake(data);
    return JSON.stringify(snakeCaseData);
}

/**
 * 反序列化 JSON 資料（自動轉換為 camelCase）
 */
export function deserialize<T = any>(json: string): T {
    const data = JSON.parse(json);
    return keysToCamel<T>(data);
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T = any>(json: string, defaultValue: T): T {
    try {
        return deserialize<T>(json);
    } catch {
        return defaultValue;
    }
}

/**
 * 驗證 JSON 格式
 */
export function isValidJson(str: string): boolean {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

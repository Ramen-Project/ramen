# Security Manager 重構計畫

## 📋 現狀分析

### 當前實作
- **檔案**: `vscode-extension/src/extension/security/securityManager.ts`
- **大小**: 507 行
- **狀態**: ❌ 完全未被使用（無任何 import）

### 功能清單

| 功能 | 狀態 | 是否需要 | 決策 |
|------|------|---------|------|
| **Sandbox 執行** | 完整實作 | ❌ 否 | 移除 - 圖形在 Python 執行 |
| **程式碼簽章** | Placeholder keys | ❌ 否 | 移除 - 無使用場景 |
| **權限管理** | 完整實作 | ✅ 是 | **保留** |
| **信任源管理** | 完整實作 | ❌ 否 | 移除 - 無使用場景 |
| **審計日誌** | 完整實作 | ✅ 是 | **保留** |

---

## ✅ 保留功能

### 1. 權限管理 (Permission Management)

**保留原因**: 未來可能需要控制 Topping 或擴展功能的權限

```typescript
export class PermissionManager {
    private permissions = new Map<string, PermissionSet>();

    /**
     * Grant permissions to a target (topping, extension, etc.)
     */
    grantPermissions(target: string, permissions: Permission[]): void {
        const current = this.permissions.get(target) || { permissions: [] };
        const newPermissions = new Set([...current.permissions, ...permissions]);

        this.permissions.set(target, {
            permissions: Array.from(newPermissions)
        });

        this.audit('permissions_granted', { target, permissions });
    }

    /**
     * Revoke permissions from a target
     */
    revokePermissions(target: string, permissions?: Permission[]): void {
        if (!permissions) {
            this.permissions.delete(target);
            this.audit('all_permissions_revoked', { target });
        } else {
            const current = this.permissions.get(target);
            if (current) {
                const remaining = current.permissions.filter(
                    p => !permissions.includes(p)
                );

                if (remaining.length > 0) {
                    this.permissions.set(target, { permissions: remaining });
                } else {
                    this.permissions.delete(target);
                }

                this.audit('permissions_revoked', { target, permissions });
            }
        }
    }

    /**
     * Check if target has specific permissions
     */
    hasPermissions(target: string, required: Permission[]): boolean {
        const current = this.permissions.get(target);
        if (!current) return false;

        return required.every(p => current.permissions.includes(p));
    }

    /**
     * Get all permissions for a target
     */
    getPermissions(target: string): Permission[] {
        return this.permissions.get(target)?.permissions || [];
    }
}
```

### 2. 權限類型 (Permission Types)

```typescript
export enum Permission {
    // 基本權限
    EXECUTION = 'execution',           // 執行圖形

    // 資源存取
    NETWORK = 'network',               // 網路請求
    STORAGE = 'storage',               // 本地儲存
    FILE_SYSTEM = 'file_system',       // 檔案系統存取

    // 系統整合
    MODULES = 'modules',               // 載入外部模組
    SYSTEM = 'system',                 // 系統 API 呼叫

    // 開發工具
    DEBUGGING = 'debugging',           // 除錯功能

    // VSCode 整合
    VSCODE_COMMANDS = 'vscode_commands', // 執行 VSCode 命令
    VSCODE_SETTINGS = 'vscode_settings', // 修改設定
    WORKSPACE = 'workspace'              // 存取 workspace
}
```

### 3. 審計日誌 (Audit Log)

**保留原因**: 追蹤權限變更和安全事件

```typescript
export class AuditLogger {
    private auditLog: SecurityAuditEntry[] = [];

    /**
     * Log a security event
     */
    audit(
        action: string,
        details: any,
        severity: AuditSeverity = AuditSeverity.INFO
    ): void {
        const entry: SecurityAuditEntry = {
            timestamp: new Date(),
            action,
            details,
            severity
        };

        this.auditLog.push(entry);

        // Keep only last 1000 entries
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }

        // Log critical events to console
        if (severity === AuditSeverity.CRITICAL) {
            console.error('[SECURITY CRITICAL]', action, details);
        }
    }

    /**
     * Get audit log with optional filtering
     */
    getAuditLog(filter?: AuditFilter): SecurityAuditEntry[] {
        let entries = [...this.auditLog];

        if (filter) {
            if (filter.startDate) {
                entries = entries.filter(e => e.timestamp >= filter.startDate!);
            }
            if (filter.endDate) {
                entries = entries.filter(e => e.timestamp <= filter.endDate!);
            }
            if (filter.action) {
                entries = entries.filter(e => e.action === filter.action);
            }
            if (filter.severity) {
                entries = entries.filter(e => e.severity === filter.severity);
            }
        }

        return entries;
    }
}

export enum AuditSeverity {
    DEBUG = 'debug',
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

export interface SecurityAuditEntry {
    timestamp: Date;
    action: string;
    details: any;
    severity: AuditSeverity;
}
```

### 4. 設定持久化

```typescript
/**
 * Load/save permissions configuration
 */
private async loadConfiguration(): Promise<void> {
    try {
        const configPath = path.join(
            this.context.globalStorageUri.fsPath,
            'permissions.json'
        );

        if (fs.existsSync(configPath)) {
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            if (data.permissions) {
                this.permissions = new Map(Object.entries(data.permissions));
            }
        }
    } catch (error) {
        console.error('Failed to load permissions configuration:', error);
    }
}

private async saveConfiguration(): Promise<void> {
    try {
        const configPath = path.join(
            this.context.globalStorageUri.fsPath,
            'permissions.json'
        );

        const data = {
            permissions: Object.fromEntries(this.permissions)
        };

        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to save permissions configuration:', error);
    }
}
```

---

## ❌ 移除功能

### 1. Sandbox 執行 (移除原因)

```typescript
// ❌ 移除這些方法:
createSandbox()
executeInSandbox()
cleanupSandboxes()
validateCode()
analyzeRequiredPermissions()
createRestrictedGlobal()
```

**原因**:
- 圖形執行在 Python backend，不在 JavaScript
- 不需要 JavaScript 層的 sandbox
- UV 已提供 Python 環境隔離

### 2. 程式碼簽章 (移除原因)

```typescript
// ❌ 移除這些方法:
verifyCodeSignature()
signCode()
getDefaultPublicKey()    // ← Placeholder key
getDefaultPrivateKey()   // ← Placeholder key
hashCode()
```

**原因**:
- 使用 placeholder keys，不安全
- 沒有實際使用場景
- 如果未來需要，應該用 VSCode 的內建機制

### 3. 信任源管理 (移除原因)

```typescript
// ❌ 移除這些方法:
isTrustedSource()
addTrustedSource()
verifySource()
```

**原因**:
- 完全未被使用
- 沒有明確的「source」概念
- Topping 來源應該在 Python 端管理

---

## 📦 重構後的結構

### 新檔案結構

```
vscode-extension/src/extension/security/
├── permissionManager.ts      (新) - 權限管理核心
├── auditLogger.ts            (新) - 審計日誌
├── types.ts                  (新) - 共用型別定義
└── securityManager.ts        (刪除) - 舊的完整實作
```

### 預期程式碼量

| 檔案 | 行數 | 說明 |
|------|------|------|
| `permissionManager.ts` | ~80 行 | 權限管理邏輯 |
| `auditLogger.ts` | ~50 行 | 審計日誌 |
| `types.ts` | ~30 行 | 型別定義 |
| **總計** | **~160 行** | 從 507 行精簡至 160 行 |

---

## 🔧 使用範例

### 範例 1: 為 Topping 授予權限

```typescript
import { PermissionManager, Permission } from './security/permissionManager';

const permissionManager = PermissionManager.getInstance(context);

// 授予 numpy topping 網路和檔案系統權限
permissionManager.grantPermissions('ramen-topping-numpy', [
    Permission.EXECUTION,
    Permission.FILE_SYSTEM,
    Permission.NETWORK
]);

// 檢查權限
if (permissionManager.hasPermissions('ramen-topping-numpy', [Permission.NETWORK])) {
    console.log('Topping has network access');
}
```

### 範例 2: 撤銷權限

```typescript
// 撤銷特定權限
permissionManager.revokePermissions('untrusted-topping', [Permission.NETWORK]);

// 撤銷所有權限
permissionManager.revokePermissions('malicious-topping');
```

### 範例 3: 查看審計日誌

```typescript
import { AuditSeverity } from './security/types';

// 取得所有權限變更記錄
const log = permissionManager.getAuditLog({
    action: 'permissions_granted',
    severity: AuditSeverity.INFO
});

log.forEach(entry => {
    console.log(`[${entry.timestamp}] ${entry.action}:`, entry.details);
});
```

---

## 📝 遷移步驟

### Phase 1: 創建新模組
1. ✅ 創建 `permissionManager.ts`
2. ✅ 創建 `auditLogger.ts`
3. ✅ 創建 `types.ts`
4. ✅ 從 `securityManager.ts` 提取相關程式碼

### Phase 2: 整合到專案
5. 在需要權限控制的地方引入 `PermissionManager`
6. 為 Topping 系統添加權限檢查
7. 為擴展功能添加權限檢查

### Phase 3: 清理
8. 移除 `securityManager.ts`
9. 更新相關文檔
10. 添加單元測試

---

## 🎯 未來擴展可能

如果未來需要更進階的安全功能，建議：

1. **Topping Marketplace**
   - 需要時再實作程式碼簽章
   - 使用 VSCode SecretStorage API 管理金鑰

2. **Remote Execution**
   - 需要時再實作 sandbox
   - 應該在 Python 端實作，不是 JavaScript

3. **第三方整合**
   - 使用 OAuth 2.0 而非自訂簽章
   - 依賴 VSCode 的內建安全機制

---

## ✅ 決策總結

| 項目 | 決策 | 原因 |
|------|------|------|
| **權限管理** | ✅ 保留 | 未來可能需要 |
| **審計日誌** | ✅ 保留 | 追蹤安全事件 |
| **Sandbox** | ❌ 移除 | 不符合架構 |
| **程式碼簽章** | ❌ 移除 | Placeholder + 無使用場景 |
| **信任源** | ❌ 移除 | 無使用場景 |

**預期效益**:
- 程式碼量從 507 行減少至 ~160 行 (↓68%)
- 移除所有未使用功能
- 保留未來可能需要的權限管理
- 更清晰的職責分離

---

*文檔版本: 1.0*
*最後更新: 2025-10-01*
*作者: Claude (Sonnet 4.5)*

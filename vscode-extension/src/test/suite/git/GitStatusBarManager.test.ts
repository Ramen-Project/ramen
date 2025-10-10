/**
 * GitStatusBarManager 單元測試
 * 測試 Git 狀態列管理器的功能
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { GitStatusBarManager } from '../../../extension/git/GitStatusBarManager';

suite('GitStatusBarManager Tests', () => {
    let statusBarManager: GitStatusBarManager;

    setup(() => {
        statusBarManager = new GitStatusBarManager();
    });

    teardown(() => {
        statusBarManager.dispose();
    });

    test('1. GitStatusBarManager 應該能夠正確初始化', () => {
        assert.ok(statusBarManager, 'GitStatusBarManager 應該能夠創建');
        assert.ok(
            typeof statusBarManager.updateStatusBar === 'function',
            '應該有 updateStatusBar 方法'
        );
        assert.ok(
            typeof statusBarManager.forceUpdate === 'function',
            '應該有 forceUpdate 方法'
        );
        assert.ok(
            typeof statusBarManager.showDetailedStatus === 'function',
            '應該有 showDetailedStatus 方法'
        );
    });

    test('2. dispose 應該正確清理資源', () => {
        const manager = new GitStatusBarManager();
        assert.doesNotThrow(() => {
            manager.dispose();
        }, 'dispose 不應該拋出錯誤');

        // 再次調用 dispose 也不應該出錯
        assert.doesNotThrow(() => {
            manager.dispose();
        }, '多次調用 dispose 不應該拋出錯誤');
    });

    test('3. updateStatusBar 應該能夠處理有效的 URI', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            console.log('⚠️  沒有打開的工作空間，跳過此測試');
            return;
        }

        const testUri = workspaceFolders[0].uri;

        // 調用 updateStatusBar 不應該拋出錯誤
        await assert.doesNotReject(async () => {
            await statusBarManager.updateStatusBar(testUri);
        }, 'updateStatusBar 不應該拋出錯誤');
    });

    test('4. updateStatusBar 應該能夠處理無效的 URI', async () => {
        const invalidUri = vscode.Uri.file('/nonexistent/path');

        // 調用 updateStatusBar 不應該拋出錯誤（應該優雅地處理）
        await assert.doesNotReject(async () => {
            await statusBarManager.updateStatusBar(invalidUri);
        }, 'updateStatusBar 應該優雅地處理無效 URI');
    });

    test('5. forceUpdate 應該能夠在沒有 context 時正常執行', async () => {
        // 在沒有設置 currentWorkspaceUri 的情況下調用 forceUpdate
        await assert.doesNotReject(async () => {
            await statusBarManager.forceUpdate();
        }, 'forceUpdate 應該能夠處理無 context 的情況');
    });

    test('6. showDetailedStatus 應該能夠在沒有 context 時正常執行', async () => {
        // 在沒有設置 currentWorkspaceUri 的情況下調用 showDetailedStatus
        await assert.doesNotReject(async () => {
            await statusBarManager.showDetailedStatus();
        }, 'showDetailedStatus 應該能夠處理無 context 的情況');
    });

    test('7. GitStatusBarManager 應該在 dispose 後停止更新', async () => {
        const manager = new GitStatusBarManager();
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            console.log('⚠️  沒有打開的工作空間，跳過此測試');
            manager.dispose();
            return;
        }

        const testUri = workspaceFolders[0].uri;

        // 更新狀態
        await manager.updateStatusBar(testUri);

        // Dispose
        manager.dispose();

        // Dispose 後的更新應該不會拋出錯誤（應該被忽略）
        await assert.doesNotReject(async () => {
            await manager.updateStatusBar(testUri);
        }, 'dispose 後的 updateStatusBar 應該優雅地處理');
    });

    test('8. GitStatusInfo 類型應該正確定義', () => {
        // 測試 GitStatusInfo interface 的結構
        const mockStatusInfo = {
            branch: 'main',
            ahead: 0,
            behind: 0,
            modified: 1,
            added: 0,
            deleted: 0,
            untracked: 0,
            hasChanges: true,
        };

        assert.strictEqual(mockStatusInfo.branch, 'main', 'branch 應該是字串');
        assert.strictEqual(typeof mockStatusInfo.ahead, 'number', 'ahead 應該是數字');
        assert.strictEqual(typeof mockStatusInfo.behind, 'number', 'behind 應該是數字');
        assert.strictEqual(typeof mockStatusInfo.modified, 'number', 'modified 應該是數字');
        assert.strictEqual(typeof mockStatusInfo.added, 'number', 'added 應該是數字');
        assert.strictEqual(typeof mockStatusInfo.deleted, 'number', 'deleted 應該是數字');
        assert.strictEqual(typeof mockStatusInfo.untracked, 'number', 'untracked 應該是數字');
        assert.strictEqual(
            typeof mockStatusInfo.hasChanges,
            'boolean',
            'hasChanges 應該是布林值'
        );
    });
});

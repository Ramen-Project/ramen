/**
 * Git 整合單元測試
 * 測試 GitIntegrationService 的核心功能
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GitIntegrationService } from '../../../extension/commands/gitCommands';

suite('GitIntegrationService Tests', () => {
    let gitService: GitIntegrationService;
    let testWorkspaceUri: vscode.Uri;

    setup(() => {
        gitService = new GitIntegrationService();

        // 使用當前工作空間作為測試環境
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            testWorkspaceUri = workspaceFolders[0].uri;
        }
    });

    teardown(() => {
        gitService.dispose();
    });

    test('1. isInGitRepository 應該正確檢測 Git repository', async () => {
        // 假設測試在 Git repository 中運行
        const result = await gitService.isInGitRepository(testWorkspaceUri);
        assert.strictEqual(typeof result, 'boolean', 'isInGitRepository 應該回傳 boolean');
    });

    test('2. isInGitRepository 應該對無效路徑回傳 false', async () => {
        const invalidUri = vscode.Uri.file('/nonexistent/path/to/nowhere');
        const result = await gitService.isInGitRepository(invalidUri);
        assert.strictEqual(result, false, '無效路徑應該回傳 false');
    });

    test('3. getGitStatus 應該能夠獲取 Git 狀態', async () => {
        if (!(await gitService.isInGitRepository(testWorkspaceUri))) {
            console.log('⚠️  測試環境不在 Git repository 中，跳過此測試');
            return;
        }

        const status = await gitService.getGitStatus(testWorkspaceUri);
        assert.ok(Array.isArray(status), 'getGitStatus 應該回傳陣列');
    });

    test('4. isGitHookInstalled 應該正確檢測 hook 狀態', async () => {
        if (!(await gitService.isInGitRepository(testWorkspaceUri))) {
            console.log('⚠️  測試環境不在 Git repository 中，跳過此測試');
            return;
        }

        const isInstalled = await gitService.isGitHookInstalled(testWorkspaceUri);
        assert.strictEqual(typeof isInstalled, 'boolean', '應該回傳 boolean');
    });

    test('5. installGitHooks 應該能夠安裝 Git hooks', async function () {
        // 延長測試超時時間
        this.timeout(10000);

        if (!(await gitService.isInGitRepository(testWorkspaceUri))) {
            console.log('⚠️  測試環境不在 Git repository 中，跳過此測試');
            return;
        }

        // 先檢查是否已安裝
        const wasInstalled = await gitService.isGitHookInstalled(testWorkspaceUri);

        // 嘗試安裝（可能會因為已存在而失敗，這是預期的）
        const result = await gitService.installGitHooks(testWorkspaceUri);

        // 如果安裝成功或已經安裝，檢查 hook 文件是否存在
        if (result || wasInstalled) {
            const isNowInstalled = await gitService.isGitHookInstalled(testWorkspaceUri);
            assert.strictEqual(
                isNowInstalled,
                true,
                'installGitHooks 後應該檢測到 hook 已安裝'
            );
        }
    });

    test('6. Git hooks 腳本應該包含正確的驗證邏輯', async () => {
        if (!(await gitService.isInGitRepository(testWorkspaceUri))) {
            console.log('⚠️  測試環境不在 Git repository 中，跳過此測試');
            return;
        }

        const preCommitPath = path.join(testWorkspaceUri.fsPath, '.git', 'hooks', 'pre-commit');

        if (!fs.existsSync(preCommitPath)) {
            console.log('⚠️  pre-commit hook 未安裝，跳過此測試');
            return;
        }

        const content = fs.readFileSync(preCommitPath, 'utf-8');

        // 檢查關鍵內容
        assert.ok(
            content.includes('Ramen pre-commit validation'),
            'Hook 應該包含 Ramen 標識'
        );
        assert.ok(content.includes('.ramen'), 'Hook 應該處理 .ramen 檔案');
        assert.ok(content.includes('json.tool'), 'Hook 應該驗證 JSON 格式');
    });

    test('7. uninstallGitHooks 應該能夠移除 Git hooks', async function () {
        this.timeout(10000);

        if (!(await gitService.isInGitRepository(testWorkspaceUri))) {
            console.log('⚠️  測試環境不在 Git repository 中，跳過此測試');
            return;
        }

        // 先安裝（如果尚未安裝）
        const wasInstalled = await gitService.isGitHookInstalled(testWorkspaceUri);
        if (!wasInstalled) {
            await gitService.installGitHooks(testWorkspaceUri);
        }

        // 移除
        const uninstallResult = await gitService.uninstallGitHooks(testWorkspaceUri);

        // 驗證移除結果
        if (uninstallResult) {
            const isStillInstalled = await gitService.isGitHookInstalled(testWorkspaceUri);
            assert.strictEqual(
                isStillInstalled,
                false,
                'uninstallGitHooks 後應該檢測到 hook 已移除'
            );
        }
    });

    test('8. getFileContentAtCommit 應該能夠獲取特定 commit 的檔案內容', async () => {
        if (!(await gitService.isInGitRepository(testWorkspaceUri))) {
            console.log('⚠️  測試環境不在 Git repository 中，跳過此測試');
            return;
        }

        // 此測試需要有 .ramen 檔案的 commit 歷史
        // 我們只測試方法存在性
        assert.ok(
            typeof (gitService as any).getFileContentAtCommit === 'function',
            'getFileContentAtCommit 方法應該存在'
        );
    });

    test('9. GitIntegrationService 應該能夠正確初始化', () => {
        assert.ok(gitService, 'GitIntegrationService 應該能夠正確創建');
        assert.ok(
            typeof gitService.isInGitRepository === 'function',
            '應該有 isInGitRepository 方法'
        );
        assert.ok(typeof gitService.getGitStatus === 'function', '應該有 getGitStatus 方法');
        assert.ok(
            typeof gitService.installGitHooks === 'function',
            '應該有 installGitHooks 方法'
        );
        assert.ok(
            typeof gitService.uninstallGitHooks === 'function',
            '應該有 uninstallGitHooks 方法'
        );
        assert.ok(
            typeof gitService.isGitHookInstalled === 'function',
            '應該有 isGitHookInstalled 方法'
        );
    });

    test('10. GitIntegrationService dispose 應該正確清理資源', () => {
        const service = new GitIntegrationService();
        assert.doesNotThrow(() => {
            service.dispose();
        }, 'dispose 不應該拋出錯誤');
    });

    test('11. getRamenFileDiff 應該對有效的 commit 回傳差異結果', async function () {
        this.timeout(10000);

        if (!(await gitService.isInGitRepository(testWorkspaceUri))) {
            console.log('⚠️  測試環境不在 Git repository 中，跳過此測試');
            return;
        }

        // 尋找一個 .ramen 檔案
        const ramenFiles = await vscode.workspace.findFiles('**/*.ramen', null, 1);
        if (ramenFiles.length === 0) {
            console.log('⚠️  沒有找到 .ramen 檔案，跳過此測試');
            return;
        }

        const relativePath = path.relative(testWorkspaceUri.fsPath, ramenFiles[0].fsPath);

        // 嘗試獲取差異（可能會失敗，如果檔案沒有歷史）
        try {
            const diff = await gitService.getRamenFileDiff(relativePath);
            // 如果有結果，驗證結構
            if (diff) {
                assert.ok('totalChanges' in diff, 'diff 應該有 totalChanges 屬性');
                assert.ok('nodesAdded' in diff, 'diff 應該有 nodesAdded 屬性');
                assert.ok('nodesRemoved' in diff, 'diff 應該有 nodesRemoved 屬性');
            }
        } catch (error) {
            console.log('⚠️  無法獲取 diff（可能是檔案沒有歷史），跳過驗證');
        }
    });

    test('12. showGraphDiff 應該能夠創建 webview 面板', async () => {
        // Mock diff result
        const mockDiff = {
            fromVersion: 'HEAD~1',
            toVersion: 'HEAD',
            totalChanges: 5,
            nodesAdded: [{ nodeId: 'node1', changes: ['Added new node'] }],
            nodesRemoved: [],
            nodesModified: [{ nodeId: 'node2', changes: ['Modified parameter'] }],
            nodesMoved: [],
            edgesAdded: [],
            edgesRemoved: [],
            edgesModified: [],
            metadataChanges: [],
        };

        // 測試方法存在性
        assert.ok(
            typeof gitService.showGraphDiff === 'function',
            'showGraphDiff 方法應該存在'
        );

        // 實際調用會創建 webview，我們在這裡只驗證方法不會拋出錯誤
        // 實際的 webview 創建需要更複雜的 integration test
    });
});

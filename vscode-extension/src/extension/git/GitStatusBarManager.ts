/**
 * Git 狀態列管理器
 * 在 VSCode 狀態列顯示 Git 分支和狀態資訊
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitStatusInfo {
    branch: string;
    ahead: number;
    behind: number;
    modified: number;
    added: number;
    deleted: number;
    untracked: number;
    hasChanges: boolean;
}

export class GitStatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private updateTimer?: NodeJS.Timeout;
    private currentWorkspaceUri?: vscode.Uri;
    private disposed = false;

    constructor() {
        // 創建狀態列項目
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'ramen.git.showStatus';
        this.statusBarItem.tooltip = 'Click to view detailed Git status';

        // 監聽文件變更
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/.ramen');
        fileWatcher.onDidChange(() => this.scheduleUpdate());
        fileWatcher.onDidCreate(() => this.scheduleUpdate());
        fileWatcher.onDidDelete(() => this.scheduleUpdate());

        // 監聽編輯器切換
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor?.document.uri.fsPath.endsWith('.ramen')) {
                this.updateStatusBar(editor.document.uri);
            }
        });

        // 初始化狀態
        if (vscode.window.activeTextEditor?.document.uri.fsPath.endsWith('.ramen')) {
            this.updateStatusBar(vscode.window.activeTextEditor.document.uri);
        }
    }

    /**
     * 排程更新（防抖動）
     */
    private scheduleUpdate(): void {
        if (this.disposed) return;

        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
        }

        this.updateTimer = setTimeout(() => {
            if (this.currentWorkspaceUri) {
                this.updateStatusBar(this.currentWorkspaceUri);
            }
        }, 1000); // 1 秒延遲
    }

    /**
     * 更新狀態列
     */
    async updateStatusBar(fileUri: vscode.Uri): Promise<void> {
        if (this.disposed) return;

        try {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
            if (!workspaceFolder) {
                this.statusBarItem.hide();
                return;
            }

            this.currentWorkspaceUri = workspaceFolder.uri;

            // 檢查是否在 Git repository
            if (!(await this.isInGitRepository(workspaceFolder.uri))) {
                this.statusBarItem.hide();
                return;
            }

            // 獲取 Git 狀態
            const statusInfo = await this.getGitStatus(workspaceFolder.uri);

            if (statusInfo) {
                this.updateStatusBarText(statusInfo);
                this.statusBarItem.show();
            } else {
                this.statusBarItem.hide();
            }
        } catch (error) {
            console.error('Failed to update Git status bar:', error);
            this.statusBarItem.hide();
        }
    }

    /**
     * 更新狀態列文字和圖示
     */
    private updateStatusBarText(status: GitStatusInfo): void {
        const parts: string[] = [];

        // Git 圖示和分支
        parts.push(`$(git-branch) ${status.branch}`);

        // 遠端同步狀態
        if (status.ahead > 0 || status.behind > 0) {
            if (status.ahead > 0) {
                parts.push(`↑${status.ahead}`);
            }
            if (status.behind > 0) {
                parts.push(`↓${status.behind}`);
            }
        }

        // 本地變更
        if (status.hasChanges) {
            const changes: string[] = [];
            if (status.modified > 0) changes.push(`~${status.modified}`);
            if (status.added > 0) changes.push(`+${status.added}`);
            if (status.deleted > 0) changes.push(`-${status.deleted}`);
            if (status.untracked > 0) changes.push(`?${status.untracked}`);

            if (changes.length > 0) {
                parts.push(`(${changes.join(' ')})`);
            }
        }

        this.statusBarItem.text = parts.join(' ');

        // 更新工具提示
        this.statusBarItem.tooltip = this.generateTooltip(status);
    }

    /**
     * 產生詳細的工具提示
     */
    private generateTooltip(status: GitStatusInfo): string {
        const lines: string[] = [];

        lines.push(`🍜 Ramen Git Status`);
        lines.push('');
        lines.push(`Branch: ${status.branch}`);

        if (status.ahead > 0 || status.behind > 0) {
            lines.push('');
            lines.push('Remote Sync:');
            if (status.ahead > 0) {
                lines.push(`  ${status.ahead} commit(s) ahead`);
            }
            if (status.behind > 0) {
                lines.push(`  ${status.behind} commit(s) behind`);
            }
        }

        if (status.hasChanges) {
            lines.push('');
            lines.push('Local Changes:');
            if (status.modified > 0) {
                lines.push(`  ${status.modified} file(s) modified`);
            }
            if (status.added > 0) {
                lines.push(`  ${status.added} file(s) added`);
            }
            if (status.deleted > 0) {
                lines.push(`  ${status.deleted} file(s) deleted`);
            }
            if (status.untracked > 0) {
                lines.push(`  ${status.untracked} file(s) untracked`);
            }
        } else {
            lines.push('');
            lines.push('✓ Working tree clean');
        }

        lines.push('');
        lines.push('Click to view detailed status');

        return lines.join('\n');
    }

    /**
     * 獲取 Git 狀態資訊
     */
    private async getGitStatus(workspaceUri: vscode.Uri): Promise<GitStatusInfo | null> {
        try {
            // 獲取當前分支
            const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', {
                cwd: workspaceUri.fsPath,
                timeout: 5000,
            });
            const branch = branchOutput.trim();

            // 獲取遠端同步狀態
            let ahead = 0;
            let behind = 0;

            try {
                const { stdout: countOutput } = await execAsync(
                    `git rev-list --left-right --count HEAD...@{upstream}`,
                    {
                        cwd: workspaceUri.fsPath,
                        timeout: 5000,
                    }
                );

                const match = countOutput.trim().match(/(\d+)\s+(\d+)/);
                if (match) {
                    ahead = parseInt(match[1]);
                    behind = parseInt(match[2]);
                }
            } catch {
                // 沒有遠端追蹤分支，忽略錯誤
            }

            // 獲取工作區狀態
            const { stdout: statusOutput } = await execAsync('git status --porcelain', {
                cwd: workspaceUri.fsPath,
                timeout: 5000,
            });

            const lines = statusOutput.split('\n').filter((line) => line.trim());

            let modified = 0;
            let added = 0;
            let deleted = 0;
            let untracked = 0;

            for (const line of lines) {
                const status = line.substring(0, 2);
                if (status.includes('M')) modified++;
                else if (status.includes('A')) added++;
                else if (status.includes('D')) deleted++;
                else if (status.includes('?')) untracked++;
            }

            return {
                branch,
                ahead,
                behind,
                modified,
                added,
                deleted,
                untracked,
                hasChanges: modified > 0 || added > 0 || deleted > 0 || untracked > 0,
            };
        } catch (error) {
            console.error('Failed to get Git status:', error);
            return null;
        }
    }

    /**
     * 檢查是否在 Git repository 中
     */
    private async isInGitRepository(workspaceUri: vscode.Uri): Promise<boolean> {
        try {
            const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', {
                cwd: workspaceUri.fsPath,
                timeout: 5000,
            });
            return stdout.trim() === 'true';
        } catch {
            return false;
        }
    }

    /**
     * 顯示詳細的 Git 狀態
     */
    async showDetailedStatus(): Promise<void> {
        if (!this.currentWorkspaceUri) {
            vscode.window.showInformationMessage('No Git repository context available');
            return;
        }

        const status = await this.getGitStatus(this.currentWorkspaceUri);
        if (!status) {
            vscode.window.showErrorMessage('Failed to retrieve Git status');
            return;
        }

        const message = this.generateTooltip(status);
        vscode.window.showInformationMessage(message, { modal: true });
    }

    /**
     * 強制更新狀態列
     */
    async forceUpdate(): Promise<void> {
        if (this.currentWorkspaceUri) {
            await this.updateStatusBar(this.currentWorkspaceUri);
        }
    }

    /**
     * 清理資源
     */
    dispose(): void {
        this.disposed = true;

        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = undefined;
        }

        this.statusBarItem.dispose();
    }
}

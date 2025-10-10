/**
 * Git 版本控制整合
 * 提供圖形檔案的版本管理、比較和合併功能
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Git 版本資訊
 */
export interface GitVersion {
    commit: string;
    shortCommit: string;
    message: string;
    author: string;
    date: string;
    tag?: string;
}

/**
 * 圖形版本差異
 */
export interface GraphVersionDiff {
    fromVersion: GitVersion;
    toVersion: GitVersion;
    nodesAdded: string[];
    nodesRemoved: string[];
    nodesModified: string[];
    edgesAdded: string[];
    edgesRemoved: string[];
    metadataChanged: boolean;
}

/**
 * Git 版本控制服務
 */
export class GitVersionControl implements vscode.Disposable {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Ramen Git Version');
    }

    /**
     * 為圖形檔案建立 Git 標籤
     */
    async createVersionTag(
        filePath: string,
        version: string,
        message?: string
    ): Promise<boolean> {
        try {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('File is not in a workspace');
                return false;
            }

            const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
            const tagName = `${path.basename(filePath, '.ramen')}-v${version}`;
            const tagMessage =
                message || `Version ${version} of ${path.basename(filePath)}`;

            // 檢查是否有未提交的變更
            const { stdout: statusOutput } = await execAsync(
                `git status --porcelain "${relativePath}"`,
                {
                    cwd: workspaceFolder.uri.fsPath,
                }
            );

            if (statusOutput.trim()) {
                const choice = await vscode.window.showWarningMessage(
                    `File has uncommitted changes. Commit before creating tag?`,
                    'Yes',
                    'No'
                );

                if (choice === 'Yes') {
                    // 提交變更
                    await execAsync(`git add "${relativePath}"`, {
                        cwd: workspaceFolder.uri.fsPath,
                    });

                    await execAsync(
                        `git commit -m "Version ${version} - ${path.basename(filePath)}"`,
                        {
                            cwd: workspaceFolder.uri.fsPath,
                        }
                    );
                } else {
                    return false;
                }
            }

            // 建立標籤
            await execAsync(`git tag -a "${tagName}" -m "${tagMessage}"`, {
                cwd: workspaceFolder.uri.fsPath,
            });

            this.outputChannel.appendLine(`✅ Created tag: ${tagName}`);
            vscode.window.showInformationMessage(`Version tag created: ${tagName}`);
            return true;
        } catch (error: any) {
            this.outputChannel.appendLine(`Failed to create tag: ${error.message}`);
            vscode.window.showErrorMessage(`Failed to create version tag: ${error.message}`);
            return false;
        }
    }

    /**
     * 列出圖形檔案的所有版本標籤
     */
    async listVersionTags(filePath: string): Promise<GitVersion[]> {
        try {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
            if (!workspaceFolder) {
                return [];
            }

            const basename = path.basename(filePath, '.ramen');
            const tagPrefix = `${basename}-v`;

            // 獲取所有標籤
            const { stdout } = await execAsync(`git tag -l "${tagPrefix}*" --sort=-version:refname`, {
                cwd: workspaceFolder.uri.fsPath,
            });

            const tags = stdout
                .split('\n')
                .filter((line) => line.trim())
                .map((tag) => tag.trim());

            // 獲取每個標籤的詳細資訊
            const versions: GitVersion[] = [];

            for (const tag of tags) {
                try {
                    const { stdout: commitInfo } = await execAsync(
                        `git show ${tag} --format="%H|%h|%s|%an|%ai" --no-patch`,
                        {
                            cwd: workspaceFolder.uri.fsPath,
                        }
                    );

                    const [commit, shortCommit, message, author, date] = commitInfo
                        .trim()
                        .split('|');

                    versions.push({
                        commit,
                        shortCommit,
                        message,
                        author,
                        date,
                        tag,
                    });
                } catch {
                    // 跳過無效的標籤
                }
            }

            return versions;
        } catch (error) {
            this.outputChannel.appendLine(`Failed to list version tags: ${error}`);
            return [];
        }
    }

    /**
     * 比較兩個版本的圖形
     */
    async compareVersions(
        filePath: string,
        version1: string,
        version2: string
    ): Promise<GraphVersionDiff | null> {
        try {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
            if (!workspaceFolder) {
                return null;
            }

            const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);

            // 獲取兩個版本的檔案內容
            const { stdout: content1 } = await execAsync(
                `git show ${version1}:"${relativePath}"`,
                {
                    cwd: workspaceFolder.uri.fsPath,
                }
            );

            const { stdout: content2 } = await execAsync(
                `git show ${version2}:"${relativePath}"`,
                {
                    cwd: workspaceFolder.uri.fsPath,
                }
            );

            // 解析 JSON
            const graph1 = JSON.parse(content1);
            const graph2 = JSON.parse(content2);

            // 獲取版本資訊
            const { stdout: info1 } = await execAsync(
                `git show ${version1} --format="%H|%h|%s|%an|%ai" --no-patch`,
                {
                    cwd: workspaceFolder.uri.fsPath,
                }
            );

            const { stdout: info2 } = await execAsync(
                `git show ${version2} --format="%H|%h|%s|%an|%ai" --no-patch`,
                {
                    cwd: workspaceFolder.uri.fsPath,
                }
            );

            const [commit1, short1, msg1, author1, date1] = info1.trim().split('|');
            const [commit2, short2, msg2, author2, date2] = info2.trim().split('|');

            // 比較節點
            const nodes1 = new Set(graph1.nodes?.map((n: any) => n.id) || []);
            const nodes2 = new Set(graph2.nodes?.map((n: any) => n.id) || []);

            const nodesAdded = Array.from(nodes2).filter((id) => !nodes1.has(id)) as string[];
            const nodesRemoved = Array.from(nodes1).filter((id) => !nodes2.has(id)) as string[];

            // 找出修改的節點
            const nodesModified: string[] = [];
            const commonNodes = Array.from(nodes1).filter((id) => nodes2.has(id)) as string[];

            for (const nodeId of commonNodes) {
                const node1 = graph1.nodes.find((n: any) => n.id === nodeId);
                const node2 = graph2.nodes.find((n: any) => n.id === nodeId);

                if (JSON.stringify(node1) !== JSON.stringify(node2)) {
                    nodesModified.push(nodeId as string);
                }
            }

            // 比較邊
            const edges1 = new Set(
                graph1.edges?.map((e: any) => `${e.source}->${e.target}`) || []
            );
            const edges2 = new Set(
                graph2.edges?.map((e: any) => `${e.source}->${e.target}`) || []
            );

            const edgesAdded = Array.from(edges2).filter((id) => !edges1.has(id)) as string[];
            const edgesRemoved = Array.from(edges1).filter((id) => !edges2.has(id)) as string[];

            // 檢查 metadata 變更
            const metadataChanged = JSON.stringify(graph1.metadata) !== JSON.stringify(graph2.metadata);

            return {
                fromVersion: {
                    commit: commit1,
                    shortCommit: short1,
                    message: msg1,
                    author: author1,
                    date: date1,
                },
                toVersion: {
                    commit: commit2,
                    shortCommit: short2,
                    message: msg2,
                    author: author2,
                    date: date2,
                },
                nodesAdded,
                nodesRemoved,
                nodesModified,
                edgesAdded,
                edgesRemoved,
                metadataChanged,
            };
        } catch (error: any) {
            this.outputChannel.appendLine(`Failed to compare versions: ${error.message}`);
            vscode.window.showErrorMessage(`Failed to compare versions: ${error.message}`);
            return null;
        }
    }

    /**
     * 顯示版本比較結果
     */
    async showVersionComparison(diff: GraphVersionDiff, filePath: string): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'ramenVersionCompare',
            `Version Compare: ${path.basename(filePath)}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
            }
        );

        panel.webview.html = this.generateComparisonHtml(diff, filePath);
    }

    /**
     * 產生版本比較的 HTML
     */
    private generateComparisonHtml(diff: GraphVersionDiff, filePath: string): string {
        const totalChanges =
            diff.nodesAdded.length +
            diff.nodesRemoved.length +
            diff.nodesModified.length +
            diff.edgesAdded.length +
            diff.edgesRemoved.length +
            (diff.metadataChanged ? 1 : 0);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Version Comparison</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .version-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .version-card {
            background: var(--vscode-textBlockQuote-background);
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid var(--vscode-textLink-foreground);
        }
        .version-card h3 {
            margin-top: 0;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin: 20px 0;
        }
        .stat-card {
            background: var(--vscode-button-secondaryBackground);
            padding: 12px;
            border-radius: 6px;
            text-align: center;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .stat-label {
            font-size: 12px;
            opacity: 0.8;
        }
        .changes-section {
            margin: 20px 0;
        }
        .change-item {
            margin: 8px 0;
            padding: 8px 12px;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
        }
        .added { background: rgba(40, 167, 69, 0.2); color: #28a745; }
        .removed { background: rgba(220, 53, 69, 0.2); color: #dc3545; }
        .modified { background: rgba(255, 193, 7, 0.2); color: #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍜 Version Comparison</h1>
        <p><strong>File:</strong> ${path.basename(filePath)}</p>
    </div>

    <div class="version-info">
        <div class="version-card">
            <h3>📌 From Version</h3>
            <p><strong>Commit:</strong> ${diff.fromVersion.shortCommit}</p>
            <p><strong>Message:</strong> ${diff.fromVersion.message}</p>
            <p><strong>Author:</strong> ${diff.fromVersion.author}</p>
            <p><strong>Date:</strong> ${new Date(diff.fromVersion.date).toLocaleString()}</p>
            ${diff.fromVersion.tag ? `<p><strong>Tag:</strong> ${diff.fromVersion.tag}</p>` : ''}
        </div>

        <div class="version-card">
            <h3>📌 To Version</h3>
            <p><strong>Commit:</strong> ${diff.toVersion.shortCommit}</p>
            <p><strong>Message:</strong> ${diff.toVersion.message}</p>
            <p><strong>Author:</strong> ${diff.toVersion.author}</p>
            <p><strong>Date:</strong> ${new Date(diff.toVersion.date).toLocaleString()}</p>
            ${diff.toVersion.tag ? `<p><strong>Tag:</strong> ${diff.toVersion.tag}</p>` : ''}
        </div>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-number">${totalChanges}</div>
            <div class="stat-label">Total Changes</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${diff.nodesAdded.length}</div>
            <div class="stat-label">Nodes Added</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${diff.nodesRemoved.length}</div>
            <div class="stat-label">Nodes Removed</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${diff.nodesModified.length}</div>
            <div class="stat-label">Nodes Modified</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${diff.edgesAdded.length + diff.edgesRemoved.length}</div>
            <div class="stat-label">Edge Changes</div>
        </div>
    </div>

    <div class="changes-section">
        <h3>📋 Detailed Changes</h3>

        ${
            diff.nodesAdded.length > 0
                ? `
        <h4>➕ Nodes Added (${diff.nodesAdded.length})</h4>
        ${diff.nodesAdded.map((id) => `<div class="change-item added">+ ${id}</div>`).join('')}
        `
                : ''
        }

        ${
            diff.nodesRemoved.length > 0
                ? `
        <h4>➖ Nodes Removed (${diff.nodesRemoved.length})</h4>
        ${diff.nodesRemoved.map((id) => `<div class="change-item removed">- ${id}</div>`).join('')}
        `
                : ''
        }

        ${
            diff.nodesModified.length > 0
                ? `
        <h4>🔄 Nodes Modified (${diff.nodesModified.length})</h4>
        ${diff.nodesModified.map((id) => `<div class="change-item modified">~ ${id}</div>`).join('')}
        `
                : ''
        }

        ${
            diff.edgesAdded.length > 0
                ? `
        <h4>🔗 Edges Added (${diff.edgesAdded.length})</h4>
        ${diff.edgesAdded.map((id) => `<div class="change-item added">+ ${id}</div>`).join('')}
        `
                : ''
        }

        ${
            diff.edgesRemoved.length > 0
                ? `
        <h4>🔗 Edges Removed (${diff.edgesRemoved.length})</h4>
        ${diff.edgesRemoved.map((id) => `<div class="change-item removed">- ${id}</div>`).join('')}
        `
                : ''
        }

        ${
            diff.metadataChanged
                ? `
        <h4>📝 Metadata Changed</h4>
        <div class="change-item modified">~ Graph metadata has been modified</div>
        `
                : ''
        }
    </div>
</body>
</html>`;
    }

    /**
     * 檢出特定版本
     */
    async checkoutVersion(filePath: string, version: string): Promise<boolean> {
        try {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
            if (!workspaceFolder) {
                return false;
            }

            const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);

            // 警告：會覆蓋當前變更
            const confirm = await vscode.window.showWarningMessage(
                `This will overwrite the current file with version ${version}. Continue?`,
                { modal: true },
                'Yes',
                'No'
            );

            if (confirm !== 'Yes') {
                return false;
            }

            // 檢出特定版本
            await execAsync(`git checkout ${version} -- "${relativePath}"`, {
                cwd: workspaceFolder.uri.fsPath,
            });

            this.outputChannel.appendLine(`✅ Checked out version: ${version}`);
            vscode.window.showInformationMessage(`Checked out version: ${version}`);
            return true;
        } catch (error: any) {
            this.outputChannel.appendLine(`Failed to checkout version: ${error.message}`);
            vscode.window.showErrorMessage(`Failed to checkout version: ${error.message}`);
            return false;
        }
    }

    /**
     * 清理資源
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}

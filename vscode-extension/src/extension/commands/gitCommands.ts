/**
 * Git 整合命令
 * 提供 .ramen 檔案的版本控制功能
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitDiffResult {
  fromVersion: string;
  toVersion: string;
  totalChanges: number;
  nodesAdded: Array<{ nodeId: string; changes: string[] }>;
  nodesRemoved: Array<{ nodeId: string; changes: string[] }>;
  nodesModified: Array<{ nodeId: string; changes: string[] }>;
  nodesMoved: Array<{ nodeId: string; changes: string[] }>;
  edgesAdded: Array<{ edgeId: string; changes: string[] }>;
  edgesRemoved: Array<{ edgeId: string; changes: string[] }>;
  edgesModified: Array<{ edgeId: string; changes: string[] }>;
  metadataChanges: string[];
}

export interface GitMergeResult {
  success: boolean;
  hasConflicts: boolean;
  autoMergedCount: number;
  manualRequiredCount: number;
  mergeSummary: string;
  baseVersion: string;
  leftVersion: string;
  rightVersion: string;
  conflicts: ConflictItem[];
  mergedGraph?: any;
}

export interface ConflictItem {
  conflictId: string;
  conflictType: string;
  elementId: string;
  elementType: string;
  description: string;
  leftData?: any;
  rightData?: any;
  baseData?: any;
  autoResolutionSuggestion?: string;
  autoResolutionConfidence?: number;
}

export class GitIntegrationService {
  private outputChannel: vscode.OutputChannel;
  private backendUrl: string;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Ramen Git');
    this.backendUrl = 'http://localhost:9001'; // 預設後端 URL
  }

  /**
   * 檢查是否在 Git repository 中
   */
  async isInGitRepository(workspaceUri: vscode.Uri): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', {
        cwd: workspaceUri.fsPath
      });
      return stdout.trim() === 'true';
    } catch {
      return false;
    }
  }

  /**
   * 獲取當前 Git 狀態
   */
  async getGitStatus(workspaceUri: vscode.Uri): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: workspaceUri.fsPath
      });
      return stdout.split('\n').filter(line => line.trim()).map(line => line.trim());
    } catch (error) {
      this.outputChannel.appendLine(`Git status error: ${error}`);
      return [];
    }
  }

  /**
   * 獲取 .ramen 檔案的 Git 差異
   */
  async getRamenFileDiff(
    filePath: string, 
    fromCommit: string = 'HEAD~1', 
    toCommit: string = 'HEAD'
  ): Promise<GitDiffResult | null> {
    try {
      // 獲取兩個版本的檔案內容
      const oldContent = await this.getFileContentAtCommit(filePath, fromCommit);
      const newContent = await this.getFileContentAtCommit(filePath, toCommit);

      if (!oldContent || !newContent) {
        return null;
      }

      // 調用後端 API 進行語義化差異比較
      const response = await fetch(`${this.backendUrl}/api/git/diff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldGraph: JSON.parse(oldContent),
          newGraph: JSON.parse(newContent),
          fromVersion: fromCommit,
          toVersion: toCommit
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.outputChannel.appendLine(`Diff error: ${error}`);
      return null;
    }
  }

  /**
   * 獲取指定 commit 的檔案內容
   */
  private async getFileContentAtCommit(filePath: string, commit: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`git show ${commit}:${filePath}`);
      return stdout;
    } catch (error) {
      // 檔案可能在該 commit 不存在
      return null;
    }
  }

  /**
   * 顯示圖形差異在 VSCode webview 中
   */
  async showGraphDiff(diffResult: GitDiffResult, filePath: string): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'ramenGitDiff',
      `Git Diff: ${path.basename(filePath)}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.generateDiffHtml(diffResult, filePath);
  }

  /**
   * 產生差異顯示的 HTML
   */
  private generateDiffHtml(diffResult: GitDiffResult, filePath: string): string {
    const changesHtml = this.generateChangesHtml(diffResult);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ramen Git Diff</title>
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
        .diff-summary {
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
            padding: 15px;
            margin: 15px 0;
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
        .added { background: var(--vscode-gitDecoration-addedResourceForeground, #28a745)20; }
        .removed { background: var(--vscode-gitDecoration-deletedResourceForeground, #dc3545)20; }
        .modified { background: var(--vscode-gitDecoration-modifiedResourceForeground, #ffc107)20; }
        .moved { background: var(--vscode-gitDecoration-renamedResourceForeground, #17a2b8)20; }
        .prefix {
            font-weight: bold;
            margin-right: 8px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin: 15px 0;
        }
        .stat-card {
            background: var(--vscode-button-secondaryBackground);
            padding: 10px;
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
    </style>
</head>
<body>
    <div class="header">
        <h1>🍜 Ramen Git Diff</h1>
        <p><strong>File:</strong> ${filePath}</p>
        <p><strong>Comparison:</strong> ${diffResult.fromVersion} → ${diffResult.toVersion}</p>
    </div>

    <div class="diff-summary">
        <h3>📊 Summary</h3>
        <p><strong>Total Changes:</strong> ${diffResult.totalChanges}</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-number">${diffResult.nodesAdded.length}</div>
            <div class="stat-label">Nodes Added</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${diffResult.nodesRemoved.length}</div>
            <div class="stat-label">Nodes Removed</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${diffResult.nodesModified.length}</div>
            <div class="stat-label">Nodes Modified</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${diffResult.nodesMoved.length}</div>
            <div class="stat-label">Nodes Moved</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${diffResult.edgesAdded.length + diffResult.edgesRemoved.length}</div>
            <div class="stat-label">Edge Changes</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${diffResult.metadataChanges.length}</div>
            <div class="stat-label">Metadata Changes</div>
        </div>
    </div>

    ${changesHtml}
</body>
</html>`;
  }

  /**
   * 產生變更詳情的 HTML
   */
  private generateChangesHtml(diffResult: GitDiffResult): string {
    let html = '<div class="changes-section"><h3>🔍 Detailed Changes</h3>';

    // 新增的節點
    if (diffResult.nodesAdded.length > 0) {
      html += '<h4>➕ Nodes Added</h4>';
      diffResult.nodesAdded.forEach(node => {
        html += `<div class="change-item added">
          <span class="prefix">+</span>${node.nodeId}: ${node.changes.join(', ')}
        </div>`;
      });
    }

    // 刪除的節點
    if (diffResult.nodesRemoved.length > 0) {
      html += '<h4>➖ Nodes Removed</h4>';
      diffResult.nodesRemoved.forEach(node => {
        html += `<div class="change-item removed">
          <span class="prefix">-</span>${node.nodeId}: ${node.changes.join(', ')}
        </div>`;
      });
    }

    // 修改的節點
    if (diffResult.nodesModified.length > 0) {
      html += '<h4>🔄 Nodes Modified</h4>';
      diffResult.nodesModified.forEach(node => {
        html += `<div class="change-item modified">
          <span class="prefix">~</span>${node.nodeId}: ${node.changes.join(', ')}
        </div>`;
      });
    }

    // 移動的節點
    if (diffResult.nodesMoved.length > 0) {
      html += '<h4>📍 Nodes Moved</h4>';
      diffResult.nodesMoved.forEach(node => {
        html += `<div class="change-item moved">
          <span class="prefix">→</span>${node.nodeId}: ${node.changes.join(', ')}
        </div>`;
      });
    }

    // 邊的變更
    if (diffResult.edgesAdded.length > 0 || diffResult.edgesRemoved.length > 0) {
      html += '<h4>🔗 Edge Changes</h4>';
      
      diffResult.edgesAdded.forEach(edge => {
        html += `<div class="change-item added">
          <span class="prefix">+</span>${edge.edgeId}: ${edge.changes.join(', ')}
        </div>`;
      });
      
      diffResult.edgesRemoved.forEach(edge => {
        html += `<div class="change-item removed">
          <span class="prefix">-</span>${edge.edgeId}: ${edge.changes.join(', ')}
        </div>`;
      });
    }

    // 元數據變更
    if (diffResult.metadataChanges.length > 0) {
      html += '<h4>📝 Metadata Changes</h4>';
      diffResult.metadataChanges.forEach(change => {
        html += `<div class="change-item modified">
          <span class="prefix">~</span>${change}
        </div>`;
      });
    }

    html += '</div>';
    return html;
  }

  /**
   * 執行三方合併
   */
  async performThreeWayMerge(filePath: string, baseCommit?: string, leftCommit?: string, rightCommit?: string): Promise<GitMergeResult | null> {
    try {
      // 獲取三個版本的檔案內容
      const baseContent = await this.getFileContentAtCommit(filePath, baseCommit || 'HEAD~2');
      const leftContent = await this.getFileContentAtCommit(filePath, leftCommit || 'HEAD~1');
      const rightContent = await this.getFileContentAtCommit(filePath, rightCommit || 'HEAD');

      if (!baseContent || !leftContent || !rightContent) {
        throw new Error('Unable to retrieve file content for all three versions');
      }

      // 解析圖形內容
      const baseGraph = JSON.parse(baseContent);
      const leftGraph = JSON.parse(leftContent);
      const rightGraph = JSON.parse(rightContent);

      // 呼叫後端 API 執行合併
      const response = await fetch(`${this.backendUrl}/git/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          baseGraph: baseGraph,
          leftGraph: leftGraph,
          rightGraph: rightGraph,
          baseVersion: baseCommit || 'base',
          leftVersion: leftCommit || 'ours',
          rightVersion: rightCommit || 'theirs'
        })
      });

      if (!response.ok) {
        throw new Error(`Merge API call failed: ${response.status}`);
      }

      const mergeResult: GitMergeResult = await response.json();
      return mergeResult;

    } catch (error) {
      this.outputChannel.appendLine(`Three-way merge failed: ${error}`);
      return null;
    }
  }

  /**
   * 顯示合併結果和衝突
   */
  async showMergeResult(mergeResult: GitMergeResult, filePath: string): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'ramenGitMerge',
      `Git Merge: ${path.basename(filePath)}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.generateMergeHtml(mergeResult, filePath);

    // 處理來自 webview 的訊息（衝突解決）
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.type) {
          case 'resolveConflict':
            this.resolveConflict(message.conflictId, message.resolution);
            break;
        }
      },
      undefined,
      []
    );
  }

  /**
   * 產生合併結果的 HTML
   */
  private generateMergeHtml(mergeResult: GitMergeResult, filePath: string): string {
    const conflictsHtml = this.generateConflictsHtml(mergeResult.conflicts);
    
    const statusColor = mergeResult.success ? '#28a745' : '#dc3545';
    const statusIcon = mergeResult.success ? '✅' : '⚠️';
    const statusText = mergeResult.success ? 'Merge Successful' : 'Conflicts Detected';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ramen Git Merge</title>
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
        .merge-status {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            background: var(--vscode-textBlockQuote-background);
            border-left: 4px solid ${statusColor};
        }
        .status-icon {
            font-size: 24px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 10px;
            margin: 15px 0;
        }
        .stat-card {
            background: var(--vscode-button-secondaryBackground);
            padding: 12px;
            border-radius: 6px;
            text-align: center;
        }
        .stat-number {
            font-size: 20px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .stat-label {
            font-size: 11px;
            opacity: 0.8;
        }
        .conflict-item {
            background: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
        }
        .conflict-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 10px;
        }
        .conflict-type {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
        }
        .resolution-buttons {
            display: flex;
            gap: 8px;
            margin-top: 10px;
        }
        .resolution-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            cursor: pointer;
            font-size: 12px;
        }
        .resolution-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .merge-summary {
            background: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 6px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
            white-space: pre-wrap;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍜 Ramen Git Merge</h1>
        <p><strong>File:</strong> ${filePath}</p>
        <p><strong>Merge:</strong> ${mergeResult.baseVersion} ← ${mergeResult.leftVersion} + ${mergeResult.rightVersion}</p>
    </div>

    <div class="merge-status">
        <span class="status-icon">${statusIcon}</span>
        <div>
            <h3 style="margin: 0; color: ${statusColor};">${statusText}</h3>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">
                ${mergeResult.hasConflicts ? 'Manual intervention required' : 'All changes merged automatically'}
            </p>
        </div>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-number">${mergeResult.autoMergedCount}</div>
            <div class="stat-label">Auto-merged</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${mergeResult.manualRequiredCount}</div>
            <div class="stat-label">Conflicts</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${mergeResult.conflicts.length}</div>
            <div class="stat-label">Total Items</div>
        </div>
    </div>

    <div class="merge-summary">
        <h3>📋 Merge Summary</h3>
        ${mergeResult.mergeSummary}
    </div>

    ${conflictsHtml}

    <script>
        const vscode = acquireVsCodeApi();
        
        function resolveConflict(conflictId, resolution) {
            vscode.postMessage({
                type: 'resolveConflict',
                conflictId: conflictId,
                resolution: resolution
            });
        }
    </script>
</body>
</html>`;
  }

  /**
   * 產生衝突詳情的 HTML
   */
  private generateConflictsHtml(conflicts: ConflictItem[]): string {
    if (conflicts.length === 0) {
      return '<div style="color: var(--vscode-testing-iconPassed); text-align: center; padding: 20px;">🎉 No conflicts found! All changes were merged automatically.</div>';
    }

    let html = '<div><h3>⚡ Conflicts Requiring Resolution</h3>';

    conflicts.forEach(conflict => {
      const suggestionHtml = conflict.autoResolutionSuggestion 
        ? `<p><strong>💡 Suggestion:</strong> ${conflict.autoResolutionSuggestion} (confidence: ${Math.round((conflict.autoResolutionConfidence || 0) * 100)}%)</p>`
        : '';

      html += `
        <div class="conflict-item">
          <div class="conflict-header">
            <h4>${conflict.elementId}</h4>
            <span class="conflict-type">${conflict.conflictType}</span>
          </div>
          <p>${conflict.description}</p>
          ${suggestionHtml}
          <div class="resolution-buttons">
            <button class="resolution-btn" onclick="resolveConflict('${conflict.conflictId}', 'keep_left')">Keep Ours</button>
            <button class="resolution-btn" onclick="resolveConflict('${conflict.conflictId}', 'keep_right')">Keep Theirs</button>
            <button class="resolution-btn" onclick="resolveConflict('${conflict.conflictId}', 'keep_both')">Keep Both</button>
            <button class="resolution-btn" onclick="resolveConflict('${conflict.conflictId}', 'manual')">Manual Edit</button>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * 解決特定衝突
   */
  private async resolveConflict(conflictId: string, resolution: string): Promise<void> {
    try {
      const response = await fetch(`${this.backendUrl}/git/resolve-conflict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conflictId: conflictId,
          resolution: resolution
        })
      });

      if (!response.ok) {
        throw new Error(`Conflict resolution failed: ${response.status}`);
      }

      const result = await response.json();
      vscode.window.showInformationMessage(`Conflict ${conflictId} resolved with strategy: ${result.resolution}`);

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to resolve conflict: ${error}`);
    }
  }

  /**
   * 清理資源
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}

/**
 * 註冊 Git 整合命令
 */
export function registerGitCommands(context: vscode.ExtensionContext): void {
  const gitService = new GitIntegrationService();

  // ramen.git.diff 命令：顯示 .ramen 檔案的語義化差異
  const gitDiffCommand = vscode.commands.registerCommand('ramen.git.diff', async (uri?: vscode.Uri) => {
    try {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetUri) {
        vscode.window.showErrorMessage('No file selected for Git diff');
        return;
      }

      // 檢查是否為 .ramen 檔案
      if (!targetUri.fsPath.endsWith('.ramen')) {
        vscode.window.showErrorMessage('Git diff is only available for .ramen files');
        return;
      }

      // 檢查是否在 Git repository 中
      const workspaceUri = vscode.workspace.getWorkspaceFolder(targetUri)?.uri;
      if (!workspaceUri || !await gitService.isInGitRepository(workspaceUri)) {
        vscode.window.showErrorMessage('File is not in a Git repository');
        return;
      }

      vscode.window.showInformationMessage('Analyzing graph diff...');

      // 獲取相對路徑
      const relativePath = path.relative(workspaceUri.fsPath, targetUri.fsPath);
      
      // 執行差異分析
      const diffResult = await gitService.getRamenFileDiff(relativePath);
      if (!diffResult) {
        vscode.window.showWarningMessage('Unable to compute diff or no changes found');
        return;
      }

      // 顯示差異結果
      await gitService.showGraphDiff(diffResult, relativePath);
      
    } catch (error) {
      vscode.window.showErrorMessage(`Git diff failed: ${error}`);
    }
  });

  // ramen.git.status 命令：顯示 Git 狀態中的 .ramen 檔案
  const gitStatusCommand = vscode.commands.registerCommand('ramen.git.status', async () => {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const workspaceUri = workspaceFolders[0].uri;
      
      if (!await gitService.isInGitRepository(workspaceUri)) {
        vscode.window.showErrorMessage('Workspace is not in a Git repository');
        return;
      }

      const statusLines = await gitService.getGitStatus(workspaceUri);
      const ramenFiles = statusLines.filter(line => line.includes('.ramen'));

      if (ramenFiles.length === 0) {
        vscode.window.showInformationMessage('No .ramen files with Git changes');
        return;
      }

      // 顯示 .ramen 檔案的 Git 狀態
      const message = `Git status for .ramen files:\n${ramenFiles.join('\n')}`;
      vscode.window.showInformationMessage(message, { modal: true });

    } catch (error) {
      vscode.window.showErrorMessage(`Git status failed: ${error}`);
    }
  });

  // ramen.git.log 命令：顯示 .ramen 檔案的 Git 歷史
  const gitLogCommand = vscode.commands.registerCommand('ramen.git.log', async (uri?: vscode.Uri) => {
    try {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetUri) {
        vscode.window.showErrorMessage('No file selected for Git log');
        return;
      }

      if (!targetUri.fsPath.endsWith('.ramen')) {
        vscode.window.showErrorMessage('Git log is only available for .ramen files');
        return;
      }

      const workspaceUri = vscode.workspace.getWorkspaceFolder(targetUri)?.uri;
      if (!workspaceUri || !await gitService.isInGitRepository(workspaceUri)) {
        vscode.window.showErrorMessage('File is not in a Git repository');
        return;
      }

      // 獲取檔案的 Git 歷史
      const relativePath = path.relative(workspaceUri.fsPath, targetUri.fsPath);
      const { stdout } = await execAsync(`git log --oneline -10 -- "${relativePath}"`, {
        cwd: workspaceUri.fsPath
      });

      if (!stdout.trim()) {
        vscode.window.showInformationMessage('No Git history found for this file');
        return;
      }

      const commits = stdout.trim().split('\n');
      const message = `Recent commits for ${path.basename(targetUri.fsPath)}:\n${commits.join('\n')}`;
      
      vscode.window.showInformationMessage(message, { modal: true });

    } catch (error) {
      vscode.window.showErrorMessage(`Git log failed: ${error}`);
    }
  });

  // ramen.git.merge 命令：執行三方合併
  const gitMergeCommand = vscode.commands.registerCommand('ramen.git.merge', async (uri?: vscode.Uri) => {
    try {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetUri) {
        vscode.window.showErrorMessage('No file selected for Git merge');
        return;
      }

      if (!targetUri.fsPath.endsWith('.ramen')) {
        vscode.window.showErrorMessage('Git merge is only available for .ramen files');
        return;
      }

      const workspaceUri = vscode.workspace.getWorkspaceFolder(targetUri)?.uri;
      if (!workspaceUri || !await gitService.isInGitRepository(workspaceUri)) {
        vscode.window.showErrorMessage('File is not in a Git repository');
        return;
      }

      // 檢查是否有足夠的 commit 歷史
      const relativePath = path.relative(workspaceUri.fsPath, targetUri.fsPath);
      const { stdout } = await execAsync(`git log --oneline -3 -- "${relativePath}"`, {
        cwd: workspaceUri.fsPath
      });

      const commits = stdout.trim().split('\n');
      if (commits.length < 3) {
        vscode.window.showWarningMessage('Need at least 3 commits for three-way merge');
        return;
      }

      // 讓用戶選擇要合併的版本
      const baseCommit = await vscode.window.showQuickPick(
        commits.map(commit => ({ label: commit, description: 'Base version' })),
        { placeHolder: 'Select base version (common ancestor)' }
      );

      const leftCommit = await vscode.window.showQuickPick(
        commits.map(commit => ({ label: commit, description: 'Left version (ours)' })),
        { placeHolder: 'Select left version (ours)' }
      );

      const rightCommit = await vscode.window.showQuickPick(
        commits.map(commit => ({ label: commit, description: 'Right version (theirs)' })),
        { placeHolder: 'Select right version (theirs)' }
      );

      if (!baseCommit || !leftCommit || !rightCommit) {
        return;
      }

      vscode.window.showInformationMessage('Performing three-way merge...');

      // 執行合併
      const mergeResult = await gitService.performThreeWayMerge(
        relativePath,
        baseCommit.label.split(' ')[0], // 取 commit hash
        leftCommit.label.split(' ')[0],
        rightCommit.label.split(' ')[0]
      );

      if (!mergeResult) {
        vscode.window.showErrorMessage('Failed to perform three-way merge');
        return;
      }

      // 顯示合併結果
      await gitService.showMergeResult(mergeResult, relativePath);

    } catch (error) {
      vscode.window.showErrorMessage(`Git merge failed: ${error}`);
    }
  });

  // ramen.git.mergeHead 命令：快速合併最近的提交
  const gitMergeHeadCommand = vscode.commands.registerCommand('ramen.git.mergeHead', async (uri?: vscode.Uri) => {
    try {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetUri) {
        vscode.window.showErrorMessage('No file selected for Git merge');
        return;
      }

      if (!targetUri.fsPath.endsWith('.ramen')) {
        vscode.window.showErrorMessage('Git merge is only available for .ramen files');
        return;
      }

      const workspaceUri = vscode.workspace.getWorkspaceFolder(targetUri)?.uri;
      if (!workspaceUri || !await gitService.isInGitRepository(workspaceUri)) {
        vscode.window.showErrorMessage('File is not in a Git repository');
        return;
      }

      const relativePath = path.relative(workspaceUri.fsPath, targetUri.fsPath);
      
      vscode.window.showInformationMessage('Performing merge using HEAD~2, HEAD~1, HEAD...');

      // 使用最近的三個版本進行合併
      const mergeResult = await gitService.performThreeWayMerge(relativePath);

      if (!mergeResult) {
        vscode.window.showErrorMessage('Failed to perform merge - ensure file has sufficient commit history');
        return;
      }

      // 顯示合併結果
      await gitService.showMergeResult(mergeResult, relativePath);

    } catch (error) {
      vscode.window.showErrorMessage(`Git merge failed: ${error}`);
    }
  });

  // 註冊命令和清理函數
  context.subscriptions.push(gitDiffCommand);
  context.subscriptions.push(gitStatusCommand);
  context.subscriptions.push(gitLogCommand);
  context.subscriptions.push(gitMergeCommand);
  context.subscriptions.push(gitMergeHeadCommand);
  context.subscriptions.push(gitService);
}
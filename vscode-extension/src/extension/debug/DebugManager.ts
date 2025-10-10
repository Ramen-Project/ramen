/**
 * Debug Manager
 * 管理圖形執行的偵錯功能，包括即時視覺化、中斷點和錯誤追蹤
 */

import * as vscode from 'vscode';
import { ExtensionMessageType } from '../../shared/types/extension-messages';

/**
 * 節點執行狀態
 */
export enum NodeExecutionState {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    ERROR = 'error',
    SKIPPED = 'skipped',
}

/**
 * 節點執行資訊
 */
export interface NodeExecutionInfo {
    nodeId: string;
    state: NodeExecutionState;
    startTime?: number;
    endTime?: number;
    executionTime?: number;
    outputs?: Record<string, any>;
    error?: {
        message: string;
        stack?: string;
        type?: string;
    };
}

/**
 * 執行統計資訊
 */
export interface ExecutionStats {
    totalNodes: number;
    completedNodes: number;
    runningNodes: number;
    errorNodes: number;
    skippedNodes: number;
    totalExecutionTime: number;
    startTime: number;
    endTime?: number;
}

/**
 * 中斷點資訊
 */
export interface Breakpoint {
    nodeId: string;
    enabled: boolean;
    condition?: string; // 條件中斷點
    hitCount?: number;
}

/**
 * Debug Manager 類別
 */
export class DebugManager implements vscode.Disposable {
    private outputChannel: vscode.OutputChannel;
    private nodeExecutions: Map<string, NodeExecutionInfo> = new Map();
    private breakpoints: Map<string, Breakpoint> = new Map();
    private currentExecutionId?: string;
    private executionStats?: ExecutionStats;
    private isPaused = false;
    private stepMode: 'none' | 'into' | 'over' | 'out' = 'none';

    // Webview panels for node execution
    private webviewPanels: Map<string, vscode.WebviewPanel> = new Map();

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Ramen Debug');
    }

    /**
     * 開始新的執行追蹤
     */
    startExecution(executionId: string, totalNodes: number): void {
        this.currentExecutionId = executionId;
        this.nodeExecutions.clear();
        this.executionStats = {
            totalNodes,
            completedNodes: 0,
            runningNodes: 0,
            errorNodes: 0,
            skippedNodes: 0,
            totalExecutionTime: 0,
            startTime: Date.now(),
        };

        this.outputChannel.appendLine(`\n🍜 [Debug] Execution started: ${executionId}`);
        this.outputChannel.appendLine(`   Total nodes: ${totalNodes}`);
        this.outputChannel.show(true);
    }

    /**
     * 更新節點執行狀態
     */
    updateNodeExecution(nodeInfo: NodeExecutionInfo): void {
        const previousInfo = this.nodeExecutions.get(nodeInfo.nodeId);
        this.nodeExecutions.set(nodeInfo.nodeId, nodeInfo);

        // 更新統計
        if (this.executionStats) {
            // 減少舊狀態計數
            if (previousInfo) {
                this.decrementStateCount(previousInfo.state);
            }

            // 增加新狀態計數
            this.incrementStateCount(nodeInfo.state);

            // 計算執行時間
            if (nodeInfo.executionTime) {
                this.executionStats.totalExecutionTime += nodeInfo.executionTime;
            }
        }

        // 記錄到 output channel
        this.logNodeExecution(nodeInfo);

        // 檢查中斷點
        if (nodeInfo.state === NodeExecutionState.RUNNING) {
            this.checkBreakpoint(nodeInfo.nodeId);
        }
    }

    /**
     * 完成執行
     */
    completeExecution(): void {
        if (this.executionStats) {
            this.executionStats.endTime = Date.now();
            const totalTime = this.executionStats.endTime - this.executionStats.startTime;

            this.outputChannel.appendLine(`\n✅ [Debug] Execution completed`);
            this.outputChannel.appendLine(`   Total time: ${totalTime}ms`);
            this.outputChannel.appendLine(`   Completed nodes: ${this.executionStats.completedNodes}`);
            this.outputChannel.appendLine(`   Error nodes: ${this.executionStats.errorNodes}`);

            // 顯示執行摘要
            this.showExecutionSummary();
        }

        this.currentExecutionId = undefined;
    }

    /**
     * 執行失敗
     */
    failExecution(error: string): void {
        this.outputChannel.appendLine(`\n❌ [Debug] Execution failed: ${error}`);
        this.currentExecutionId = undefined;
    }

    /**
     * 設定中斷點
     */
    setBreakpoint(nodeId: string, condition?: string): void {
        this.breakpoints.set(nodeId, {
            nodeId,
            enabled: true,
            condition,
            hitCount: 0,
        });

        this.outputChannel.appendLine(
            `🔴 [Debug] Breakpoint set on node: ${nodeId}${condition ? ` (condition: ${condition})` : ''}`
        );
    }

    /**
     * 移除中斷點
     */
    removeBreakpoint(nodeId: string): void {
        this.breakpoints.delete(nodeId);
        this.outputChannel.appendLine(`⚪ [Debug] Breakpoint removed from node: ${nodeId}`);
    }

    /**
     * 切換中斷點
     */
    toggleBreakpoint(nodeId: string): void {
        const breakpoint = this.breakpoints.get(nodeId);
        if (breakpoint) {
            this.removeBreakpoint(nodeId);
        } else {
            this.setBreakpoint(nodeId);
        }
    }

    /**
     * 檢查中斷點
     */
    private checkBreakpoint(nodeId: string): void {
        const breakpoint = this.breakpoints.get(nodeId);
        if (!breakpoint || !breakpoint.enabled) {
            return;
        }

        // 更新命中次數
        if (breakpoint.hitCount !== undefined) {
            breakpoint.hitCount++;
        }

        // 檢查條件
        if (breakpoint.condition) {
            // TODO: 評估條件表達式
            // 現在先暫停
        }

        // 暫停執行
        this.pauseExecution(nodeId);
    }

    /**
     * 暫停執行
     */
    pauseExecution(nodeId: string): void {
        this.isPaused = true;
        this.outputChannel.appendLine(`⏸️  [Debug] Execution paused at node: ${nodeId}`);

        // 顯示暫停通知
        vscode.window
            .showInformationMessage(
                `Execution paused at node: ${nodeId}`,
                'Continue',
                'Step Over',
                'Step Into',
                'Stop'
            )
            .then((choice) => {
                switch (choice) {
                    case 'Continue':
                        this.continueExecution();
                        break;
                    case 'Step Over':
                        this.stepOver();
                        break;
                    case 'Step Into':
                        this.stepInto();
                        break;
                    case 'Stop':
                        this.stopExecution();
                        break;
                }
            });
    }

    /**
     * 繼續執行
     */
    continueExecution(): void {
        this.isPaused = false;
        this.stepMode = 'none';
        this.outputChannel.appendLine('▶️  [Debug] Execution continued');
    }

    /**
     * 單步執行（跳過）
     */
    stepOver(): void {
        this.isPaused = false;
        this.stepMode = 'over';
        this.outputChannel.appendLine('⏭️  [Debug] Step over');
    }

    /**
     * 單步執行（進入）
     */
    stepInto(): void {
        this.isPaused = false;
        this.stepMode = 'into';
        this.outputChannel.appendLine('⤵️  [Debug] Step into');
    }

    /**
     * 停止執行
     */
    stopExecution(): void {
        this.isPaused = false;
        this.stepMode = 'none';
        this.outputChannel.appendLine('⏹️  [Debug] Execution stopped');
        // TODO: 發送停止訊息到後端
    }

    /**
     * 獲取節點執行資訊
     */
    getNodeExecutionInfo(nodeId: string): NodeExecutionInfo | undefined {
        return this.nodeExecutions.get(nodeId);
    }

    /**
     * 獲取所有中斷點
     */
    getBreakpoints(): Breakpoint[] {
        return Array.from(this.breakpoints.values());
    }

    /**
     * 獲取執行統計
     */
    getExecutionStats(): ExecutionStats | undefined {
        return this.executionStats;
    }

    /**
     * 是否暫停中
     */
    isPausedState(): boolean {
        return this.isPaused;
    }

    /**
     * 記錄節點執行
     */
    private logNodeExecution(nodeInfo: NodeExecutionInfo): void {
        const stateEmoji = {
            [NodeExecutionState.PENDING]: '⏳',
            [NodeExecutionState.RUNNING]: '▶️ ',
            [NodeExecutionState.COMPLETED]: '✅',
            [NodeExecutionState.ERROR]: '❌',
            [NodeExecutionState.SKIPPED]: '⏭️ ',
        };

        const emoji = stateEmoji[nodeInfo.state];
        const time = nodeInfo.executionTime ? ` (${nodeInfo.executionTime.toFixed(2)}ms)` : '';

        this.outputChannel.appendLine(`${emoji} [${nodeInfo.state}] ${nodeInfo.nodeId}${time}`);

        if (nodeInfo.error) {
            this.outputChannel.appendLine(`   Error: ${nodeInfo.error.message}`);
            if (nodeInfo.error.stack) {
                this.outputChannel.appendLine(`   Stack: ${nodeInfo.error.stack}`);
            }
        }
    }

    /**
     * 增加狀態計數
     */
    private incrementStateCount(state: NodeExecutionState): void {
        if (!this.executionStats) return;

        switch (state) {
            case NodeExecutionState.RUNNING:
                this.executionStats.runningNodes++;
                break;
            case NodeExecutionState.COMPLETED:
                this.executionStats.completedNodes++;
                break;
            case NodeExecutionState.ERROR:
                this.executionStats.errorNodes++;
                break;
            case NodeExecutionState.SKIPPED:
                this.executionStats.skippedNodes++;
                break;
        }
    }

    /**
     * 減少狀態計數
     */
    private decrementStateCount(state: NodeExecutionState): void {
        if (!this.executionStats) return;

        switch (state) {
            case NodeExecutionState.RUNNING:
                this.executionStats.runningNodes--;
                break;
            case NodeExecutionState.COMPLETED:
                this.executionStats.completedNodes--;
                break;
            case NodeExecutionState.ERROR:
                this.executionStats.errorNodes--;
                break;
            case NodeExecutionState.SKIPPED:
                this.executionStats.skippedNodes--;
                break;
        }
    }

    /**
     * 顯示執行摘要
     */
    private showExecutionSummary(): void {
        if (!this.executionStats) return;

        const stats = this.executionStats;
        const totalTime = stats.endTime
            ? stats.endTime - stats.startTime
            : Date.now() - stats.startTime;

        const message = [
            '📊 Execution Summary',
            '',
            `Total Nodes: ${stats.totalNodes}`,
            `✅ Completed: ${stats.completedNodes}`,
            `❌ Errors: ${stats.errorNodes}`,
            `⏭️  Skipped: ${stats.skippedNodes}`,
            '',
            `⏱️  Total Time: ${totalTime}ms`,
            `⚡ Avg Time per Node: ${stats.completedNodes > 0 ? (stats.totalExecutionTime / stats.completedNodes).toFixed(2) : 0}ms`,
        ].join('\n');

        vscode.window.showInformationMessage(message, { modal: true });
    }

    /**
     * 顯示節點變數值
     */
    async showNodeVariables(nodeId: string): Promise<void> {
        const nodeInfo = this.nodeExecutions.get(nodeId);

        if (!nodeInfo) {
            vscode.window.showWarningMessage(`Node ${nodeId} has not been executed`);
            return;
        }

        if (!nodeInfo.outputs) {
            vscode.window.showInformationMessage(`Node ${nodeId} has no outputs`);
            return;
        }

        // 創建 webview 顯示變數
        const panel = vscode.window.createWebviewPanel(
            'ramenNodeVariables',
            `Variables: ${nodeId}`,
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
            }
        );

        panel.webview.html = this.generateVariablesHtml(nodeId, nodeInfo);
        this.webviewPanels.set(nodeId, panel);

        panel.onDidDispose(() => {
            this.webviewPanels.delete(nodeId);
        });
    }

    /**
     * 產生變數顯示的 HTML
     */
    private generateVariablesHtml(nodeId: string, nodeInfo: NodeExecutionInfo): string {
        const outputsJson = JSON.stringify(nodeInfo.outputs, null, 2);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Node Variables</title>
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
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .outputs {
            background: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 6px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        .execution-time {
            margin-top: 10px;
            opacity: 0.8;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍜 Node Variables</h1>
        <p><strong>Node ID:</strong> ${nodeId}</p>
        <p><strong>Status:</strong> <span class="status">${nodeInfo.state}</span></p>
        ${nodeInfo.executionTime ? `<p class="execution-time"><strong>Execution Time:</strong> ${nodeInfo.executionTime.toFixed(2)}ms</p>` : ''}
    </div>

    <h3>Outputs:</h3>
    <div class="outputs">${outputsJson}</div>

    ${
        nodeInfo.error
            ? `
    <h3>Error:</h3>
    <div class="outputs" style="border-left: 4px solid var(--vscode-errorForeground);">
        ${nodeInfo.error.message}
        ${nodeInfo.error.stack ? `\n\nStack trace:\n${nodeInfo.error.stack}` : ''}
    </div>
    `
            : ''
    }
</body>
</html>`;
    }

    /**
     * 清理資源
     */
    dispose(): void {
        this.outputChannel.dispose();

        // 關閉所有 webview panels
        for (const panel of this.webviewPanels.values()) {
            panel.dispose();
        }
        this.webviewPanels.clear();
    }
}

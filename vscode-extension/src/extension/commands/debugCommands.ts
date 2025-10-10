/**
 * Debug 相關命令
 * 提供偵錯功能的命令處理
 */

import * as vscode from 'vscode';
import { DebugManager } from '../debug/DebugManager';

/**
 * 註冊 Debug 相關命令
 */
export function registerDebugCommands(
    context: vscode.ExtensionContext,
    debugManager: DebugManager
): void {
    // ramen.debug.toggleBreakpoint 命令：切換中斷點
    const toggleBreakpointCommand = vscode.commands.registerCommand(
        'ramen.debug.toggleBreakpoint',
        async () => {
            const nodeId = await vscode.window.showInputBox({
                prompt: 'Enter node ID to toggle breakpoint',
                placeHolder: 'node_id',
            });

            if (nodeId) {
                debugManager.toggleBreakpoint(nodeId);
                vscode.window.showInformationMessage(`Breakpoint toggled for node: ${nodeId}`);
            }
        }
    );

    // ramen.debug.setConditionalBreakpoint 命令：設定條件中斷點
    const setConditionalBreakpointCommand = vscode.commands.registerCommand(
        'ramen.debug.setConditionalBreakpoint',
        async () => {
            const nodeId = await vscode.window.showInputBox({
                prompt: 'Enter node ID',
                placeHolder: 'node_id',
            });

            if (!nodeId) return;

            const condition = await vscode.window.showInputBox({
                prompt: 'Enter breakpoint condition',
                placeHolder: 'e.g., output > 10',
            });

            debugManager.setBreakpoint(nodeId, condition);
            vscode.window.showInformationMessage(
                `Conditional breakpoint set for node: ${nodeId}`
            );
        }
    );

    // ramen.debug.removeAllBreakpoints 命令：移除所有中斷點
    const removeAllBreakpointsCommand = vscode.commands.registerCommand(
        'ramen.debug.removeAllBreakpoints',
        async () => {
            const breakpoints = debugManager.getBreakpoints();

            if (breakpoints.length === 0) {
                vscode.window.showInformationMessage('No breakpoints to remove');
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Remove all ${breakpoints.length} breakpoints?`,
                { modal: true },
                'Yes',
                'No'
            );

            if (confirm === 'Yes') {
                for (const bp of breakpoints) {
                    debugManager.removeBreakpoint(bp.nodeId);
                }
                vscode.window.showInformationMessage('All breakpoints removed');
            }
        }
    );

    // ramen.debug.listBreakpoints 命令：列出所有中斷點
    const listBreakpointsCommand = vscode.commands.registerCommand(
        'ramen.debug.listBreakpoints',
        async () => {
            const breakpoints = debugManager.getBreakpoints();

            if (breakpoints.length === 0) {
                vscode.window.showInformationMessage('No breakpoints set');
                return;
            }

            const items = breakpoints.map((bp) => ({
                label: bp.nodeId,
                description: bp.enabled ? 'Enabled' : 'Disabled',
                detail: bp.condition ? `Condition: ${bp.condition}` : undefined,
                breakpoint: bp,
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a breakpoint to view details',
            });

            if (selected) {
                const actions = ['Remove', 'Toggle Enable/Disable', 'Close'];
                const choice = await vscode.window.showQuickPick(actions, {
                    placeHolder: `Actions for breakpoint: ${selected.breakpoint.nodeId}`,
                });

                if (choice === 'Remove') {
                    debugManager.removeBreakpoint(selected.breakpoint.nodeId);
                    vscode.window.showInformationMessage(
                        `Breakpoint removed: ${selected.breakpoint.nodeId}`
                    );
                } else if (choice === 'Toggle Enable/Disable') {
                    // TODO: Implement enable/disable
                    vscode.window.showInformationMessage('Toggle not yet implemented');
                }
            }
        }
    );

    // ramen.debug.continue 命令：繼續執行
    const continueCommand = vscode.commands.registerCommand('ramen.debug.continue', () => {
        debugManager.continueExecution();
        vscode.window.showInformationMessage('Execution continued');
    });

    // ramen.debug.stepOver 命令：單步跳過
    const stepOverCommand = vscode.commands.registerCommand('ramen.debug.stepOver', () => {
        debugManager.stepOver();
        vscode.window.showInformationMessage('Step over');
    });

    // ramen.debug.stepInto 命令：單步進入
    const stepIntoCommand = vscode.commands.registerCommand('ramen.debug.stepInto', () => {
        debugManager.stepInto();
        vscode.window.showInformationMessage('Step into');
    });

    // ramen.debug.stop 命令：停止執行
    const stopCommand = vscode.commands.registerCommand('ramen.debug.stop', () => {
        debugManager.stopExecution();
        vscode.window.showInformationMessage('Execution stopped');
    });

    // ramen.debug.showExecutionStats 命令：顯示執行統計
    const showStatsCommand = vscode.commands.registerCommand(
        'ramen.debug.showExecutionStats',
        () => {
            const stats = debugManager.getExecutionStats();

            if (!stats) {
                vscode.window.showInformationMessage('No execution in progress');
                return;
            }

            const totalTime = stats.endTime
                ? stats.endTime - stats.startTime
                : Date.now() - stats.startTime;
            const avgTime =
                stats.completedNodes > 0
                    ? (stats.totalExecutionTime / stats.completedNodes).toFixed(2)
                    : '0';

            const message = [
                '📊 Execution Statistics',
                '',
                `Total Nodes: ${stats.totalNodes}`,
                `✅ Completed: ${stats.completedNodes}`,
                `▶️  Running: ${stats.runningNodes}`,
                `❌ Errors: ${stats.errorNodes}`,
                `⏭️  Skipped: ${stats.skippedNodes}`,
                '',
                `⏱️  Total Time: ${totalTime}ms`,
                `⚡ Avg Time: ${avgTime}ms per node`,
            ].join('\n');

            vscode.window.showInformationMessage(message, { modal: true });
        }
    );

    // ramen.debug.showNodeVariables 命令：顯示節點變數
    const showVariablesCommand = vscode.commands.registerCommand(
        'ramen.debug.showNodeVariables',
        async () => {
            const nodeId = await vscode.window.showInputBox({
                prompt: 'Enter node ID to view variables',
                placeHolder: 'node_id',
            });

            if (nodeId) {
                await debugManager.showNodeVariables(nodeId);
            }
        }
    );

    // ramen.debug.inspectNodeExecution 命令：檢視節點執行資訊
    const inspectNodeCommand = vscode.commands.registerCommand(
        'ramen.debug.inspectNodeExecution',
        async () => {
            const nodeId = await vscode.window.showInputBox({
                prompt: 'Enter node ID to inspect',
                placeHolder: 'node_id',
            });

            if (!nodeId) return;

            const nodeInfo = debugManager.getNodeExecutionInfo(nodeId);

            if (!nodeInfo) {
                vscode.window.showWarningMessage(`Node ${nodeId} has not been executed`);
                return;
            }

            const message = [
                `📦 Node: ${nodeInfo.nodeId}`,
                '',
                `Status: ${nodeInfo.state}`,
                nodeInfo.executionTime
                    ? `Execution Time: ${nodeInfo.executionTime.toFixed(2)}ms`
                    : '',
                nodeInfo.startTime ? `Start: ${new Date(nodeInfo.startTime).toISOString()}` : '',
                nodeInfo.endTime ? `End: ${new Date(nodeInfo.endTime).toISOString()}` : '',
                '',
                nodeInfo.error ? `Error: ${nodeInfo.error.message}` : '',
            ]
                .filter(Boolean)
                .join('\n');

            const choice = await vscode.window.showInformationMessage(
                message,
                { modal: true },
                'View Variables',
                'Close'
            );

            if (choice === 'View Variables') {
                await debugManager.showNodeVariables(nodeId);
            }
        }
    );

    // 註冊所有命令
    context.subscriptions.push(toggleBreakpointCommand);
    context.subscriptions.push(setConditionalBreakpointCommand);
    context.subscriptions.push(removeAllBreakpointsCommand);
    context.subscriptions.push(listBreakpointsCommand);
    context.subscriptions.push(continueCommand);
    context.subscriptions.push(stepOverCommand);
    context.subscriptions.push(stepIntoCommand);
    context.subscriptions.push(stopCommand);
    context.subscriptions.push(showStatsCommand);
    context.subscriptions.push(showVariablesCommand);
    context.subscriptions.push(inspectNodeCommand);
}

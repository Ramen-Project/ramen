/**
 * 版本控制命令
 * 提供圖形檔案的版本管理功能
 */

import * as vscode from 'vscode';
import { GitVersionControl } from '../git/GitVersionControl';
import * as path from 'path';

/**
 * 註冊版本控制命令
 */
export function registerVersionCommands(
    context: vscode.ExtensionContext,
    versionControl: GitVersionControl
): void {
    // ramen.version.createTag 命令：建立版本標籤
    const createTagCommand = vscode.commands.registerCommand(
        'ramen.version.createTag',
        async (uri?: vscode.Uri) => {
            try {
                const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
                if (!targetUri || !targetUri.fsPath.endsWith('.ramen')) {
                    vscode.window.showErrorMessage('Please select a .ramen file');
                    return;
                }

                // 輸入版本號
                const version = await vscode.window.showInputBox({
                    prompt: 'Enter version number (e.g., 1.0.0, 2.1.3)',
                    placeHolder: '1.0.0',
                    validateInput: (value) => {
                        if (!value) return 'Version number is required';
                        if (!/^\d+\.\d+\.\d+$/.test(value)) {
                            return 'Version must be in format x.y.z (e.g., 1.0.0)';
                        }
                        return null;
                    },
                });

                if (!version) return;

                // 輸入版本訊息
                const message = await vscode.window.showInputBox({
                    prompt: 'Enter version message (optional)',
                    placeHolder: 'What changed in this version?',
                });

                // 建立標籤
                await versionControl.createVersionTag(targetUri.fsPath, version, message);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create version tag: ${error}`);
            }
        }
    );

    // ramen.version.listTags 命令：列出版本標籤
    const listTagsCommand = vscode.commands.registerCommand(
        'ramen.version.listTags',
        async (uri?: vscode.Uri) => {
            try {
                const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
                if (!targetUri || !targetUri.fsPath.endsWith('.ramen')) {
                    vscode.window.showErrorMessage('Please select a .ramen file');
                    return;
                }

                const versions = await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Loading versions...',
                        cancellable: false,
                    },
                    async () => {
                        return await versionControl.listVersionTags(targetUri.fsPath);
                    }
                );

                if (versions.length === 0) {
                    vscode.window.showInformationMessage('No version tags found for this file');
                    return;
                }

                // 顯示版本列表
                const items = versions.map((v) => ({
                    label: v.tag || v.shortCommit,
                    description: v.message,
                    detail: `${v.author} • ${new Date(v.date).toLocaleDateString()}`,
                    version: v,
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a version',
                    matchOnDescription: true,
                    matchOnDetail: true,
                });

                if (selected) {
                    // 顯示版本操作選單
                    const actions = ['Compare with Current', 'Checkout This Version', 'View Info', 'Close'];
                    const action = await vscode.window.showQuickPick(actions, {
                        placeHolder: `Actions for version: ${selected.label}`,
                    });

                    if (action === 'Compare with Current') {
                        await versionControl.compareVersions(
                            targetUri.fsPath,
                            selected.version.commit,
                            'HEAD'
                        ).then((diff) => {
                            if (diff) {
                                versionControl.showVersionComparison(diff, targetUri.fsPath);
                            }
                        });
                    } else if (action === 'Checkout This Version') {
                        await versionControl.checkoutVersion(
                            targetUri.fsPath,
                            selected.version.commit
                        );
                    } else if (action === 'View Info') {
                        const info = [
                            `Tag: ${selected.version.tag || 'N/A'}`,
                            `Commit: ${selected.version.shortCommit}`,
                            `Message: ${selected.version.message}`,
                            `Author: ${selected.version.author}`,
                            `Date: ${new Date(selected.version.date).toLocaleString()}`,
                        ].join('\n');

                        vscode.window.showInformationMessage(info, { modal: true });
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to list version tags: ${error}`);
            }
        }
    );

    // ramen.version.compareVersions 命令：比較兩個版本
    const compareVersionsCommand = vscode.commands.registerCommand(
        'ramen.version.compareVersions',
        async (uri?: vscode.Uri) => {
            try {
                const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
                if (!targetUri || !targetUri.fsPath.endsWith('.ramen')) {
                    vscode.window.showErrorMessage('Please select a .ramen file');
                    return;
                }

                const versions = await versionControl.listVersionTags(targetUri.fsPath);

                if (versions.length < 2) {
                    vscode.window.showInformationMessage('At least 2 versions are required for comparison');
                    return;
                }

                // 選擇第一個版本
                const items1 = versions.map((v) => ({
                    label: v.tag || v.shortCommit,
                    description: v.message,
                    detail: new Date(v.date).toLocaleDateString(),
                    version: v,
                }));

                const version1 = await vscode.window.showQuickPick(items1, {
                    placeHolder: 'Select first version (older)',
                });

                if (!version1) return;

                // 選擇第二個版本
                const items2 = versions
                    .filter((v) => v.commit !== version1.version.commit)
                    .map((v) => ({
                        label: v.tag || v.shortCommit,
                        description: v.message,
                        detail: new Date(v.date).toLocaleDateString(),
                        version: v,
                    }));

                const version2 = await vscode.window.showQuickPick(items2, {
                    placeHolder: 'Select second version (newer)',
                });

                if (!version2) return;

                // 比較版本
                const diff = await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Comparing versions...',
                        cancellable: false,
                    },
                    async () => {
                        return await versionControl.compareVersions(
                            targetUri.fsPath,
                            version1.version.commit,
                            version2.version.commit
                        );
                    }
                );

                if (diff) {
                    await versionControl.showVersionComparison(diff, targetUri.fsPath);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to compare versions: ${error}`);
            }
        }
    );

    // ramen.version.compareWithCurrent 命令：與當前版本比較
    const compareWithCurrentCommand = vscode.commands.registerCommand(
        'ramen.version.compareWithCurrent',
        async (uri?: vscode.Uri) => {
            try {
                const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
                if (!targetUri || !targetUri.fsPath.endsWith('.ramen')) {
                    vscode.window.showErrorMessage('Please select a .ramen file');
                    return;
                }

                const versions = await versionControl.listVersionTags(targetUri.fsPath);

                if (versions.length === 0) {
                    vscode.window.showInformationMessage('No version tags found');
                    return;
                }

                // 選擇版本
                const items = versions.map((v) => ({
                    label: v.tag || v.shortCommit,
                    description: v.message,
                    detail: new Date(v.date).toLocaleDateString(),
                    version: v,
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a version to compare with current',
                });

                if (!selected) return;

                // 與 HEAD 比較
                const diff = await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Comparing with current version...',
                        cancellable: false,
                    },
                    async () => {
                        return await versionControl.compareVersions(
                            targetUri.fsPath,
                            selected.version.commit,
                            'HEAD'
                        );
                    }
                );

                if (diff) {
                    await versionControl.showVersionComparison(diff, targetUri.fsPath);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to compare with current: ${error}`);
            }
        }
    );

    // ramen.version.checkoutVersion 命令：檢出特定版本
    const checkoutVersionCommand = vscode.commands.registerCommand(
        'ramen.version.checkoutVersion',
        async (uri?: vscode.Uri) => {
            try {
                const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
                if (!targetUri || !targetUri.fsPath.endsWith('.ramen')) {
                    vscode.window.showErrorMessage('Please select a .ramen file');
                    return;
                }

                const versions = await versionControl.listVersionTags(targetUri.fsPath);

                if (versions.length === 0) {
                    vscode.window.showInformationMessage('No version tags found');
                    return;
                }

                // 選擇版本
                const items = versions.map((v) => ({
                    label: v.tag || v.shortCommit,
                    description: v.message,
                    detail: `${v.author} • ${new Date(v.date).toLocaleDateString()}`,
                    version: v,
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a version to checkout',
                });

                if (!selected) return;

                await versionControl.checkoutVersion(targetUri.fsPath, selected.version.commit);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to checkout version: ${error}`);
            }
        }
    );

    // 註冊所有命令
    context.subscriptions.push(createTagCommand);
    context.subscriptions.push(listTagsCommand);
    context.subscriptions.push(compareVersionsCommand);
    context.subscriptions.push(compareWithCurrentCommand);
    context.subscriptions.push(checkoutVersionCommand);
}

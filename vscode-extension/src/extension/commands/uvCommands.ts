/**
 * UV Package Manager 命令
 * 提供 topping 管理和環境管理功能
 */

import * as vscode from 'vscode';
import { UVPackageManager, ToppingInfo } from '../uv/UVPackageManager';

/**
 * 註冊 UV 相關命令
 */
export function registerUVCommands(
    context: vscode.ExtensionContext,
    uvManager: UVPackageManager
): void {
    // ramen.uv.showEnvironmentInfo 命令：顯示 Python 環境資訊
    const showEnvInfoCommand = vscode.commands.registerCommand(
        'ramen.uv.showEnvironmentInfo',
        async () => {
            try {
                const envInfo = await uvManager.getPythonEnvironmentInfo();

                if (!envInfo) {
                    vscode.window.showWarningMessage('No Python environment found');
                    return;
                }

                const infoLines = [
                    '🍜 Ramen Python Environment',
                    '',
                    `Python: ${envInfo.pythonVersion}`,
                    `Path: ${envInfo.pythonPath}`,
                ];

                if (envInfo.virtualEnvPath) {
                    infoLines.push(`Virtual Environment: ${envInfo.virtualEnvPath}`);
                }

                if (envInfo.uvVersion) {
                    infoLines.push(`UV: ${envInfo.uvVersion}`);
                } else {
                    infoLines.push('UV: Not available');
                }

                if (envInfo.ramenVersion) {
                    infoLines.push(`Ramen: ${envInfo.ramenVersion}`);
                }

                vscode.window.showInformationMessage(infoLines.join('\n'), { modal: true });
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to get environment info: ${error}`);
            }
        }
    );

    // ramen.uv.listToppings 命令：列出已安裝的 toppings
    const listToppingsCommand = vscode.commands.registerCommand(
        'ramen.uv.listToppings',
        async () => {
            try {
                const toppings = await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Loading toppings...',
                        cancellable: false,
                    },
                    async () => {
                        return await uvManager.getInstalledToppings(true); // Force refresh
                    }
                );

                if (toppings.length === 0) {
                    vscode.window.showInformationMessage('No toppings found');
                    return;
                }

                // 創建 QuickPick 顯示 toppings
                const items = toppings.map((topping) => ({
                    label: topping.name,
                    description: topping.isInstalled ? topping.version : 'Not installed',
                    detail: topping.description,
                    topping,
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a topping to view details',
                    matchOnDescription: true,
                    matchOnDetail: true,
                });

                if (selected) {
                    showToppingDetails(selected.topping, uvManager);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to list toppings: ${error}`);
            }
        }
    );

    // ramen.uv.installTopping 命令：安裝 topping
    const installToppingCommand = vscode.commands.registerCommand(
        'ramen.uv.installTopping',
        async (toppingName?: string) => {
            try {
                // 如果沒有指定 topping，顯示選單
                if (!toppingName) {
                    const toppings = await uvManager.getInstalledToppings();
                    const notInstalled = toppings.filter((t) => !t.isInstalled);

                    if (notInstalled.length === 0) {
                        vscode.window.showInformationMessage('All known toppings are installed');
                        return;
                    }

                    const items = notInstalled.map((topping) => ({
                        label: topping.name,
                        description: topping.description || '',
                        topping,
                    }));

                    const selected = await vscode.window.showQuickPick(items, {
                        placeHolder: 'Select a topping to install',
                        matchOnDescription: true,
                    });

                    if (!selected) {
                        return;
                    }

                    toppingName = selected.topping.name;
                }

                // 執行安裝
                const result = await uvManager.installTopping(toppingName);

                if (result.success) {
                    vscode.window.showInformationMessage(result.message);
                } else {
                    vscode.window.showErrorMessage(result.message);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to install topping: ${error}`);
            }
        }
    );

    // ramen.uv.uninstallTopping 命令：移除 topping
    const uninstallToppingCommand = vscode.commands.registerCommand(
        'ramen.uv.uninstallTopping',
        async (toppingName?: string) => {
            try {
                // 如果沒有指定 topping，顯示選單
                if (!toppingName) {
                    const toppings = await uvManager.getInstalledToppings();
                    const installed = toppings.filter((t) => t.isInstalled);

                    if (installed.length === 0) {
                        vscode.window.showInformationMessage('No toppings installed');
                        return;
                    }

                    const items = installed.map((topping) => ({
                        label: topping.name,
                        description: topping.version,
                        detail: topping.description,
                        topping,
                    }));

                    const selected = await vscode.window.showQuickPick(items, {
                        placeHolder: 'Select a topping to uninstall',
                        matchOnDescription: true,
                        matchOnDetail: true,
                    });

                    if (!selected) {
                        return;
                    }

                    toppingName = selected.topping.name;
                }

                // 確認移除
                const confirm = await vscode.window.showWarningMessage(
                    `Are you sure you want to uninstall ${toppingName}?`,
                    { modal: true },
                    'Yes',
                    'No'
                );

                if (confirm !== 'Yes') {
                    return;
                }

                // 執行移除
                const result = await uvManager.uninstallTopping(toppingName);

                if (result.success) {
                    vscode.window.showInformationMessage(result.message);
                } else {
                    vscode.window.showErrorMessage(result.message);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to uninstall topping: ${error}`);
            }
        }
    );

    // ramen.uv.syncEnvironment 命令：同步環境
    const syncEnvCommand = vscode.commands.registerCommand(
        'ramen.uv.syncEnvironment',
        async () => {
            try {
                const result = await uvManager.syncEnvironment();

                if (result.success) {
                    vscode.window.showInformationMessage(result.message);
                } else {
                    vscode.window.showErrorMessage(result.message);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to sync environment: ${error}`);
            }
        }
    );

    // ramen.uv.checkMissingDependencies 命令：檢查缺失的依賴
    const checkDepsCommand = vscode.commands.registerCommand(
        'ramen.uv.checkMissingDependencies',
        async () => {
            try {
                const missing = await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Checking dependencies...',
                        cancellable: false,
                    },
                    async () => {
                        return await uvManager.checkMissingDependencies();
                    }
                );

                if (missing.length === 0) {
                    vscode.window.showInformationMessage('✅ All dependencies are installed');
                } else {
                    const message = `Missing ${missing.length} dependencies: ${missing.join(', ')}`;
                    const choice = await vscode.window.showWarningMessage(
                        message,
                        'Install All',
                        'Cancel'
                    );

                    if (choice === 'Install All') {
                        for (const dep of missing) {
                            await uvManager.installTopping(dep, false);
                        }
                        vscode.window.showInformationMessage('All dependencies installed');
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to check dependencies: ${error}`);
            }
        }
    );

    // 註冊所有命令
    context.subscriptions.push(showEnvInfoCommand);
    context.subscriptions.push(listToppingsCommand);
    context.subscriptions.push(installToppingCommand);
    context.subscriptions.push(uninstallToppingCommand);
    context.subscriptions.push(syncEnvCommand);
    context.subscriptions.push(checkDepsCommand);
}

/**
 * 顯示 topping 詳情
 */
async function showToppingDetails(topping: ToppingInfo, uvManager: UVPackageManager) {
    const actions: string[] = [];

    if (topping.isInstalled) {
        actions.push('Uninstall');
    } else {
        actions.push('Install');
    }

    actions.push('Close');

    const detailLines = [
        `Name: ${topping.name}`,
        `Status: ${topping.isInstalled ? 'Installed' : 'Not installed'}`,
    ];

    if (topping.isInstalled) {
        detailLines.push(`Version: ${topping.version}`);
    }

    if (topping.description) {
        detailLines.push(`Description: ${topping.description}`);
    }

    const choice = await vscode.window.showInformationMessage(
        detailLines.join('\n'),
        { modal: true },
        ...actions
    );

    if (choice === 'Install') {
        const result = await uvManager.installTopping(topping.name);
        if (result.success) {
            vscode.window.showInformationMessage(result.message);
        } else {
            vscode.window.showErrorMessage(result.message);
        }
    } else if (choice === 'Uninstall') {
        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to uninstall ${topping.name}?`,
            { modal: true },
            'Yes',
            'No'
        );

        if (confirm === 'Yes') {
            const result = await uvManager.uninstallTopping(topping.name);
            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            } else {
                vscode.window.showErrorMessage(result.message);
            }
        }
    }
}

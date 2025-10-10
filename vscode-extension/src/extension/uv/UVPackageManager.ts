/**
 * UV Package Manager
 * 管理 Ramen toppings 和 Python 環境
 */

import * as vscode from 'vscode';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface ToppingInfo {
    name: string;
    version: string;
    description?: string;
    isInstalled: boolean;
    isCore: boolean; // 是否為核心內建 topping
}

export interface PythonEnvironmentInfo {
    pythonPath: string;
    pythonVersion: string;
    uvVersion?: string;
    virtualEnvPath?: string;
    isUVAvailable: boolean;
    ramenVersion?: string;
}

export class UVPackageManager implements vscode.Disposable {
    private outputChannel: vscode.OutputChannel;
    private cachedToppings?: ToppingInfo[];
    private cacheTimestamp?: number;
    private readonly CACHE_TTL = 60000; // 1 分鐘快取

    // 已知的 Ramen toppings
    private readonly KNOWN_TOPPINGS = [
        {
            name: 'ramen-topping-numpy',
            description: 'NumPy numerical computation nodes',
        },
        {
            name: 'ramen-topping-pandas',
            description: 'Pandas DataFrame processing nodes',
        },
        {
            name: 'ramen-topping-torch',
            description: 'PyTorch deep learning nodes',
        },
        {
            name: 'ramen-topping-plots',
            description: 'Matplotlib visualization nodes',
        },
        {
            name: 'ramen-topping-nn-builder',
            description: 'Neural network visual construction',
        },
    ];

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Ramen UV');
    }

    /**
     * 檢查 UV 是否可用
     */
    async isUVAvailable(): Promise<boolean> {
        try {
            const { stdout } = await execAsync('uv --version', {
                timeout: 5000,
            });
            this.outputChannel.appendLine(`UV version: ${stdout.trim()}`);
            return true;
        } catch (error) {
            this.outputChannel.appendLine('UV is not available in PATH');
            return false;
        }
    }

    /**
     * 獲取 Python 環境資訊
     */
    async getPythonEnvironmentInfo(): Promise<PythonEnvironmentInfo | null> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return null;
            }

            // 找到 Ramen 專案根目錄
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const ramenRoot = this.findRamenProjectRoot(workspaceRoot);

            if (!ramenRoot) {
                this.outputChannel.appendLine('Ramen project root not found');
                return null;
            }

            // 檢查 UV 是否可用
            const uvAvailable = await this.isUVAvailable();
            let uvVersion: string | undefined;

            if (uvAvailable) {
                try {
                    const { stdout } = await execAsync('uv --version', { timeout: 5000 });
                    uvVersion = stdout.trim().replace('uv ', '');
                } catch {
                    // Ignore
                }
            }

            // 嘗試找到 virtual environment
            const venvPath = path.join(ramenRoot, '.venv');
            let pythonPath: string;
            let pythonVersion: string;

            if (fs.existsSync(venvPath)) {
                pythonPath =
                    process.platform === 'win32'
                        ? path.join(venvPath, 'Scripts', 'python.exe')
                        : path.join(venvPath, 'bin', 'python');

                try {
                    const { stdout } = await execAsync(`"${pythonPath}" --version`, {
                        timeout: 5000,
                    });
                    pythonVersion = stdout.trim();
                } catch {
                    pythonVersion = 'Unknown';
                }
            } else if (uvAvailable) {
                pythonPath = 'uv run python';
                try {
                    const { stdout } = await execAsync('uv run python --version', {
                        cwd: ramenRoot,
                        timeout: 5000,
                    });
                    pythonVersion = stdout.trim();
                } catch {
                    pythonVersion = 'Unknown';
                }
            } else {
                pythonPath = 'python3';
                try {
                    const { stdout } = await execAsync('python3 --version', { timeout: 5000 });
                    pythonVersion = stdout.trim();
                } catch {
                    pythonVersion = 'Unknown';
                }
            }

            // 獲取 Ramen 版本
            let ramenVersion: string | undefined;
            try {
                const pyprojectPath = path.join(ramenRoot, 'pyproject.toml');
                if (fs.existsSync(pyprojectPath)) {
                    const content = fs.readFileSync(pyprojectPath, 'utf-8');
                    const match = content.match(/version\s*=\s*"([^"]+)"/);
                    if (match) {
                        ramenVersion = match[1];
                    }
                }
            } catch {
                // Ignore
            }

            return {
                pythonPath,
                pythonVersion,
                uvVersion,
                virtualEnvPath: fs.existsSync(venvPath) ? venvPath : undefined,
                isUVAvailable: uvAvailable,
                ramenVersion,
            };
        } catch (error) {
            this.outputChannel.appendLine(`Failed to get Python environment info: ${error}`);
            return null;
        }
    }

    /**
     * 找到 Ramen 專案根目錄
     */
    private findRamenProjectRoot(startPath: string): string | null {
        let currentPath = startPath;

        // 向上查找，最多 5 層
        for (let i = 0; i < 5; i++) {
            const pyprojectPath = path.join(currentPath, 'pyproject.toml');
            if (fs.existsSync(pyprojectPath)) {
                const content = fs.readFileSync(pyprojectPath, 'utf-8');
                if (content.includes('name = "ramen"') || content.includes('name="ramen"')) {
                    return currentPath;
                }
            }

            const parentPath = path.dirname(currentPath);
            if (parentPath === currentPath) {
                break; // 已到根目錄
            }
            currentPath = parentPath;
        }

        return null;
    }

    /**
     * 獲取已安裝的 toppings
     */
    async getInstalledToppings(forceRefresh = false): Promise<ToppingInfo[]> {
        // 檢查快取
        if (
            !forceRefresh &&
            this.cachedToppings &&
            this.cacheTimestamp &&
            Date.now() - this.cacheTimestamp < this.CACHE_TTL
        ) {
            return this.cachedToppings;
        }

        const toppings: ToppingInfo[] = [];
        const envInfo = await this.getPythonEnvironmentInfo();

        if (!envInfo) {
            return toppings;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return toppings;
        }

        const ramenRoot = this.findRamenProjectRoot(workspaceFolders[0].uri.fsPath);
        if (!ramenRoot) {
            return toppings;
        }

        try {
            // 使用 pip list 列出已安裝的套件
            const listCommand =
                envInfo.pythonPath === 'uv run python'
                    ? 'uv run pip list --format=json'
                    : `"${envInfo.pythonPath}" -m pip list --format=json`;

            const { stdout } = await execAsync(listCommand, {
                cwd: ramenRoot,
                timeout: 10000,
            });

            const installedPackages = JSON.parse(stdout) as Array<{
                name: string;
                version: string;
            }>;

            // 檢查每個已知的 topping
            for (const knownTopping of this.KNOWN_TOPPINGS) {
                const installedPkg = installedPackages.find(
                    (pkg) => pkg.name.toLowerCase() === knownTopping.name.toLowerCase()
                );

                toppings.push({
                    name: knownTopping.name,
                    version: installedPkg?.version || 'Not installed',
                    description: knownTopping.description,
                    isInstalled: !!installedPkg,
                    isCore: false,
                });
            }

            // 檢查其他已安裝的 ramen-topping-* 套件
            const otherToppings = installedPackages.filter(
                (pkg) =>
                    pkg.name.startsWith('ramen-topping-') &&
                    !this.KNOWN_TOPPINGS.some((kt) => kt.name === pkg.name)
            );

            for (const topping of otherToppings) {
                toppings.push({
                    name: topping.name,
                    version: topping.version,
                    isInstalled: true,
                    isCore: false,
                });
            }

            // 更新快取
            this.cachedToppings = toppings;
            this.cacheTimestamp = Date.now();

            return toppings;
        } catch (error) {
            this.outputChannel.appendLine(`Failed to list installed toppings: ${error}`);
            return toppings;
        }
    }

    /**
     * 安裝 topping
     */
    async installTopping(
        toppingName: string,
        showProgress = true
    ): Promise<{ success: boolean; message: string }> {
        const envInfo = await this.getPythonEnvironmentInfo();

        if (!envInfo) {
            return {
                success: false,
                message: 'Python environment not found',
            };
        }

        if (!envInfo.isUVAvailable) {
            return {
                success: false,
                message: 'UV is not available. Please install UV first: https://docs.astral.sh/uv/',
            };
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                success: false,
                message: 'No workspace folder open',
            };
        }

        const ramenRoot = this.findRamenProjectRoot(workspaceFolders[0].uri.fsPath);
        if (!ramenRoot) {
            return {
                success: false,
                message: 'Ramen project root not found',
            };
        }

        const installFunc = async () => {
            return new Promise<{ success: boolean; message: string }>((resolve) => {
                this.outputChannel.appendLine(`\n🍜 Installing ${toppingName}...`);
                this.outputChannel.show(true);

                const uvProcess = spawn('uv', ['add', toppingName], {
                    cwd: ramenRoot,
                    shell: true,
                });

                let output = '';
                let errorOutput = '';

                uvProcess.stdout.on('data', (data) => {
                    const message = data.toString();
                    output += message;
                    this.outputChannel.append(message);
                });

                uvProcess.stderr.on('data', (data) => {
                    const message = data.toString();
                    errorOutput += message;
                    this.outputChannel.append(message);
                });

                uvProcess.on('close', (code) => {
                    if (code === 0) {
                        this.outputChannel.appendLine(`\n✅ ${toppingName} installed successfully`);
                        // 清除快取
                        this.cachedToppings = undefined;
                        resolve({
                            success: true,
                            message: `${toppingName} installed successfully`,
                        });
                    } else {
                        this.outputChannel.appendLine(`\n❌ Failed to install ${toppingName}`);
                        resolve({
                            success: false,
                            message: `Failed to install ${toppingName}: ${errorOutput || 'Unknown error'}`,
                        });
                    }
                });

                uvProcess.on('error', (error) => {
                    this.outputChannel.appendLine(`\n❌ Error: ${error.message}`);
                    resolve({
                        success: false,
                        message: `Error: ${error.message}`,
                    });
                });
            });
        };

        if (showProgress) {
            return vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Installing ${toppingName}`,
                    cancellable: false,
                },
                async () => {
                    return await installFunc();
                }
            );
        } else {
            return await installFunc();
        }
    }

    /**
     * 移除 topping
     */
    async uninstallTopping(
        toppingName: string,
        showProgress = true
    ): Promise<{ success: boolean; message: string }> {
        const envInfo = await this.getPythonEnvironmentInfo();

        if (!envInfo) {
            return {
                success: false,
                message: 'Python environment not found',
            };
        }

        if (!envInfo.isUVAvailable) {
            return {
                success: false,
                message: 'UV is not available',
            };
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                success: false,
                message: 'No workspace folder open',
            };
        }

        const ramenRoot = this.findRamenProjectRoot(workspaceFolders[0].uri.fsPath);
        if (!ramenRoot) {
            return {
                success: false,
                message: 'Ramen project root not found',
            };
        }

        const uninstallFunc = async () => {
            return new Promise<{ success: boolean; message: string }>((resolve) => {
                this.outputChannel.appendLine(`\n🍜 Uninstalling ${toppingName}...`);
                this.outputChannel.show(true);

                const uvProcess = spawn('uv', ['remove', toppingName], {
                    cwd: ramenRoot,
                    shell: true,
                });

                let output = '';
                let errorOutput = '';

                uvProcess.stdout.on('data', (data) => {
                    const message = data.toString();
                    output += message;
                    this.outputChannel.append(message);
                });

                uvProcess.stderr.on('data', (data) => {
                    const message = data.toString();
                    errorOutput += message;
                    this.outputChannel.append(message);
                });

                uvProcess.on('close', (code) => {
                    if (code === 0) {
                        this.outputChannel.appendLine(
                            `\n✅ ${toppingName} uninstalled successfully`
                        );
                        // 清除快取
                        this.cachedToppings = undefined;
                        resolve({
                            success: true,
                            message: `${toppingName} uninstalled successfully`,
                        });
                    } else {
                        this.outputChannel.appendLine(`\n❌ Failed to uninstall ${toppingName}`);
                        resolve({
                            success: false,
                            message: `Failed to uninstall ${toppingName}: ${errorOutput || 'Unknown error'}`,
                        });
                    }
                });

                uvProcess.on('error', (error) => {
                    this.outputChannel.appendLine(`\n❌ Error: ${error.message}`);
                    resolve({
                        success: false,
                        message: `Error: ${error.message}`,
                    });
                });
            });
        };

        if (showProgress) {
            return vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Uninstalling ${toppingName}`,
                    cancellable: false,
                },
                async () => {
                    return await uninstallFunc();
                }
            );
        } else {
            return await uninstallFunc();
        }
    }

    /**
     * 檢查缺失的依賴
     */
    async checkMissingDependencies(): Promise<string[]> {
        const toppings = await this.getInstalledToppings();
        return toppings.filter((t) => !t.isInstalled).map((t) => t.name);
    }

    /**
     * 執行 UV sync
     */
    async syncEnvironment(): Promise<{ success: boolean; message: string }> {
        const envInfo = await this.getPythonEnvironmentInfo();

        if (!envInfo || !envInfo.isUVAvailable) {
            return {
                success: false,
                message: 'UV is not available',
            };
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                success: false,
                message: 'No workspace folder open',
            };
        }

        const ramenRoot = this.findRamenProjectRoot(workspaceFolders[0].uri.fsPath);
        if (!ramenRoot) {
            return {
                success: false,
                message: 'Ramen project root not found',
            };
        }

        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Syncing UV environment',
                cancellable: false,
            },
            async () => {
                return new Promise<{ success: boolean; message: string }>((resolve) => {
                    this.outputChannel.appendLine('\n🍜 Running uv sync...');
                    this.outputChannel.show(true);

                    const uvProcess = spawn('uv', ['sync'], {
                        cwd: ramenRoot,
                        shell: true,
                    });

                    uvProcess.stdout.on('data', (data) => {
                        this.outputChannel.append(data.toString());
                    });

                    uvProcess.stderr.on('data', (data) => {
                        this.outputChannel.append(data.toString());
                    });

                    uvProcess.on('close', (code) => {
                        if (code === 0) {
                            this.outputChannel.appendLine('\n✅ Environment synced successfully');
                            // 清除快取
                            this.cachedToppings = undefined;
                            resolve({
                                success: true,
                                message: 'Environment synced successfully',
                            });
                        } else {
                            this.outputChannel.appendLine('\n❌ Failed to sync environment');
                            resolve({
                                success: false,
                                message: 'Failed to sync environment',
                            });
                        }
                    });
                });
            }
        );
    }

    /**
     * 清理資源
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}

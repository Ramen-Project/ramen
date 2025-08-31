import * as vscode from 'vscode';
import { RamenServerManager } from '../server/serverManager';

interface ServerInfo {
    id: string;
    label: string;
    value: string;
    description?: string;
    contextValue: string;
}

export class RamenServerProvider implements vscode.TreeDataProvider<ServerInfo> {
    private _onDidChangeTreeData: vscode.EventEmitter<ServerInfo | undefined | null | void> = new vscode.EventEmitter<ServerInfo | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ServerInfo | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(
        private context: vscode.ExtensionContext,
        private serverManager: RamenServerManager
    ) {
        // Set initial context
        this.updateContext();
        
        // Listen to server status changes
        this.serverManager.onDidChangeStatus(() => {
            this.refresh();
            this.updateContext();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    private updateContext(): void {
        const isRunning = this.serverManager.isRunning();
        vscode.commands.executeCommand('setContext', 'ramen:serverRunning', isRunning);
    }

    getTreeItem(element: ServerInfo): vscode.TreeItem {
        const item = new vscode.TreeItem(
            element.label,
            vscode.TreeItemCollapsibleState.None
        );

        item.description = element.value;
        item.tooltip = element.description || `${element.label}: ${element.value}`;
        item.contextValue = element.contextValue;

        // Set icons based on server info type
        switch (element.id) {
            case 'status':
                item.iconPath = new vscode.ThemeIcon(
                    this.serverManager.isRunning() ? 'circle-filled' : 'circle-outline',
                    this.serverManager.isRunning() ? 
                        new vscode.ThemeColor('charts.green') : 
                        new vscode.ThemeColor('charts.red')
                );
                break;
            case 'port':
                item.iconPath = new vscode.ThemeIcon('plug');
                break;
            case 'pid':
                item.iconPath = new vscode.ThemeIcon('gear');
                break;
            case 'uptime':
                item.iconPath = new vscode.ThemeIcon('clock');
                break;
            case 'python':
                item.iconPath = new vscode.ThemeIcon('symbol-method');
                break;
            default:
                item.iconPath = new vscode.ThemeIcon('info');
        }

        return item;
    }

    getChildren(element?: ServerInfo): Thenable<ServerInfo[]> {
        if (!element) {
            return Promise.resolve(this.getServerInfo());
        }
        return Promise.resolve([]);
    }

    private getServerInfo(): ServerInfo[] {
        const isRunning = this.serverManager.isRunning();
        const port = this.serverManager.getPort();
        const pid = this.serverManager.getProcessId();
        const uptime = this.serverManager.getUptime();
        const pythonPath = this.serverManager.getPythonPath();

        const info: ServerInfo[] = [
            {
                id: 'status',
                label: 'Status',
                value: isRunning ? 'Running' : 'Stopped',
                description: isRunning ? 'Server is running' : 'Server is stopped',
                contextValue: 'serverStatus'
            },
            {
                id: 'port',
                label: 'Port',
                value: port.toString(),
                description: `Server listening on port ${port}`,
                contextValue: 'serverPort'
            }
        ];

        if (isRunning) {
            if (pid) {
                info.push({
                    id: 'pid',
                    label: 'Process ID',
                    value: pid.toString(),
                    description: `Server process ID: ${pid}`,
                    contextValue: 'serverPid'
                });
            }

            if (uptime) {
                info.push({
                    id: 'uptime',
                    label: 'Uptime',
                    value: this.formatUptime(uptime),
                    description: `Server has been running for ${this.formatUptime(uptime)}`,
                    contextValue: 'serverUptime'
                });
            }
        }

        if (pythonPath) {
            info.push({
                id: 'python',
                label: 'Python',
                value: this.getShortPath(pythonPath),
                description: `Using Python: ${pythonPath}`,
                contextValue: 'serverPython'
            });
        }

        return info;
    }

    private formatUptime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    private getShortPath(fullPath: string): string {
        const parts = fullPath.split(/[\\/]/);
        return parts.length > 2 ? `.../${parts.slice(-2).join('/')}` : fullPath;
    }
}
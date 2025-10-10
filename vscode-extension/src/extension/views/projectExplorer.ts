import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 簡化的 Ramen Project Explorer
 * 只保留基本的資料夾瀏覽功能
 */
export class RamenProjectExplorer
    implements vscode.TreeDataProvider<ProjectItem>, vscode.Disposable
{
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | null | void> =
        new vscode.EventEmitter<ProjectItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private graphs: Map<string, GraphInfo> = new Map();
    private watcher?: vscode.FileSystemWatcher;

    constructor(private context: vscode.ExtensionContext) {
        this.watchWorkspace();
    }

    /**
     * 刷新視圖
     */
    refresh(): void {
        this.scanWorkspace();
        this._onDidChangeTreeData.fire();
    }

    /**
     * 獲取 TreeItem
     */
    getTreeItem(element: ProjectItem): vscode.TreeItem {
        return element;
    }

    /**
     * 獲取子項目
     */
    async getChildren(element?: ProjectItem): Promise<ProjectItem[]> {
        if (!vscode.workspace.workspaceFolders) {
            return [];
        }

        await this.scanWorkspace();

        if (!element) {
            // Root level - 顯示所有 .ramen 檔案
            const items: ProjectItem[] = [];

            for (const [graphPath, info] of this.graphs) {
                items.push(new GraphItem(info));
            }

            // 按名稱排序
            items.sort((a, b) => a.label.localeCompare(b.label));

            return items;
        }

        return [];
    }

    /**
     * 掃描工作區中的 .ramen 檔案
     */
    private async scanWorkspace(): Promise<void> {
        this.graphs.clear();

        const files = await vscode.workspace.findFiles('**/*.ramen', '**/node_modules/**');

        for (const file of files) {
            const info = await this.getGraphInfo(file);
            if (info) {
                this.graphs.set(file.fsPath, info);
            }
        }
    }

    /**
     * 獲取 graph 資訊
     */
    private async getGraphInfo(uri: vscode.Uri): Promise<GraphInfo | null> {
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            const graph = JSON.parse(content.toString());

            const stats = await vscode.workspace.fs.stat(uri);

            return {
                path: uri.fsPath,
                name: path.basename(uri.fsPath, '.ramen'),
                uri: uri,
                nodeCount: graph.nodes?.length || 0,
                edgeCount: graph.edges?.length || 0,
                lastModified: new Date(stats.mtime),
                size: stats.size,
                metadata: graph.metadata || {},
            };
        } catch (error) {
            console.error(`Failed to read graph ${uri.fsPath}:`, error);
            return null;
        }
    }

    /**
     * 監控工作區變更
     */
    private watchWorkspace(): void {
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*.ramen');

        this.watcher.onDidCreate(() => this.refresh());
        this.watcher.onDidChange(() => this.refresh());
        this.watcher.onDidDelete(() => this.refresh());

        this.context.subscriptions.push(this.watcher);
    }

    /**
     * 清理資源
     */
    dispose(): void {
        this._onDidChangeTreeData.dispose();
        if (this.watcher) {
            this.watcher.dispose();
        }
    }
}

/**
 * TreeItem 基類
 */
abstract class ProjectItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}

/**
 * Graph 項目
 */
class GraphItem extends ProjectItem {
    constructor(public readonly info: GraphInfo) {
        super(info.name, vscode.TreeItemCollapsibleState.None);

        this.tooltip = this.createTooltip();
        this.contextValue = 'ramen-graph';
        this.resourceUri = info.uri;

        this.command = {
            command: 'vscode.open',
            title: 'Open Graph',
            arguments: [info.uri],
        };

        // 使用 graph icon
        this.iconPath = new vscode.ThemeIcon('graph');

        // 顯示節點和邊數量
        this.description = `${info.nodeCount} nodes, ${info.edgeCount} edges`;
    }

    private createTooltip(): string {
        const lines = [
            `Name: ${this.info.name}`,
            `Nodes: ${this.info.nodeCount}`,
            `Edges: ${this.info.edgeCount}`,
            `Size: ${this.formatSize(this.info.size)}`,
            `Modified: ${this.info.lastModified.toLocaleString()}`,
        ];

        if (this.info.metadata.description) {
            lines.unshift(`Description: ${this.info.metadata.description}`);
        }

        return lines.join('\n');
    }

    private formatSize(bytes: number): string {
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}

/**
 * Graph 資訊介面
 */
interface GraphInfo {
    path: string;
    name: string;
    uri: vscode.Uri;
    nodeCount: number;
    edgeCount: number;
    lastModified: Date;
    size: number;
    metadata: Record<string, any>;
}

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class RamenGraphProvider implements vscode.TreeDataProvider<GraphItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<GraphItem | undefined | null | void> =
        new vscode.EventEmitter<GraphItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GraphItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GraphItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: GraphItem): Thenable<GraphItem[]> {
        if (!vscode.workspace.workspaceFolders) {
            return Promise.resolve([]);
        }

        if (element) {
            // If element is a folder, get its children
            if (element.contextValue === 'folder') {
                return this.getGraphsInFolder(element.resourceUri!);
            }
            return Promise.resolve([]);
        } else {
            // Root level - show all graphs grouped by folder
            return this.getAllGraphs();
        }
    }

    private async getAllGraphs(): Promise<GraphItem[]> {
        const items: GraphItem[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            return items;
        }

        for (const folder of workspaceFolders) {
            const graphs = await this.findGraphFiles(folder.uri);

            if (graphs.length > 0) {
                // Create folder item
                const folderItem = new GraphItem(
                    folder.name,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'folder',
                    folder.uri,
                    undefined,
                    graphs.length
                );

                items.push(folderItem);
            }
        }

        return items;
    }

    private async getGraphsInFolder(folderUri: vscode.Uri): Promise<GraphItem[]> {
        const graphs = await this.findGraphFiles(folderUri);

        return graphs.map((graphUri) => {
            const name = path.basename(graphUri.fsPath, '.ramen');
            const metadata = this.getGraphMetadata(graphUri);

            return new GraphItem(
                name,
                vscode.TreeItemCollapsibleState.None,
                'graph',
                graphUri,
                {
                    command: 'ramen.openGraphEditor',
                    title: 'Open Graph',
                    arguments: [graphUri],
                },
                undefined,
                metadata
            );
        });
    }

    private async findGraphFiles(folderUri: vscode.Uri): Promise<vscode.Uri[]> {
        const pattern = new vscode.RelativePattern(folderUri, '**/*.ramen');
        const files = await vscode.workspace.findFiles(pattern);

        // Sort by name
        files.sort((a, b) => {
            const nameA = path.basename(a.fsPath);
            const nameB = path.basename(b.fsPath);
            return nameA.localeCompare(nameB);
        });

        return files;
    }

    private getGraphMetadata(graphUri: vscode.Uri): GraphMetadata | undefined {
        try {
            const content = fs.readFileSync(graphUri.fsPath, 'utf8');
            const data = JSON.parse(content);

            return {
                nodeCount: data.nodes?.length || 0,
                edgeCount: data.edges?.length || 0,
                description: data.metadata?.description || '',
                lastModified: fs.statSync(graphUri.fsPath).mtime,
            };
        } catch {
            return undefined;
        }
    }
}

interface GraphMetadata {
    nodeCount: number;
    edgeCount: number;
    description: string;
    lastModified: Date;
}

class GraphItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly resourceUri?: vscode.Uri,
        public readonly command?: vscode.Command,
        public readonly graphCount?: number,
        public readonly metadata?: GraphMetadata
    ) {
        super(label, collapsibleState);

        if (contextValue === 'folder') {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.description = `${graphCount} graph${graphCount !== 1 ? 's' : ''}`;
        } else if (contextValue === 'graph') {
            this.iconPath = new vscode.ThemeIcon('graph');

            if (metadata) {
                this.description = `${metadata.nodeCount} nodes, ${metadata.edgeCount} edges`;

                const tooltip = new vscode.MarkdownString();
                tooltip.appendMarkdown(`**${label}**\n\n`);

                if (metadata.description) {
                    tooltip.appendMarkdown(`${metadata.description}\n\n`);
                }

                tooltip.appendMarkdown(`- Nodes: ${metadata.nodeCount}\n`);
                tooltip.appendMarkdown(`- Edges: ${metadata.edgeCount}\n`);
                tooltip.appendMarkdown(`- Modified: ${metadata.lastModified.toLocaleString()}\n`);

                this.tooltip = tooltip;
            }
        }
    }
}

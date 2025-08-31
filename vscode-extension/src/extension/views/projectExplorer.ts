import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Project Explorer for Ramen graphs with enhanced features
 */
export class RamenProjectExplorer implements vscode.TreeDataProvider<ProjectItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | null | void> = 
        new vscode.EventEmitter<ProjectItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;
    
    private graphs: Map<string, GraphInfo> = new Map();
    private folders: Map<string, FolderInfo> = new Map();
    private recentGraphs: string[] = [];
    private favoriteGraphs: Set<string> = new Set();
    private groupBy: 'folder' | 'type' | 'recent' | 'favorites' = 'folder';
    private searchFilter: string = '';
    
    constructor(private context: vscode.ExtensionContext) {
        this.loadState();
        this.watchWorkspace();
    }
    
    refresh(): void {
        this.scanWorkspace();
        this._onDidChangeTreeData.fire();
    }
    
    setGroupBy(groupBy: 'folder' | 'type' | 'recent' | 'favorites'): void {
        this.groupBy = groupBy;
        this.refresh();
    }
    
    setSearchFilter(filter: string): void {
        this.searchFilter = filter.toLowerCase();
        this.refresh();
    }
    
    toggleFavorite(graphPath: string): void {
        if (this.favoriteGraphs.has(graphPath)) {
            this.favoriteGraphs.delete(graphPath);
        } else {
            this.favoriteGraphs.add(graphPath);
        }
        this.saveState();
        this.refresh();
    }
    
    getTreeItem(element: ProjectItem): vscode.TreeItem {
        return element;
    }
    
    getChildren(element?: ProjectItem): Thenable<ProjectItem[]> {
        if (!vscode.workspace.workspaceFolders) {
            return Promise.resolve([]);
        }
        
        if (!element) {
            // Root level
            return this.getRootItems();
        }
        
        if (element instanceof FolderItem) {
            return this.getFolderChildren(element);
        }
        
        if (element instanceof CategoryItem) {
            return this.getCategoryChildren(element);
        }
        
        return Promise.resolve([]);
    }
    
    private async getRootItems(): Promise<ProjectItem[]> {
        await this.scanWorkspace();
        
        const items: ProjectItem[] = [];
        
        switch (this.groupBy) {
            case 'folder':
                // Group by folders
                for (const [folderPath, info] of this.folders) {
                    if (info.graphCount > 0) {
                        items.push(new FolderItem(
                            info.name,
                            folderPath,
                            info.graphCount,
                            vscode.TreeItemCollapsibleState.Expanded
                        ));
                    }
                }
                break;
                
            case 'type':
                // Group by node types
                const types = this.getGraphTypes();
                for (const type of types) {
                    const graphs = this.getGraphsByType(type);
                    if (graphs.length > 0) {
                        items.push(new CategoryItem(
                            type,
                            'type',
                            graphs.length,
                            vscode.TreeItemCollapsibleState.Expanded
                        ));
                    }
                }
                break;
                
            case 'recent':
                // Show recent graphs
                items.push(new CategoryItem(
                    'Recent Graphs',
                    'recent',
                    this.recentGraphs.length,
                    vscode.TreeItemCollapsibleState.Expanded
                ));
                
                if (this.graphs.size > this.recentGraphs.length) {
                    items.push(new CategoryItem(
                        'All Graphs',
                        'all',
                        this.graphs.size,
                        vscode.TreeItemCollapsibleState.Collapsed
                    ));
                }
                break;
                
            case 'favorites':
                // Show favorites first
                if (this.favoriteGraphs.size > 0) {
                    items.push(new CategoryItem(
                        'Favorites',
                        'favorites',
                        this.favoriteGraphs.size,
                        vscode.TreeItemCollapsibleState.Expanded
                    ));
                }
                
                const nonFavorites = Array.from(this.graphs.keys())
                    .filter(p => !this.favoriteGraphs.has(p));
                
                if (nonFavorites.length > 0) {
                    items.push(new CategoryItem(
                        'Other Graphs',
                        'others',
                        nonFavorites.length,
                        vscode.TreeItemCollapsibleState.Collapsed
                    ));
                }
                break;
        }
        
        // Apply search filter
        if (this.searchFilter) {
            return this.filterItems(items);
        }
        
        return items;
    }
    
    private async getFolderChildren(folder: FolderItem): Promise<ProjectItem[]> {
        const items: ProjectItem[] = [];
        
        // Add subfolders
        const subfolders = this.getSubfolders(folder.path);
        for (const subfolder of subfolders) {
            const info = this.folders.get(subfolder);
            if (info && info.graphCount > 0) {
                items.push(new FolderItem(
                    info.name,
                    subfolder,
                    info.graphCount,
                    vscode.TreeItemCollapsibleState.Collapsed
                ));
            }
        }
        
        // Add graphs in this folder
        const graphs = this.getGraphsInFolder(folder.path);
        for (const graphPath of graphs) {
            const info = this.graphs.get(graphPath);
            if (info) {
                items.push(new GraphItem(info));
            }
        }
        
        return items;
    }
    
    private async getCategoryChildren(category: CategoryItem): Promise<ProjectItem[]> {
        const items: ProjectItem[] = [];
        
        switch (category.categoryType) {
            case 'type':
                const graphsByType = this.getGraphsByType(category.label);
                for (const graphPath of graphsByType) {
                    const info = this.graphs.get(graphPath);
                    if (info) {
                        items.push(new GraphItem(info));
                    }
                }
                break;
                
            case 'recent':
                for (const graphPath of this.recentGraphs) {
                    const info = this.graphs.get(graphPath);
                    if (info) {
                        items.push(new GraphItem(info));
                    }
                }
                break;
                
            case 'all':
                for (const [graphPath, info] of this.graphs) {
                    items.push(new GraphItem(info));
                }
                break;
                
            case 'favorites':
                for (const graphPath of this.favoriteGraphs) {
                    const info = this.graphs.get(graphPath);
                    if (info) {
                        items.push(new GraphItem(info));
                    }
                }
                break;
                
            case 'others':
                for (const [graphPath, info] of this.graphs) {
                    if (!this.favoriteGraphs.has(graphPath)) {
                        items.push(new GraphItem(info));
                    }
                }
                break;
        }
        
        return items;
    }
    
    private async scanWorkspace(): Promise<void> {
        this.graphs.clear();
        this.folders.clear();
        
        const files = await vscode.workspace.findFiles('**/*.ramen', '**/node_modules/**');
        
        for (const file of files) {
            const info = await this.getGraphInfo(file);
            if (info) {
                this.graphs.set(file.fsPath, info);
                
                // Update folder info
                const folderPath = path.dirname(file.fsPath);
                this.updateFolderInfo(folderPath);
            }
        }
    }
    
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
                nodeTypes: this.extractNodeTypes(graph),
                lastModified: new Date(stats.mtime),
                size: stats.size,
                metadata: graph.metadata || {},
                isFavorite: this.favoriteGraphs.has(uri.fsPath)
            };
        } catch (error) {
            console.error(`Failed to read graph ${uri.fsPath}:`, error);
            return null;
        }
    }
    
    private extractNodeTypes(graph: any): string[] {
        const types = new Set<string>();
        if (graph.nodes) {
            for (const node of graph.nodes) {
                if (node.type) {
                    types.add(node.type);
                }
            }
        }
        return Array.from(types);
    }
    
    private updateFolderInfo(folderPath: string): void {
        let current = folderPath;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(folderPath));
        
        while (workspaceFolder && current.startsWith(workspaceFolder.uri.fsPath)) {
            const info = this.folders.get(current) || {
                name: path.basename(current),
                path: current,
                graphCount: 0
            };
            
            info.graphCount++;
            this.folders.set(current, info);
            
            const parent = path.dirname(current);
            if (parent === current) {break;}
            current = parent;
        }
    }
    
    private getSubfolders(folderPath: string): string[] {
        const subfolders: string[] = [];
        
        for (const [path, info] of this.folders) {
            if (path !== folderPath && path.startsWith(folderPath)) {
                const relative = path.substring(folderPath.length + 1);
                if (!relative.includes(require('path').sep)) {
                    subfolders.push(path);
                }
            }
        }
        
        return subfolders;
    }
    
    private getGraphsInFolder(folderPath: string): string[] {
        const graphs: string[] = [];
        
        for (const [graphPath, info] of this.graphs) {
            if (path.dirname(graphPath) === folderPath) {
                graphs.push(graphPath);
            }
        }
        
        return graphs;
    }
    
    private getGraphTypes(): string[] {
        const types = new Set<string>();
        
        for (const [, info] of this.graphs) {
            for (const type of info.nodeTypes) {
                types.add(type);
            }
        }
        
        return Array.from(types).sort();
    }
    
    private getGraphsByType(type: string): string[] {
        const graphs: string[] = [];
        
        for (const [graphPath, info] of this.graphs) {
            if (info.nodeTypes.includes(type)) {
                graphs.push(graphPath);
            }
        }
        
        return graphs;
    }
    
    private filterItems(items: ProjectItem[]): ProjectItem[] {
        // Apply search filter recursively
        const filtered: ProjectItem[] = [];
        
        for (const item of items) {
            if (item instanceof GraphItem) {
                if (item.label.toLowerCase().includes(this.searchFilter)) {
                    filtered.push(item);
                }
            } else {
                // For folders/categories, include if any child matches
                filtered.push(item);
            }
        }
        
        return filtered;
    }
    
    private watchWorkspace(): void {
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.ramen');
        
        watcher.onDidCreate(() => this.refresh());
        watcher.onDidChange(() => this.refresh());
        watcher.onDidDelete(() => this.refresh());
        
        this.context.subscriptions.push(watcher);
    }
    
    private loadState(): void {
        const state = this.context.globalState.get<ProjectExplorerState>('projectExplorer');
        
        if (state) {
            this.recentGraphs = state.recentGraphs || [];
            this.favoriteGraphs = new Set(state.favoriteGraphs || []);
            this.groupBy = state.groupBy || 'folder';
        }
    }
    
    private saveState(): void {
        const state: ProjectExplorerState = {
            recentGraphs: this.recentGraphs,
            favoriteGraphs: Array.from(this.favoriteGraphs),
            groupBy: this.groupBy
        };
        
        this.context.globalState.update('projectExplorer', state);
    }
    
    recordRecentGraph(graphPath: string): void {
        // Remove if already in list
        const index = this.recentGraphs.indexOf(graphPath);
        if (index !== -1) {
            this.recentGraphs.splice(index, 1);
        }
        
        // Add to front
        this.recentGraphs.unshift(graphPath);
        
        // Keep only last 10
        this.recentGraphs = this.recentGraphs.slice(0, 10);
        
        this.saveState();
        
        if (this.groupBy === 'recent') {
            this.refresh();
        }
    }
}

// Tree item types
abstract class ProjectItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}

class FolderItem extends ProjectItem {
    constructor(
        label: string,
        public readonly path: string,
        public readonly graphCount: number,
        collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        
        this.tooltip = `${graphCount} graph${graphCount !== 1 ? 's' : ''}`;
        this.contextValue = 'folder';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

class CategoryItem extends ProjectItem {
    constructor(
        label: string,
        public readonly categoryType: string,
        public readonly itemCount: number,
        collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        
        this.tooltip = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;
        this.contextValue = 'category';
        
        // Set icon based on category type
        switch (categoryType) {
            case 'recent':
                this.iconPath = new vscode.ThemeIcon('history');
                break;
            case 'favorites':
                this.iconPath = new vscode.ThemeIcon('star-full');
                break;
            case 'type':
                this.iconPath = new vscode.ThemeIcon('symbol-class');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('files');
        }
    }
}

class GraphItem extends ProjectItem {
    constructor(public readonly info: GraphInfo) {
        super(info.name, vscode.TreeItemCollapsibleState.None);
        
        this.tooltip = this.createTooltip();
        this.contextValue = info.isFavorite ? 'graph-favorite' : 'graph';
        this.resourceUri = info.uri;
        
        this.command = {
            command: 'vscode.open',
            title: 'Open Graph',
            arguments: [info.uri]
        };
        
        // Set icon
        if (info.isFavorite) {
            this.iconPath = new vscode.ThemeIcon('star-full');
        } else {
            this.iconPath = new vscode.ThemeIcon('graph');
        }
        
        // Add description
        this.description = `${info.nodeCount} nodes, ${info.edgeCount} edges`;
    }
    
    private createTooltip(): string {
        const lines = [
            `Name: ${this.info.name}`,
            `Nodes: ${this.info.nodeCount}`,
            `Edges: ${this.info.edgeCount}`,
            `Size: ${this.formatSize(this.info.size)}`,
            `Modified: ${this.info.lastModified.toLocaleString()}`
        ];
        
        if (this.info.metadata.description) {
            lines.unshift(`Description: ${this.info.metadata.description}`);
        }
        
        if (this.info.nodeTypes.length > 0) {
            lines.push(`Types: ${this.info.nodeTypes.join(', ')}`);
        }
        
        return lines.join('\n');
    }
    
    private formatSize(bytes: number): string {
        if (bytes < 1024) {return `${bytes} B`;}
        if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}

// Type definitions
interface GraphInfo {
    path: string;
    name: string;
    uri: vscode.Uri;
    nodeCount: number;
    edgeCount: number;
    nodeTypes: string[];
    lastModified: Date;
    size: number;
    metadata: Record<string, any>;
    isFavorite: boolean;
}

interface FolderInfo {
    name: string;
    path: string;
    graphCount: number;
}

interface ProjectExplorerState {
    recentGraphs: string[];
    favoriteGraphs: string[];
    groupBy: 'folder' | 'type' | 'recent' | 'favorites';
}
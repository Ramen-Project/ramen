import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface Dependency {
    name: string;
    version?: string;
    type: 'dependency' | 'dev-dependency' | 'optional-dependency' | 'topping';
    description?: string;
}

export class RamenDependenciesProvider implements vscode.TreeDataProvider<Dependency> {
    private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | null | void> = new vscode.EventEmitter<Dependency | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | null | void> = this._onDidChangeTreeData.event;

    private dependencies: Dependency[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.loadDependencies();
        
        // Watch for changes to pyproject.toml
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/pyproject.toml');
        fileWatcher.onDidChange(() => this.loadDependencies());
        fileWatcher.onDidCreate(() => this.loadDependencies());
        fileWatcher.onDidDelete(() => this.loadDependencies());
    }

    refresh(): void {
        this.loadDependencies();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Dependency): vscode.TreeItem {
        const item = new vscode.TreeItem(
            element.name,
            vscode.TreeItemCollapsibleState.None
        );

        item.description = element.version;
        item.tooltip = new vscode.MarkdownString(
            `**${element.name}**${element.version ? ` v${element.version}` : ''}\n\n${
                element.description || `${element.type.replace('-', ' ')}`
            }`
        );

        // Set icon based on dependency type
        switch (element.type) {
            case 'dependency':
                item.iconPath = new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.blue'));
                break;
            case 'dev-dependency':
                item.iconPath = new vscode.ThemeIcon('tools', new vscode.ThemeColor('charts.orange'));
                break;
            case 'optional-dependency':
                item.iconPath = new vscode.ThemeIcon('question', new vscode.ThemeColor('charts.yellow'));
                break;
            case 'topping':
                item.iconPath = new vscode.ThemeIcon('extensions', new vscode.ThemeColor('charts.purple'));
                break;
            default:
                item.iconPath = new vscode.ThemeIcon('package');
        }

        item.contextValue = `ramenDependency-${element.type}`;
        return item;
    }

    getChildren(element?: Dependency): Thenable<Dependency[]> {
        if (!element) {
            return Promise.resolve(this.dependencies);
        }
        return Promise.resolve([]);
    }

    private async loadDependencies(): Promise<void> {
        const dependencies: Dependency[] = [];
        
        // Find pyproject.toml in workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            this.dependencies = [];
            return;
        }

        for (const folder of workspaceFolders) {
            const pyprojectPath = path.join(folder.uri.fsPath, 'pyproject.toml');
            
            if (fs.existsSync(pyprojectPath)) {
                try {
                    const content = fs.readFileSync(pyprojectPath, 'utf-8');
                    const parsedDeps = this.parsePyprojectToml(content);
                    dependencies.push(...parsedDeps);
                } catch (error) {
                    console.error('Error reading pyproject.toml:', error);
                }
            }
        }

        this.dependencies = dependencies;
    }

    private parsePyprojectToml(content: string): Dependency[] {
        const dependencies: Dependency[] = [];
        
        try {
            // Parse TOML-like content (simplified parser)
            const lines = content.split('\n');
            let currentSection = '';
            let inDependencies = false;
            let inDevDependencies = false;
            let inOptionalDependencies = false;
            let inToppings = false;

            for (const line of lines) {
                const trimmed = line.trim();
                
                // Check for section headers
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                    currentSection = trimmed.slice(1, -1);
                    inDependencies = currentSection === 'project.dependencies' || currentSection === 'dependencies';
                    inDevDependencies = currentSection.includes('dev') && currentSection.includes('dependencies');
                    inOptionalDependencies = currentSection.includes('optional') && currentSection.includes('dependencies');
                    inToppings = currentSection.includes('ramen.toppings');
                    continue;
                }

                // Parse dependency lines
                if (trimmed.includes('=') && (inDependencies || inDevDependencies || inOptionalDependencies || inToppings)) {
                    const match = trimmed.match(/^"?([^">=<~!]+)(?:[>=<~!].*?)?"?\s*=?\s*"?(.*)?"?$/);
                    if (match) {
                        const name = match[1].trim();
                        const version = match[2] ? match[2].replace(/[",]/g, '').trim() : undefined;
                        
                        let type: Dependency['type'] = 'dependency';
                        if (inDevDependencies) {type = 'dev-dependency';}
                        else if (inOptionalDependencies) {type = 'optional-dependency';}
                        else if (inToppings) {type = 'topping';}

                        dependencies.push({
                            name,
                            version,
                            type,
                            description: type === 'topping' ? 'Ramen topping extension' : undefined
                        });
                    }
                }

                // Handle dependencies array format
                if (trimmed.startsWith('"') && (inDependencies || inDevDependencies)) {
                    const match = trimmed.match(/^"([^">=<~!]+)(?:[>=<~!].*?)?"/);
                    if (match) {
                        const name = match[1].trim();
                        const versionMatch = trimmed.match(/[>=<~!]+([^"]+)/);
                        const version = versionMatch ? versionMatch[1] : undefined;

                        dependencies.push({
                            name,
                            version,
                            type: inDevDependencies ? 'dev-dependency' : 'dependency'
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error parsing pyproject.toml:', error);
        }

        return dependencies;
    }
}
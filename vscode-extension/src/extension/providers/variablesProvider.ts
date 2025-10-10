import * as vscode from 'vscode';

interface Variable {
    name: string;
    type: string;
    value: any;
    description?: string;
}

export class RamenVariablesProvider implements vscode.TreeDataProvider<Variable> {
    private _onDidChangeTreeData: vscode.EventEmitter<Variable | undefined | null | void> =
        new vscode.EventEmitter<Variable | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Variable | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private variables: Variable[] = [];

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Variable): vscode.TreeItem {
        const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);

        item.description = `${element.type}`;
        item.tooltip = new vscode.MarkdownString(
            `**${element.name}**\n\nType: \`${element.type}\`\n\nValue: \`${JSON.stringify(element.value)}\`${
                element.description ? `\n\n${element.description}` : ''
            }`
        );

        // Set icon based on variable type
        switch (element.type.toLowerCase()) {
            case 'string':
                item.iconPath = new vscode.ThemeIcon('symbol-string');
                break;
            case 'number':
            case 'int':
            case 'float':
                item.iconPath = new vscode.ThemeIcon('symbol-numeric');
                break;
            case 'boolean':
            case 'bool':
                item.iconPath = new vscode.ThemeIcon('symbol-boolean');
                break;
            case 'array':
            case 'list':
                item.iconPath = new vscode.ThemeIcon('symbol-array');
                break;
            case 'object':
            case 'dict':
                item.iconPath = new vscode.ThemeIcon('symbol-object');
                break;
            default:
                item.iconPath = new vscode.ThemeIcon('symbol-variable');
        }

        item.contextValue = 'ramenVariable';
        return item;
    }

    getChildren(element?: Variable): Thenable<Variable[]> {
        if (!element) {
            return Promise.resolve(this.variables);
        }
        return Promise.resolve([]);
    }

    updateVariables(variables: Variable[]): void {
        this.variables = variables;
        this.refresh();
    }

    clearVariables(): void {
        this.variables = [];
        this.refresh();
    }

    // Parse variables from graph data
    extractVariablesFromGraph(graphData: any): Variable[] {
        const variables: Variable[] = [];

        try {
            if (graphData && graphData.nodes) {
                graphData.nodes.forEach((node: any) => {
                    if (node.data && node.data.variables) {
                        Object.entries(node.data.variables).forEach(
                            ([name, value]: [string, any]) => {
                                variables.push({
                                    name,
                                    type: typeof value,
                                    value,
                                    description: `From node: ${node.data.label || node.id}`,
                                });
                            }
                        );
                    }
                });
            }
        } catch (error) {
            console.error('Error extracting variables from graph:', error);
        }

        return variables;
    }
}

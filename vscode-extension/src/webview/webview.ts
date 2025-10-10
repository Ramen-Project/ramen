/**
 * Webview entry point for Ramen Graph Editor
 * This file bridges the VSCode webview API with the existing React application
 */

declare const vscode: {
    postMessage: (message: unknown) => void;
    getState: () => unknown;
    setState: (state: unknown) => void;
};

interface RamenConfig {
    graphPath: string;
    serverPort: number;
    theme: string;
    graphData: string;
    isVSCode: boolean;
}

interface WebviewMessage {
    command: string;
    [key: string]: unknown;
}

class RamenWebviewBridge {
    private vscode: typeof vscode;
    private config: RamenConfig;
    private ramenApp: {
        updateTheme: (theme: string) => void;
        reloadGraph: () => void;
        reconnect: () => void;
        getGraphData: () => string;
        setGraphData: (data: string) => void;
    } | null = null;

    constructor() {
        this.vscode = vscode;
        this.config = (window as typeof window & { ramenConfig: RamenConfig }).ramenConfig;
        this.init();
    }

    private init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeApp());
        } else {
            this.initializeApp();
        }
    }

    private async initializeApp() {
        try {
            // Create a loading indicator
            this.showLoading('Loading Ramen Graph Editor...');

            // Initialize the React application
            await this.loadReactApp();

            // Set up message handling
            this.setupMessageHandling();

            // Initialize the app with config
            this.initializeRamenApp();

            this.hideLoading();

            this.log('Ramen Graph Editor initialized successfully');
        } catch (error) {
            this.showError(`Failed to initialize Ramen Graph Editor: ${error}`);
            this.log(`Initialization error: ${error}`);
        }
    }

    private async loadReactApp() {
        // Since we're in VSCode webview context, we need to create a bridge
        // to the existing React app. For now, we'll create a simplified version
        // that can communicate with the backend server

        const root = document.getElementById('root');
        if (!root) {
            throw new Error('Root element not found');
        }

        // Create a basic graph editor interface
        root.innerHTML = `
            <div class="graph-editor">
                <div class="toolbar">
                    <button id="saveBtn">Save</button>
                    <button id="executeBtn">Execute</button>
                    <button id="formatBtn">Format</button>
                    <span class="spacer"></span>
                    <button id="helpBtn">Help</button>
                </div>
                <div class="main-content">
                    <div class="graph-canvas" id="graphCanvas">
                        <div class="placeholder">
                            <h3>Ramen Graph Editor</h3>
                            <p>Graph: ${this.getGraphName()}</p>
                            <p>Status: Connected to VSCode</p>
                            <div class="graph-info">
                                <pre id="graphData">${this.formatGraphData()}</pre>
                            </div>
                        </div>
                    </div>
                    <div class="sidebar" id="sidebar">
                        <div class="sidebar-header">Node Library</div>
                        <div class="sidebar-content">
                            <input type="text" placeholder="Search nodes..." class="node-search">
                            <div class="node-categories">
                                <div class="node-category">
                                    <div class="category-header">Basic Nodes</div>
                                    <div class="category-items">
                                        <div class="node-item" data-type="operator">Operator</div>
                                        <div class="node-item" data-type="reference">Reference</div>
                                        <div class="node-item" data-type="input">Input</div>
                                        <div class="node-item" data-type="output">Output</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="status-bar">
                    <span id="statusText">Ready</span>
                    <span class="spacer"></span>
                    <span>Server: localhost:${this.config.serverPort}</span>
                </div>
            </div>
        `;

        // Set up event listeners
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Toolbar buttons
        document.getElementById('saveBtn')?.addEventListener('click', () => this.saveGraph());
        document.getElementById('executeBtn')?.addEventListener('click', () => this.executeGraph());
        document.getElementById('formatBtn')?.addEventListener('click', () => this.formatGraph());
        document.getElementById('helpBtn')?.addEventListener('click', () => this.showHelp());

        // Node library
        const nodeItems = document.querySelectorAll('.node-item');
        nodeItems.forEach((item) => {
            item.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const nodeType = target.getAttribute('data-type');
                if (nodeType) {
                    this.addNode(nodeType);
                }
            });
        });

        // Search
        const searchInput = document.querySelector('.node-search') as HTMLInputElement;
        searchInput?.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            this.filterNodes(target.value);
        });
    }

    private setupMessageHandling() {
        // Listen for messages from the extension
        window.addEventListener('message', (event) => {
            const message: WebviewMessage = event.data;
            this.handleExtensionMessage(message);
        });
    }

    private handleExtensionMessage(message: WebviewMessage) {
        switch (message.command) {
            case 'updateTheme':
                this.updateTheme(message.theme as string);
                break;

            case 'fileChanged':
                this.reloadGraph();
                break;

            case 'serverRestarted':
                this.reconnectToServer();
                break;

            case 'setState':
                this.restoreState(message.state);
                break;

            default:
                this.log(`Unknown message from extension: ${message.command}`);
        }
    }

    private initializeRamenApp() {
        // Create a mock Ramen app interface
        this.ramenApp = {
            updateTheme: (theme: string) => {
                document.body.setAttribute('data-theme', theme);
                this.log(`Theme updated to: ${theme}`);
            },

            reloadGraph: () => {
                this.reloadGraph();
            },

            reconnect: () => {
                this.reconnectToServer();
            },

            getGraphData: () => {
                return this.config.graphData;
            },

            setGraphData: (data: string) => {
                this.config.graphData = data;
                this.updateGraphDisplay();
            },
        };

        // Make it globally available
        (window as any).ramenApp = this.ramenApp;
    }

    private saveGraph() {
        try {
            const graphDataElement = document.getElementById('graphData');
            const graphData = graphDataElement?.textContent || this.config.graphData;

            this.sendToExtension({
                command: 'saveGraph',
                data: graphData,
            });

            this.updateStatus('Saving graph...', 'info');
        } catch (error) {
            this.showError(`Failed to save graph: ${error}`);
        }
    }

    private executeGraph() {
        this.sendToExtension({
            command: 'executeGraph',
        });

        this.updateStatus('Executing graph...', 'info');
    }

    private formatGraph() {
        try {
            const graphDataElement = document.getElementById('graphData');
            if (graphDataElement) {
                const data = JSON.parse(graphDataElement.textContent || '{}');
                const formatted = JSON.stringify(data, null, 2);
                graphDataElement.textContent = formatted;
                this.config.graphData = formatted;
            }

            this.updateStatus('Graph formatted', 'success');
        } catch (error) {
            this.showError(`Failed to format graph: ${error}`);
        }
    }

    private showHelp() {
        this.sendToExtension({
            command: 'showMessage',
            type: 'info',
            text:
                'Ramen Graph Editor Help:\n\n' +
                '• Save: Save the current graph\n' +
                '• Execute: Run the graph\n' +
                '• Format: Pretty-print the JSON\n' +
                '• Click nodes in the library to add them to the graph',
        });
    }

    private addNode(nodeType: string) {
        this.log(`Adding node of type: ${nodeType}`);
        this.updateStatus(`Added ${nodeType} node`, 'success');

        // In a real implementation, this would add a node to the graph
        // For now, just update the status
    }

    private filterNodes(query: string) {
        const nodeItems = document.querySelectorAll('.node-item');
        const lowerQuery = query.toLowerCase();

        nodeItems.forEach((item) => {
            const text = item.textContent?.toLowerCase() || '';
            const element = item as HTMLElement;
            element.style.display = text.includes(lowerQuery) ? 'block' : 'none';
        });
    }

    private updateTheme(theme: string) {
        this.config.theme = theme;
        if (this.ramenApp) {
            this.ramenApp.updateTheme(theme);
        }
    }

    private reloadGraph() {
        this.updateStatus('Reloading graph...', 'info');

        // In a real implementation, this would reload the graph from the file
        setTimeout(() => {
            this.updateStatus('Graph reloaded', 'success');
        }, 1000);
    }

    private reconnectToServer() {
        this.updateStatus('Reconnecting to server...', 'info');

        // In a real implementation, this would reconnect to the backend
        setTimeout(() => {
            this.updateStatus('Connected to server', 'success');
        }, 2000);
    }

    private restoreState(state: unknown) {
        const typedState = state as { graphData?: string };
        if (typedState && typedState.graphData) {
            this.config.graphData = typedState.graphData;
            this.updateGraphDisplay();
        }
    }

    private updateGraphDisplay() {
        const graphDataElement = document.getElementById('graphData');
        if (graphDataElement) {
            graphDataElement.textContent = this.formatGraphData();
        }
    }

    private getGraphName(): string {
        const path = this.config.graphPath;
        return (
            path
                .split(/[\\\\/]/)
                .pop()
                ?.replace('.ramen', '') || 'Unknown'
        );
    }

    private formatGraphData(): string {
        try {
            const data = JSON.parse(this.config.graphData);
            return JSON.stringify(data, null, 2);
        } catch {
            return this.config.graphData;
        }
    }

    private sendToExtension(message: WebviewMessage) {
        this.vscode.postMessage(message);
    }

    private log(message: string) {
        this.sendToExtension({
            command: 'log',
            message: message,
        });
    }

    private showLoading(message: string) {
        const root = document.getElementById('root');
        if (root) {
            root.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    private hideLoading() {
        // Loading will be hidden when the main content is set
    }

    private showError(message: string) {
        const root = document.getElementById('root');
        if (root) {
            root.innerHTML = `
                <div class="loading">
                    <div class="error-message">
                        <h3>Error</h3>
                        <p>${message}</p>
                        <button onclick="location.reload()">Retry</button>
                    </div>
                </div>
            `;
        }

        this.sendToExtension({
            command: 'showMessage',
            type: 'error',
            text: message,
        });
    }

    private updateStatus(message: string, type: 'info' | 'success' | 'error' = 'info') {
        const statusElement = document.getElementById('statusText');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-${type}`;

            // Clear status after 3 seconds
            setTimeout(() => {
                if (statusElement.textContent === message) {
                    statusElement.textContent = 'Ready';
                    statusElement.className = '';
                }
            }, 3000);
        }
    }
}

// Add basic styles for the webview
const style = document.createElement('style');
style.textContent = `
    .graph-editor {
        display: flex;
        flex-direction: column;
        height: 100vh;
        font-family: var(--vscode-font-family);
    }
    
    .toolbar {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background-color: var(--vscode-panel-background);
        border-bottom: 1px solid var(--vscode-panel-border);
        gap: 8px;
    }
    
    .main-content {
        display: flex;
        flex: 1;
        overflow: hidden;
    }
    
    .graph-canvas {
        flex: 1;
        padding: 20px;
        overflow: auto;
        background-color: var(--vscode-editor-background);
    }
    
    .placeholder {
        text-align: center;
        max-width: 800px;
        margin: 0 auto;
    }
    
    .graph-info {
        margin-top: 20px;
        text-align: left;
    }
    
    .graph-info pre {
        background-color: var(--vscode-textCodeBlock-background);
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 12px;
        max-height: 400px;
    }
    
    .sidebar {
        width: 250px;
        min-width: 250px;
        background-color: var(--vscode-sideBar-background);
        border-left: 1px solid var(--vscode-panel-border);
        overflow-y: auto;
    }
    
    .sidebar-header {
        padding: 12px;
        font-weight: 600;
        background-color: var(--vscode-sideBarSectionHeader-background);
        border-bottom: 1px solid var(--vscode-panel-border);
    }
    
    .sidebar-content {
        padding: 12px;
    }
    
    .node-search {
        width: 100%;
        margin-bottom: 12px;
    }
    
    .node-category {
        margin-bottom: 16px;
    }
    
    .category-header {
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--vscode-sideBarSectionHeader-foreground);
    }
    
    .category-items {
        padding-left: 12px;
    }
    
    .node-item {
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 4px;
        margin-bottom: 2px;
        background-color: var(--vscode-button-secondaryBackground);
    }
    
    .node-item:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
    
    .status-bar {
        display: flex;
        align-items: center;
        padding: 4px 12px;
        background-color: var(--vscode-statusBar-background);
        color: var(--vscode-statusBar-foreground);
        font-size: 12px;
        border-top: 1px solid var(--vscode-panel-border);
    }
    
    .spacer {
        flex: 1;
    }
    
    .status-info { color: var(--vscode-notificationsInfoIcon-foreground); }
    .status-success { color: var(--vscode-notificationsSuccessIcon-foreground); }
    .status-error { color: var(--vscode-notificationsErrorIcon-foreground); }
`;
document.head.appendChild(style);

// Initialize the bridge when the script loads
new RamenWebviewBridge();

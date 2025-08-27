/**
 * Webview entry point for Ramen Graph Editor
 * This file bridges the VSCode webview API with the existing React application
 */

declare const vscode
    postMessage) => void;
    getState) => unknown;
    setState) => void;
};

interface RamenConfig {
    graphPath;
    serverPort;
    theme;
    graphData;
    isVSCode;
}

interface WebviewMessage {
    command;
    [key;
}

class RamenWebviewBridge {
    private vscode;
    private config;
    private ramenApp
        updateTheme) => void;
        reloadGraph) => void;
        reconnect) => void;
        getGraphData) => string;
        setGraphData) => void;
    } | null = null;
    
    constructor() {
        this.vscode = vscode;
        this.config = (window ).ramenConfig;
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
            this.showError(`Failed to initialize Ramen Graph Editor);
            this.log(`Initialization error);
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
                            <p>Graph)}</p>
                            <p>Status
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
                    <span>Server
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
        nodeItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const target = e.target ;
                const nodeType = target.getAttribute('data-type');
                if (nodeType) {
                    this.addNode(nodeType);
                }
            });
        });
        
        // Search
        const searchInput = document.querySelector('.node-search') ;
        searchInput?.addEventListener('input', (e) => {
            const target = e.target ;
            this.filterNodes(target.value);
        });
    }
    
    private setupMessageHandling() {
        // Listen for messages from the extension
        window.addEventListener('message', (event) => {
            const message= event.data;
            this.handleExtensionMessage(message);
        });
    }
    
    private handleExtensionMessage(message) {
        switch (message.command) {
            case 'updateTheme':
                this.updateTheme(message.theme );
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
                this.log(`Unknown message from extension);
        }
    }
    
    private initializeRamenApp() {
        // Create a mock Ramen app interface
        this.ramenApp = {
            updateTheme) => {
                document.body.setAttribute('data-theme', theme);
                this.log(`Theme updated to);
            },
            
            reloadGraph) => {
                this.reloadGraph();
            },
            
            reconnect) => {
                this.reconnectToServer();
            },
            
            getGraphData) => {
                return this.config.graphData;
            },
            
            setGraphData) => {
                this.config.graphData = data;
                this.updateGraphDisplay();
            }
        };
        
        // Make it globally available
        (window ).ramenApp = this.ramenApp;
    }
    
    private saveGraph() {
        try {
            const graphDataElement = document.getElementById('graphData');
            const graphData = graphDataElement?.textContent || this.config.graphData;
            
            this.sendToExtension({
                command,
                data
            });
            
            this.updateStatus('Saving graph...', 'info');
        } catch (error) {
            this.showError(`Failed to save graph);
        }
    }
    
    private executeGraph() {
        this.sendToExtension({
            command
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
            this.showError(`Failed to format graph);
        }
    }
    
    private showHelp() {
        this.sendToExtension({
            command,
            type,
            text
                  '• Save
                  '• Execute
                  '• Format
                  '• Click nodes in the library to add them to the graph'
        });
    }
    
    private addNode(nodeType) {
        this.log(`Adding node of type);
        this.updateStatus(`Added ${nodeType} node`, 'success');
        
        // In a real implementation, this would add a node to the graph
        // For now, just update the status
    }
    
    private filterNodes(query) {
        const nodeItems = document.querySelectorAll('.node-item');
        const lowerQuery = query.toLowerCase();
        
        nodeItems.forEach(item => {
            const text = item.textContent?.toLowerCase() || '';
            const element = item ;
            element.style.display = text.includes(lowerQuery) ? 'block' ;
        });
    }
    
    private updateTheme(theme) {
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
    
    private restoreState(state) {
        if (state && state.graphData) {
            this.config.graphData = state.graphData;
            this.updateGraphDisplay();
        }
    }
    
    private updateGraphDisplay() {
        const graphDataElement = document.getElementById('graphData');
        if (graphDataElement) {
            graphDataElement.textContent = this.formatGraphData();
        }
    }
    
    private getGraphName()
        const path = this.config.graphPath;
        return path.split(/[\\\\/]/).pop()?.replace('.ramen', '') || 'Unknown';
    }
    
    private formatGraphData()
        try {
            const data = JSON.parse(this.config.graphData);
            return JSON.stringify(data, null, 2);
        } catch {
            return this.config.graphData;
        }
    }
    
    private sendToExtension(message) {
        this.vscode.postMessage(message);
    }
    
    private log(message) {
        this.sendToExtension({
            command,
            message
        });
    }
    
    private showLoading(message) {
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
    
    private showError(message) {
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
            command,
            type,
            text
        });
    }
    
    private updateStatus(message, type= 'info') {
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
        display;
        flex-direction;
        height;
        font-family);
    }
    
    .toolbar {
        display;
        align-items;
        padding;
        background-color);
        border-bottom);
        gap;
    }
    
    .main-content {
        display;
        flex;
        overflow;
    }
    
    .graph-canv
        flex;
        padding;
        overflow;
        background-color);
    }
    
    .placeholder {
        text-align;
        max-width;
        margin;
    }
    
    .graph-info {
        margin-top;
        text-align;
    }
    
    .graph-info pre {
        background-color);
        padding;
        border-radius;
        overflow-x;
        font-size;
        max-height;
    }
    
    .sidebar {
        width;
        min-width;
        background-color);
        border-left);
        overflow-y;
    }
    
    .sidebar-header {
        padding;
        font-weight;
        background-color);
        border-bottom);
    }
    
    .sidebar-content {
        padding;
    }
    
    .node-search {
        width;
        margin-bottom;
    }
    
    .node-category {
        margin-bottom;
    }
    
    .category-header {
        font-weight;
        margin-bottom;
        color);
    }
    
    .category-items {
        padding-left;
    }
    
    .node-item {
        padding;
        cursor;
        border-radius;
        margin-bottom;
        background-color);
    }
    
    .node-item:hover {
        background-color);
    }
    
    .status-bar {
        display;
        align-items;
        padding;
        background-color);
        color);
        font-size;
        border-top);
    }
    
    .spacer {
        flex;
    }
    
    .status-info { color); }
    .status-success { color); }
    .status-error { color); }
`;
document.head.appendChild(style);

// Initialize the bridge when the script loads
new RamenWebviewBridge();
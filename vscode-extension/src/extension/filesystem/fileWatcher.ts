import * as vscode from 'vscode';
import * as path from 'path';
import { RamenWebviewManager } from '../webview/webviewManager';

export class RamenFileWatcher {
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private documentListeners: vscode.Disposable[] = [];
    private conflictResolutionInProgress = new Set<string>();
    
    constructor(
        private context: vscode.ExtensionContext,
        private webviewManager: RamenWebviewManager
    ) {
        this.initialize();
    }
    
    private initialize() {
        // Watch for .ramen file changes
        this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.ramen');
        
        // File created
        this.fileWatcher.onDidCreate((uri) => {
            this.handleFileCreated(uri);
        });
        
        // File changed
        this.fileWatcher.onDidChange((uri) => {
            this.handleFileChanged(uri);
        });
        
        // File deleted
        this.fileWatcher.onDidDelete((uri) => {
            this.handleFileDeleted(uri);
        });
        
        // Watch for document saves
        this.documentListeners.push(
            vscode.workspace.onDidSaveTextDocument((document) => {
                if (document.fileName.endsWith('.ramen')) {
                    this.handleDocumentSaved(document);
                }
            })
        );
        
        // Watch for external changes to open documents
        this.documentListeners.push(
            vscode.workspace.onDidChangeTextDocument((e) => {
                if (e.document.fileName.endsWith('.ramen') && e.reason === undefined) {
                    // Change was external (not from this editor)
                    this.handleExternalChange(e.document);
                }
            })
        );
    }
    
    private handleFileCreated(uri: vscode.Uri) {
        console.log(`New .ramen file created: ${uri.fsPath}`);
        
        // Refresh graph provider
        // Graph provider removed - no refresh needed
        
        // Show notification
        const fileName = path.basename(uri.fsPath);
        vscode.window.showInformationMessage(
            `New graph created: ${fileName}`,
            'Open'
        ).then(selection => {
            if (selection === 'Open') {
                vscode.commands.executeCommand('ramen.openGraphEditor', uri);
            }
        });
    }
    
    private handleFileChanged(uri: vscode.Uri) {
        console.log(`Ramen file changed: ${uri.fsPath}`);
        
        // Notify webview manager of the change
        this.webviewManager.notifyFileChange(uri);
        
        // Check if this change conflicts with any open editors
        this.checkForConflicts(uri);
    }
    
    private handleFileDeleted(uri: vscode.Uri) {
        console.log(`Ramen file deleted: ${uri.fsPath}`);
        
        // Refresh graph provider
        // Graph provider removed - no refresh needed
        
        // Close any open webviews for this file
        this.webviewManager.closeGraph(uri);
        
        // Show notification
        const fileName = path.basename(uri.fsPath);
        vscode.window.showWarningMessage(`Graph deleted: ${fileName}`);
    }
    
    private handleDocumentSaved(document: vscode.TextDocument) {
        console.log(`Document saved: ${document.fileName}`);
        
        // Validate the saved content
        this.validateGraphContent(document);
        
        // Update any related views
        // Graph provider removed - no refresh needed
    }
    
    private handleExternalChange(document: vscode.TextDocument) {
        const uri = document.uri;
        
        // Skip if we're already handling a conflict for this file
        if (this.conflictResolutionInProgress.has(uri.fsPath)) {
            return;
        }
        
        console.log(`External change detected: ${document.fileName}`);
        
        // Check if there's an active webview for this file
        if (this.webviewManager.hasOpenGraph(uri)) {
            this.promptForReload(uri);
        }
    }
    
    private async checkForConflicts(uri: vscode.Uri) {
        // Check if document is open in text editor
        const textDocument = vscode.workspace.textDocuments.find(
            doc => doc.uri.toString() === uri.toString()
        );
        
        if (textDocument && textDocument.isDirty) {
            // Document has unsaved changes - potential conflict
            await this.handleConflict(uri);
        }
    }
    
    private async handleConflict(uri: vscode.Uri) {
        // Prevent multiple conflict resolutions for the same file
        if (this.conflictResolutionInProgress.has(uri.fsPath)) {
            return;
        }
        
        this.conflictResolutionInProgress.add(uri.fsPath);
        
        try {
            const fileName = path.basename(uri.fsPath);
            const choice = await vscode.window.showWarningMessage(
                `${fileName} has been modified externally. Your version has unsaved changes.`,
                'Keep Mine',
                'Use Theirs',
                'Compare'
            );
            
            switch (choice) {
                case 'Keep Mine':
                    // Save the current document
                    const doc = vscode.workspace.textDocuments.find(
                        d => d.uri.toString() === uri.toString()
                    );
                    if (doc) {
                        await doc.save();
                    }
                    break;
                    
                case 'Use Theirs':
                    // Reload from disk
                    await vscode.commands.executeCommand('workbench.action.files.revert', uri);
                    this.webviewManager.notifyFileChange(uri);
                    break;
                    
                case 'Compare':
                    // Open diff view
                    await vscode.commands.executeCommand('vscode.diff',
                        uri,
                        uri.with({ scheme: 'file' }),
                        `${fileName} (Workspace) ↔ ${fileName} (Disk)`
                    );
                    break;
            }
        } finally {
            this.conflictResolutionInProgress.delete(uri.fsPath);
        }
    }
    
    private async promptForReload(uri: vscode.Uri) {
        const fileName = path.basename(uri.fsPath);
        const choice = await vscode.window.showInformationMessage(
            `${fileName} has been modified externally. Reload the graph editor?`,
            'Reload',
            'Ignore'
        );
        
        if (choice === 'Reload') {
            this.webviewManager.reloadGraph(uri);
        }
    }
    
    private async validateGraphContent(document: vscode.TextDocument) {
        try {
            const content = document.getText();
            const json = JSON.parse(content);
            
            // Basic validation
            if (!json.version || !json.nodes || !json.edges) {
                vscode.window.showWarningMessage(
                    'Graph file may be incomplete. Missing required fields.'
                );
            }
            
            // Check for orphaned edges
            const nodeIds = new Set(json.nodes.map((n: any) => n.id));
            const orphanedEdges = json.edges.filter((e: any) => 
                !nodeIds.has(e.source) || !nodeIds.has(e.target)
            );
            
            if (orphanedEdges.length > 0) {
                vscode.window.showWarningMessage(
                    `Graph contains ${orphanedEdges.length} orphaned edge(s).`
                );
            }
        } catch (error) {
            // JSON parse error - the custom editor should handle this
            console.error('Graph validation error:', error);
        }
    }
    
    /**
     * Watch a specific file more closely
     */
    watchFile(uri: vscode.Uri): vscode.Disposable {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(uri.fsPath, '*')
        );
        
        const disposables: vscode.Disposable[] = [watcher];
        
        watcher.onDidChange(() => {
            console.log(`Watched file changed: ${uri.fsPath}`);
            this.handleFileChanged(uri);
        });
        
        return new vscode.Disposable(() => {
            disposables.forEach(d => d.dispose());
        });
    }
    
    dispose() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        
        this.documentListeners.forEach(listener => listener.dispose());
        this.documentListeners = [];
        
        this.conflictResolutionInProgress.clear();
    }
}
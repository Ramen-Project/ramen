import * as vscode from 'vscode';
import { RamenWebviewManager } from '../webview/webviewManager';
import { RamenServerManager } from '../server/serverManager';

/**
 * Custom editor provider for .ramen files
 * This makes Ramen graphs open in the visual editor by default
 */
export class RamenCustomEditorProvider implements vscode.CustomTextEditorProvider {

    constructor(
        private context: vscode.ExtensionContext,
        private webviewManager: RamenWebviewManager,
        private serverManager: RamenServerManager
    ) {}

    /**
     * Called when a custom editor is opened
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        console.log('Resolving custom text editor for:', document.uri.fsPath);
        
        // Use webviewManager to setup the webview with consistent implementation
        await this.webviewManager.setupCustomEditor(document.uri, webviewPanel, document);
    }

    // All webview handling is now delegated to webviewManager
    // The setupCustomEditor method will handle all message processing,
    // content generation, and lifecycle management
}
import * as vscode from 'vscode';
import { StateManager } from '../core/stateManager';
import { ErrorHandler } from '../core/errorHandler';
import { DIContainer, ServiceIdentifiers } from '../core/di/DIContainer';
import { RamenServerManager } from '../server/serverManager';
import { RamenWebviewManager } from '../webview/webviewManager';
import { RamenVariablesProvider } from '../providers/variablesProvider';
import { RamenServerProvider } from '../providers/serverProvider';
import { RamenDependenciesProvider } from '../providers/dependenciesProvider';

export interface CommandMetadata {
    id: string;
    title: string;
    category?: string;
    icon?: string;
    when?: string;
    keybinding?: string;
    enablement?: string;
}

export interface CommandContext {
    workspaceFolder?: vscode.WorkspaceFolder;
    activeEditor?: vscode.TextEditor;
    selectedFiles?: vscode.Uri[];
    stateManager: StateManager;
    extensionPath: string;
    subscriptions: vscode.Disposable[];
    // 服務注入 - 透過 DI 容器注入
    serverManager?: RamenServerManager;
    webviewManager?: RamenWebviewManager;
    webSocketManager?: any;
    wsManager?: any; // Alias for webSocketManager
    variablesProvider?: RamenVariablesProvider;
    serverProvider?: RamenServerProvider;
    dependenciesProvider?: RamenDependenciesProvider;
    sessionManager?: any; // SessionManager
}

export type CommandHandler = (context: CommandContext, ...args: any[]) => void | Promise<void>;

export interface RegisteredCommand {
    metadata: CommandMetadata;
    handler: CommandHandler;
    disposable?: vscode.Disposable;
}

/**
 * 命令中間件介面
 */
export type CommandMiddleware = (
    context: CommandContext,
    metadata: CommandMetadata,
    next: () => Promise<void>
) => Promise<void>;

export class CommandRegistry {
    private commands = new Map<string, RegisteredCommand>();
    private stateManager: StateManager;
    private errorHandler: ErrorHandler;
    private context: vscode.ExtensionContext;
    private container: DIContainer;
    private keybindingConfig: Map<string, string> = new Map();
    private middlewares: CommandMiddleware[] = [];

    constructor(
        context: vscode.ExtensionContext,
        stateManager: StateManager,
        errorHandler: ErrorHandler,
        container: DIContainer
    ) {
        this.context = context;
        this.stateManager = stateManager;
        this.errorHandler = errorHandler;
        this.container = container;
        this.loadKeybindings();
        this.setupDefaultMiddlewares();
    }

    /**
     * 設置預設中間件
     */
    private setupDefaultMiddlewares(): void {
        // Logging 中間件
        this.use(async (context, metadata, next) => {
            const startTime = Date.now();
            console.log(`[Command] Executing: ${metadata.title} (${metadata.id})`);

            try {
                await next();
                const duration = Date.now() - startTime;
                console.log(`[Command] Completed: ${metadata.title} (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`[Command] Failed: ${metadata.title} (${duration}ms)`, error);
                throw error;
            }
        });
    }

    /**
     * 添加中間件
     */
    use(middleware: CommandMiddleware): void {
        this.middlewares.push(middleware);
    }

    /**
     * 執行中間件鏈
     */
    private async executeMiddlewares(
        context: CommandContext,
        metadata: CommandMetadata,
        handler: CommandHandler,
        args: unknown[]
    ): Promise<void> {
        let index = 0;

        const executeNext = async (): Promise<void> => {
            if (index < this.middlewares.length) {
                const middleware = this.middlewares[index++];
                await middleware(context, metadata, executeNext);
            } else {
                // 執行實際的命令處理器
                await handler(context, ...args);
            }
        };

        await executeNext();
    }

    register(metadata: CommandMetadata, handler: CommandHandler): void {
        const fullCommandId = this.getFullCommandId(metadata.id);

        // Wrap handler with middleware and error handling
        const wrappedHandler = this.errorHandler.wrap(async (...args: unknown[]) => {
            const context = this.createCommandContext();
            await this.executeMiddlewares(context, metadata, handler, args);
        }, `Command: ${metadata.title}`);

        // Register with VSCode
        const disposable = vscode.commands.registerCommand(fullCommandId, wrappedHandler);

        this.context.subscriptions.push(disposable);

        // Store registration
        this.commands.set(fullCommandId, {
            metadata,
            handler,
            disposable,
        });

        // Register keybinding if specified
        if (metadata.keybinding) {
            this.registerKeybinding(fullCommandId, metadata.keybinding);
        }

        // Update command palette
        this.updateCommandPalette();
    }

    registerBatch(commands: Array<{ metadata: CommandMetadata; handler: CommandHandler }>): void {
        for (const { metadata, handler } of commands) {
            this.register(metadata, handler);
        }
    }

    unregister(commandId: string): void {
        const fullCommandId = this.getFullCommandId(commandId);
        const command = this.commands.get(fullCommandId);

        if (command) {
            command.disposable?.dispose();
            this.commands.delete(fullCommandId);
            this.updateCommandPalette();
        }
    }

    async execute(commandId: string, ...args: unknown[]): Promise<void> {
        const fullCommandId = this.getFullCommandId(commandId);

        try {
            await vscode.commands.executeCommand(fullCommandId, ...args);
        } catch (error) {
            this.errorHandler.handle(error as Error, `Failed to execute command: ${commandId}`);
        }
    }

    getCommand(commandId: string): RegisteredCommand | undefined {
        const fullCommandId = this.getFullCommandId(commandId);
        return this.commands.get(fullCommandId);
    }

    getAllCommands(): RegisteredCommand[] {
        return Array.from(this.commands.values());
    }

    getCommandsByCategory(category: string): RegisteredCommand[] {
        return this.getAllCommands().filter((cmd) => cmd.metadata.category === category);
    }

    isRegistered(commandId: string): boolean {
        const fullCommandId = this.getFullCommandId(commandId);
        return this.commands.has(fullCommandId);
    }

    private getFullCommandId(commandId: string): string {
        if (commandId.startsWith('ramen.')) {
            return commandId;
        }
        return `ramen.${commandId}`;
    }

    private createCommandContext(): CommandContext {
        return {
            workspaceFolder: vscode.workspace.workspaceFolders?.[0],
            activeEditor: vscode.window.activeTextEditor,
            selectedFiles: this.getSelectedFiles(),
            stateManager: this.stateManager,
            extensionPath: this.context.extensionPath,
            subscriptions: this.context.subscriptions,
            // 從 DI 容器解析服務
            serverManager: this.container.tryResolve<RamenServerManager>(
                ServiceIdentifiers.ServerService
            ),
            webviewManager: this.container.tryResolve<RamenWebviewManager>(
                ServiceIdentifiers.WebviewService
            ),
            webSocketManager: this.container.tryResolve(ServiceIdentifiers.WebSocketService),
            wsManager: this.container.tryResolve(ServiceIdentifiers.GlobalWebSocketManager) || this.container.tryResolve(ServiceIdentifiers.WebSocketService),
            variablesProvider: this.container.tryResolve<RamenVariablesProvider>(
                ServiceIdentifiers.VariablesProvider
            ),
            serverProvider: this.container.tryResolve<RamenServerProvider>(
                ServiceIdentifiers.ServerProvider
            ),
            dependenciesProvider: this.container.tryResolve<RamenDependenciesProvider>(
                ServiceIdentifiers.DependenciesProvider
            ),
            sessionManager: this.container.tryResolve(ServiceIdentifiers.SessionService),
        };
    }

    private getSelectedFiles(): vscode.Uri[] | undefined {
        // Try to get selected files from explorer
        const explorer = vscode.window.activeTextEditor;
        if (explorer) {
            return [explorer.document.uri];
        }
        return undefined;
    }

    private registerKeybinding(commandId: string, keybinding: string): void {
        this.keybindingConfig.set(commandId, keybinding);
        // Note: Actual keybinding registration happens in package.json
        // This is for runtime tracking and potential dynamic updates
    }

    private loadKeybindings(): void {
        const config = vscode.workspace.getConfiguration('ramen.keybindings');
        const customKeybindings = config.get<Record<string, string>>('custom', {});

        for (const [commandId, keybinding] of Object.entries(customKeybindings)) {
            this.keybindingConfig.set(commandId, keybinding);
        }
    }

    private updateCommandPalette(): void {
        // Trigger command palette refresh
        vscode.commands.executeCommand('setContext', 'ramen.commandsRegistered', true);

        // Update quick pick items for custom command palette
        const quickPickItems = this.getAllCommands().map((cmd) => ({
            label: cmd.metadata.title,
            description: cmd.metadata.category,
            detail: cmd.metadata.keybinding,
            commandId: cmd.metadata.id,
        }));

        this.stateManager.update('commands.quickPickItems', quickPickItems);
    }

    async showCommandPalette(): Promise<void> {
        const items = this.getAllCommands().map((cmd) => ({
            label: cmd.metadata.title,
            description: cmd.metadata.category,
            detail: cmd.metadata.keybinding ? `Keybinding: ${cmd.metadata.keybinding}` : undefined,
            commandId: this.getFullCommandId(cmd.metadata.id),
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a Ramen command to execute',
            matchOnDescription: true,
            matchOnDetail: true,
        });

        if (selected) {
            await this.execute(selected.commandId);
        }
    }

    async showCategoryPalette(category: string): Promise<void> {
        const items = this.getCommandsByCategory(category).map((cmd) => ({
            label: cmd.metadata.title,
            detail: cmd.metadata.keybinding ? `Keybinding: ${cmd.metadata.keybinding}` : undefined,
            commandId: this.getFullCommandId(cmd.metadata.id),
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Select a ${category} command`,
            matchOnDescription: true,
            matchOnDetail: true,
        });

        if (selected) {
            await this.execute(selected.commandId);
        }
    }

    exportCommandList(): CommandMetadata[] {
        return this.getAllCommands().map((cmd) => cmd.metadata);
    }

    getKeybinding(commandId: string): string | undefined {
        const fullCommandId = this.getFullCommandId(commandId);
        return this.keybindingConfig.get(fullCommandId);
    }

    async updateKeybinding(commandId: string, keybinding: string): Promise<void> {
        const fullCommandId = this.getFullCommandId(commandId);
        this.keybindingConfig.set(fullCommandId, keybinding);

        // Update user settings
        const config = vscode.workspace.getConfiguration('ramen.keybindings');
        const customKeybindings = config.get<Record<string, string>>('custom', {});
        customKeybindings[fullCommandId] = keybinding;

        await config.update('custom', customKeybindings, vscode.ConfigurationTarget.Global);
    }

    dispose(): void {
        for (const command of this.commands.values()) {
            command.disposable?.dispose();
        }
        this.commands.clear();
    }
}

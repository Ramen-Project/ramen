import * as vscode from 'vscode';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

/**
 * Error categories for different handling strategies
 */
export enum ErrorCategory {
    NETWORK = 'network',
    VALIDATION = 'validation',
    FILESYSTEM = 'filesystem',
    SERVER = 'server',
    WEBSOCKET = 'websocket',
    CONFIGURATION = 'configuration',
    UNKNOWN = 'unknown'
}

/**
 * Custom error class with additional context
 */
export class RamenError extends Error {
    constructor(
        message: string,
        public category: ErrorCategory = ErrorCategory.UNKNOWN,
        public severity: ErrorSeverity = ErrorSeverity.ERROR,
        public context?: any,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'RamenError';
        
        // Preserve original stack trace if available
        if (originalError?.stack) {
            this.stack = originalError.stack;
        }
    }
}

/**
 * Error recovery strategies
 */
interface ErrorRecoveryStrategy {
    canRecover(error: RamenError): boolean;
    recover(error: RamenError): Promise<boolean>;
}

/**
 * Unified error handler for the extension
 */
export class ErrorHandler {
    private static instance: ErrorHandler;
    private outputChannel: vscode.OutputChannel;
    private errorLog: RamenError[] = [];
    private maxLogSize = 100;
    private recoveryStrategies = new Map<ErrorCategory, ErrorRecoveryStrategy>();
    private errorHandlers = new Map<ErrorCategory, (error: RamenError) => void>();
    
    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Ramen Errors');
        this.setupDefaultStrategies();
    }
    
    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }
    
    /**
     * Main error handling method
     */
    handle(error: Error | RamenError, context?: string): void {
        const ramenError = this.normalizeError(error, context);
        
        // Log the error
        this.logError(ramenError);
        
        // Try to recover
        this.attemptRecovery(ramenError);
        
        // Execute category-specific handler
        const handler = this.errorHandlers.get(ramenError.category);
        if (handler) {
            handler(ramenError);
        }
        
        // Notify user if necessary
        this.notifyUser(ramenError);
        
        // Report telemetry (if implemented)
        this.reportTelemetry(ramenError);
    }
    
    /**
     * Handle async errors with proper error propagation
     */
    async handleAsync<T>(
        operation: () => Promise<T>,
        context?: string,
        defaultValue?: T
    ): Promise<T | undefined> {
        try {
            return await operation();
        } catch (error) {
            this.handle(error as Error, context);
            return defaultValue;
        }
    }
    
    /**
     * Wrap a function with error handling
     */
    wrap<T extends (...args: any[]) => any>(
        fn: T,
        context?: string
    ): T {
        return ((...args: Parameters<T>) => {
            try {
                const result = fn(...args);
                if (result instanceof Promise) {
                    return result.catch(error => {
                        this.handle(error, context);
                        throw error;
                    });
                }
                return result;
            } catch (error) {
                this.handle(error as Error, context);
                throw error;
            }
        }) as T;
    }
    
    /**
     * Register a custom error handler for a category
     */
    registerHandler(category: ErrorCategory, handler: (error: RamenError) => void): void {
        this.errorHandlers.set(category, handler);
    }
    
    /**
     * Register a recovery strategy for a category
     */
    registerRecoveryStrategy(category: ErrorCategory, strategy: ErrorRecoveryStrategy): void {
        this.recoveryStrategies.set(category, strategy);
    }
    
    /**
     * Convert any error to RamenError
     */
    private normalizeError(error: Error | RamenError, context?: string): RamenError {
        if (error instanceof RamenError) {
            if (context && !error.context) {
                error.context = context;
            }
            return error;
        }
        
        // Categorize based on error message or type
        const category = this.categorizeError(error);
        const severity = this.determineSeverity(error, category);
        
        return new RamenError(
            error.message,
            category,
            severity,
            context,
            error
        );
    }
    
    /**
     * Categorize errors based on their characteristics
     */
    private categorizeError(error: Error): ErrorCategory {
        const message = error.message.toLowerCase();
        
        if (message.includes('econnrefused') || 
            message.includes('network') || 
            message.includes('fetch')) {
            return ErrorCategory.NETWORK;
        }
        
        if (message.includes('invalid') || 
            message.includes('validation') || 
            message.includes('parse')) {
            return ErrorCategory.VALIDATION;
        }
        
        if (message.includes('enoent') || 
            message.includes('file') || 
            message.includes('directory')) {
            return ErrorCategory.FILESYSTEM;
        }
        
        if (message.includes('server') || 
            message.includes('backend')) {
            return ErrorCategory.SERVER;
        }
        
        if (message.includes('websocket') || 
            message.includes('ws')) {
            return ErrorCategory.WEBSOCKET;
        }
        
        if (message.includes('config') || 
            message.includes('setting')) {
            return ErrorCategory.CONFIGURATION;
        }
        
        return ErrorCategory.UNKNOWN;
    }
    
    /**
     * Determine error severity
     */
    private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
        // Critical errors that require immediate attention
        if (category === ErrorCategory.SERVER && 
            error.message.includes('crashed')) {
            return ErrorSeverity.CRITICAL;
        }
        
        // Warnings that don't block functionality
        if (category === ErrorCategory.CONFIGURATION) {
            return ErrorSeverity.WARNING;
        }
        
        // Default to error
        return ErrorSeverity.ERROR;
    }
    
    /**
     * Log error to output channel and internal log
     */
    private logError(error: RamenError): void {
        // Add to internal log
        this.errorLog.push(error);
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }
        
        // Format error for output
        const timestamp = new Date().toISOString();
        const logEntry = [
            `[${timestamp}] ${error.severity.toUpperCase()}: ${error.message}`,
            `Category: ${error.category}`,
            error.context ? `Context: ${error.context}` : '',
            error.stack ? `Stack: ${error.stack}` : ''
        ].filter(Boolean).join('\n');
        
        this.outputChannel.appendLine(logEntry);
        this.outputChannel.appendLine('---');
        
        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error(error);
        }
    }
    
    /**
     * Attempt to recover from error
     */
    private async attemptRecovery(error: RamenError): Promise<void> {
        const strategy = this.recoveryStrategies.get(error.category);
        if (strategy && strategy.canRecover(error)) {
            try {
                const recovered = await strategy.recover(error);
                if (recovered) {
                    this.outputChannel.appendLine(`Successfully recovered from ${error.category} error`);
                }
            } catch (recoveryError) {
                this.outputChannel.appendLine(`Recovery failed: ${recoveryError}`);
            }
        }
    }
    
    /**
     * Notify user about the error
     */
    private notifyUser(error: RamenError): void {
        const showDetails = 'Show Details';
        const showLog = 'Show Error Log';
        
        switch (error.severity) {
            case ErrorSeverity.CRITICAL:
                vscode.window.showErrorMessage(
                    `Critical Error: ${error.message}`,
                    showDetails,
                    showLog
                ).then(selection => this.handleUserSelection(selection, error));
                break;
                
            case ErrorSeverity.ERROR:
                // Only show errors that affect user experience
                if (this.shouldNotifyUser(error)) {
                    vscode.window.showErrorMessage(
                        error.message,
                        showDetails
                    ).then(selection => this.handleUserSelection(selection, error));
                }
                break;
                
            case ErrorSeverity.WARNING:
                vscode.window.showWarningMessage(error.message);
                break;
                
            case ErrorSeverity.INFO:
                vscode.window.showInformationMessage(error.message);
                break;
        }
    }
    
    /**
     * Determine if user should be notified
     */
    private shouldNotifyUser(error: RamenError): boolean {
        // Don't notify for transient network errors
        if (error.category === ErrorCategory.NETWORK) {
            return false;
        }
        
        // Don't notify for internal errors
        if (error.context?.includes('internal')) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Handle user selection from error notification
     */
    private handleUserSelection(selection: string | undefined, error: RamenError): void {
        if (selection === 'Show Details') {
            this.showErrorDetails(error);
        } else if (selection === 'Show Error Log') {
            this.outputChannel.show();
        }
    }
    
    /**
     * Show detailed error information
     */
    private showErrorDetails(error: RamenError): void {
        const details = [
            `**Error:** ${error.message}`,
            `**Category:** ${error.category}`,
            `**Severity:** ${error.severity}`,
            error.context ? `**Context:** ${error.context}` : '',
            '',
            '**Stack Trace:**',
            '```',
            error.stack || 'No stack trace available',
            '```'
        ].filter(Boolean).join('\n');
        
        vscode.workspace.openTextDocument({
            content: details,
            language: 'markdown'
        }).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }
    
    /**
     * Report telemetry (placeholder for future implementation)
     */
    private reportTelemetry(error: RamenError): void {
        // TODO: Implement telemetry reporting
        // This could send anonymized error data to help improve the extension
    }
    
    /**
     * Setup default recovery strategies
     */
    private setupDefaultStrategies(): void {
        // Network error recovery
        this.recoveryStrategies.set(ErrorCategory.NETWORK, {
            canRecover: (error) => error.message.includes('ECONNREFUSED'),
            recover: async (error) => {
                // Try to restart the server
                const serverManager = await this.getServerManager();
                if (serverManager) {
                    return await serverManager.ensureServerRunning();
                }
                return false;
            }
        });
        
        // WebSocket error recovery
        this.recoveryStrategies.set(ErrorCategory.WEBSOCKET, {
            canRecover: (error) => true,
            recover: async (error) => {
                // Try to reconnect WebSocket
                const wsManager = await this.getWebSocketManager();
                if (wsManager) {
                    await wsManager.connect();
                    return wsManager.isConnected();
                }
                return false;
            }
        });
    }
    
    /**
     * Get server manager instance (to avoid circular dependency)
     */
    private async getServerManager(): Promise<any> {
        // This will be injected or retrieved from global context
        return (global as any).ramenServerManager;
    }
    
    /**
     * Get WebSocket manager instance
     */
    private async getWebSocketManager(): Promise<any> {
        // This will be injected or retrieved from global context
        return (global as any).ramenWebSocketManager;
    }
    
    /**
     * Get recent errors for debugging
     */
    getRecentErrors(count: number = 10): RamenError[] {
        return this.errorLog.slice(-count);
    }
    
    /**
     * Clear error log
     */
    clearErrorLog(): void {
        this.errorLog = [];
        this.outputChannel.clear();
    }
    
    /**
     * Export error log to file
     */
    async exportErrorLog(): Promise<void> {
        const content = this.errorLog.map(error => ({
            timestamp: new Date().toISOString(),
            message: error.message,
            category: error.category,
            severity: error.severity,
            context: error.context,
            stack: error.stack
        }));
        
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('ramen-errors.json'),
            filters: {
                'JSON': ['json']
            }
        });
        
        if (uri) {
            await vscode.workspace.fs.writeFile(
                uri,
                Buffer.from(JSON.stringify(content, null, 2))
            );
            vscode.window.showInformationMessage('Error log exported successfully');
        }
    }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
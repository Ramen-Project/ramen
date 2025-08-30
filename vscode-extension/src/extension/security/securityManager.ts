import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Security manager for Ramen extension
 * Handles sandboxing, code signing, and permission control
 */
export class SecurityManager {
    private static instance: SecurityManager;
    private permissions = new Map<string, PermissionSet>();
    private trustedSources = new Set<string>();
    private sandboxes = new Map<string, Sandbox>();
    private auditLog: SecurityAuditEntry[] = [];
    
    private constructor(private context: vscode.ExtensionContext) {
        this.loadSecurityConfiguration();
    }
    
    static getInstance(context?: vscode.ExtensionContext): SecurityManager {
        if (!this.instance) {
            if (!context) {
                throw new Error('Context required for SecurityManager initialization');
            }
            this.instance = new SecurityManager(context);
        }
        return this.instance;
    }
    
    /**
     * Create a sandboxed execution environment
     */
    async createSandbox(id: string, options: SandboxOptions = {}): Promise<Sandbox> {
        const sandbox: Sandbox = {
            id,
            permissions: options.permissions || this.getDefaultPermissions(),
            resourceLimits: options.resourceLimits || this.getDefaultResourceLimits(),
            isolationLevel: options.isolationLevel || IsolationLevel.STANDARD,
            created: new Date(),
            lastAccessed: new Date()
        };
        
        this.sandboxes.set(id, sandbox);
        this.audit('sandbox_created', { sandboxId: id, options });
        
        return sandbox;
    }
    
    /**
     * Execute code in a sandboxed environment
     */
    async executeInSandbox<T>(
        sandboxId: string,
        code: string,
        context: any = {}
    ): Promise<T> {
        const sandbox = this.sandboxes.get(sandboxId);
        if (!sandbox) {
            throw new SecurityError('Sandbox not found', 'SANDBOX_NOT_FOUND');
        }
        
        // Update last accessed time
        sandbox.lastAccessed = new Date();
        
        // Check if code is safe
        const validation = await this.validateCode(code);
        if (!validation.safe) {
            throw new SecurityError(
                `Code validation failed: ${validation.reason}`,
                'CODE_VALIDATION_FAILED'
            );
        }
        
        // Check permissions
        const requiredPermissions = this.analyzeRequiredPermissions(code);
        if (!this.hasPermissions(sandbox.permissions, requiredPermissions)) {
            throw new SecurityError(
                'Insufficient permissions for code execution',
                'INSUFFICIENT_PERMISSIONS'
            );
        }
        
        this.audit('code_executed', {
            sandboxId,
            codeHash: this.hashCode(code),
            permissions: requiredPermissions
        });
        
        // Execute with isolation (simplified - real implementation would use VM or worker)
        try {
            // Create restricted global context
            const restrictedGlobal = this.createRestrictedGlobal(sandbox.permissions);
            
            // Execute code (this is simplified - real sandboxing is more complex)
            const fn = new Function(...Object.keys(restrictedGlobal), code);
            return fn(...Object.values(restrictedGlobal));
        } catch (error) {
            this.audit('execution_failed', {
                sandboxId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    
    /**
     * Verify code signature
     */
    async verifyCodeSignature(
        code: string,
        signature: string,
        publicKey?: string
    ): Promise<boolean> {
        try {
            const key = publicKey || await this.getDefaultPublicKey();
            const verify = crypto.createVerify('SHA256');
            verify.update(code);
            verify.end();
            
            const isValid = verify.verify(key, signature, 'hex');
            
            this.audit('signature_verified', {
                codeHash: this.hashCode(code),
                valid: isValid
            });
            
            return isValid;
        } catch (error) {
            this.audit('signature_verification_failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    
    /**
     * Sign code with private key
     */
    async signCode(code: string, privateKey?: string): Promise<string> {
        try {
            const key = privateKey || await this.getDefaultPrivateKey();
            const sign = crypto.createSign('SHA256');
            sign.update(code);
            sign.end();
            
            const signature = sign.sign(key, 'hex');
            
            this.audit('code_signed', {
                codeHash: this.hashCode(code)
            });
            
            return signature;
        } catch (error) {
            this.audit('code_signing_failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    
    /**
     * Check if a source is trusted
     */
    isTrustedSource(source: string): boolean {
        return this.trustedSources.has(source);
    }
    
    /**
     * Add a trusted source
     */
    async addTrustedSource(source: string, verification?: string): Promise<void> {
        // Verify the source if verification provided
        if (verification) {
            const isValid = await this.verifySource(source, verification);
            if (!isValid) {
                throw new SecurityError('Source verification failed', 'SOURCE_VERIFICATION_FAILED');
            }
        }
        
        this.trustedSources.add(source);
        await this.saveSecurityConfiguration();
        
        this.audit('trusted_source_added', { source });
    }
    
    /**
     * Grant permissions
     */
    grantPermissions(target: string, permissions: Permission[]): void {
        const current = this.permissions.get(target) || { permissions: [] };
        const newPermissions = new Set([...current.permissions, ...permissions]);
        
        this.permissions.set(target, {
            permissions: Array.from(newPermissions)
        });
        
        this.audit('permissions_granted', { target, permissions });
    }
    
    /**
     * Revoke permissions
     */
    revokePermissions(target: string, permissions?: Permission[]): void {
        if (!permissions) {
            // Revoke all permissions
            this.permissions.delete(target);
            this.audit('all_permissions_revoked', { target });
        } else {
            const current = this.permissions.get(target);
            if (current) {
                const remaining = current.permissions.filter(
                    p => !permissions.includes(p)
                );
                
                if (remaining.length > 0) {
                    this.permissions.set(target, { permissions: remaining });
                } else {
                    this.permissions.delete(target);
                }
                
                this.audit('permissions_revoked', { target, permissions });
            }
        }
    }
    
    /**
     * Get security audit log
     */
    getAuditLog(filter?: AuditFilter): SecurityAuditEntry[] {
        let entries = [...this.auditLog];
        
        if (filter) {
            if (filter.startDate) {
                entries = entries.filter(e => e.timestamp >= filter.startDate!);
            }
            if (filter.endDate) {
                entries = entries.filter(e => e.timestamp <= filter.endDate!);
            }
            if (filter.action) {
                entries = entries.filter(e => e.action === filter.action);
            }
            if (filter.severity) {
                entries = entries.filter(e => e.severity === filter.severity);
            }
        }
        
        return entries;
    }
    
    /**
     * Clear old sandboxes
     */
    cleanupSandboxes(maxAge: number = 3600000): void {
        const now = Date.now();
        const toRemove: string[] = [];
        
        this.sandboxes.forEach((sandbox, id) => {
            if (now - sandbox.lastAccessed.getTime() > maxAge) {
                toRemove.push(id);
            }
        });
        
        toRemove.forEach(id => {
            this.sandboxes.delete(id);
            this.audit('sandbox_cleaned', { sandboxId: id });
        });
    }
    
    private validateCode(code: string): { safe: boolean; reason?: string } {
        // Basic code validation (real implementation would be more sophisticated)
        const dangerousPatterns = [
            /eval\s*\(/,
            /Function\s*\(/,
            /require\s*\(['"]\s*child_process/,
            /require\s*\(['"]\s*fs/,
            /__proto__/,
            /process\.\s*exit/
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(code)) {
                return {
                    safe: false,
                    reason: `Dangerous pattern detected: ${pattern}`
                };
            }
        }
        
        return { safe: true };
    }
    
    private analyzeRequiredPermissions(code: string): Permission[] {
        const permissions: Permission[] = [];
        
        // Analyze code for required permissions
        if (/fetch|XMLHttpRequest/.test(code)) {
            permissions.push(Permission.NETWORK);
        }
        if (/localStorage|sessionStorage/.test(code)) {
            permissions.push(Permission.STORAGE);
        }
        if (/require|import/.test(code)) {
            permissions.push(Permission.MODULES);
        }
        
        return permissions;
    }
    
    private hasPermissions(
        available: Permission[],
        required: Permission[]
    ): boolean {
        return required.every(p => available.includes(p));
    }
    
    private createRestrictedGlobal(permissions: Permission[]): any {
        const restricted: any = {
            console: {
                log: console.log,
                error: console.error,
                warn: console.warn
            },
            Math: Math,
            Date: Date,
            JSON: JSON
        };
        
        // Add based on permissions
        if (permissions.includes(Permission.NETWORK)) {
            restricted.fetch = fetch;
        }
        
        return restricted;
    }
    
    private hashCode(code: string): string {
        return crypto.createHash('sha256').update(code).digest('hex');
    }
    
    private async verifySource(source: string, verification: string): Promise<boolean> {
        // Implement source verification logic
        return true;
    }
    
    private getDefaultPermissions(): Permission[] {
        return [Permission.EXECUTION];
    }
    
    private getDefaultResourceLimits(): ResourceLimits {
        return {
            maxMemory: 128 * 1024 * 1024, // 128MB
            maxCpu: 0.5,
            maxTime: 30000, // 30 seconds
            maxFileSize: 10 * 1024 * 1024 // 10MB
        };
    }
    
    private async getDefaultPublicKey(): Promise<string> {
        // In real implementation, load from secure storage
        return 'public-key-placeholder';
    }
    
    private async getDefaultPrivateKey(): Promise<string> {
        // In real implementation, load from secure storage
        return 'private-key-placeholder';
    }
    
    private audit(
        action: string,
        details: any,
        severity: AuditSeverity = AuditSeverity.INFO
    ): void {
        const entry: SecurityAuditEntry = {
            timestamp: new Date(),
            action,
            details,
            severity
        };
        
        this.auditLog.push(entry);
        
        // Keep only last 1000 entries
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(-1000);
        }
        
        // Log critical events
        if (severity === AuditSeverity.CRITICAL) {
            console.error('[SECURITY CRITICAL]', action, details);
        }
    }
    
    private async loadSecurityConfiguration(): Promise<void> {
        try {
            const configPath = path.join(
                this.context.globalStorageUri.fsPath,
                'security.json'
            );
            
            if (fs.existsSync(configPath)) {
                const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                
                if (data.trustedSources) {
                    this.trustedSources = new Set(data.trustedSources);
                }
                
                if (data.permissions) {
                    this.permissions = new Map(Object.entries(data.permissions));
                }
            }
        } catch (error) {
            console.error('Failed to load security configuration:', error);
        }
    }
    
    private async saveSecurityConfiguration(): Promise<void> {
        try {
            const configPath = path.join(
                this.context.globalStorageUri.fsPath,
                'security.json'
            );
            
            const data = {
                trustedSources: Array.from(this.trustedSources),
                permissions: Object.fromEntries(this.permissions)
            };
            
            fs.mkdirSync(path.dirname(configPath), { recursive: true });
            fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save security configuration:', error);
        }
    }
}

export enum Permission {
    EXECUTION = 'execution',
    NETWORK = 'network',
    STORAGE = 'storage',
    FILE_SYSTEM = 'file_system',
    MODULES = 'modules',
    SYSTEM = 'system',
    DEBUGGING = 'debugging'
}

export enum IsolationLevel {
    NONE = 'none',
    STANDARD = 'standard',
    STRICT = 'strict',
    MAXIMUM = 'maximum'
}

export enum AuditSeverity {
    DEBUG = 'debug',
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

export interface Sandbox {
    id: string;
    permissions: Permission[];
    resourceLimits: ResourceLimits;
    isolationLevel: IsolationLevel;
    created: Date;
    lastAccessed: Date;
}

export interface SandboxOptions {
    permissions?: Permission[];
    resourceLimits?: ResourceLimits;
    isolationLevel?: IsolationLevel;
}

export interface ResourceLimits {
    maxMemory?: number;
    maxCpu?: number;
    maxTime?: number;
    maxFileSize?: number;
}

export interface PermissionSet {
    permissions: Permission[];
}

export interface SecurityAuditEntry {
    timestamp: Date;
    action: string;
    details: any;
    severity: AuditSeverity;
}

export interface AuditFilter {
    startDate?: Date;
    endDate?: Date;
    action?: string;
    severity?: AuditSeverity;
}

export class SecurityError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'SecurityError';
    }
}
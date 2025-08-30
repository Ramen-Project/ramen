import * as vscode from 'vscode';
import { errorHandler, RamenError, ErrorCategory, ErrorSeverity } from './errorHandler';
import { RamenServerManager } from '../server/serverManager';

/**
 * Version information
 */
export interface VersionInfo {
    extension: string;
    backend: string | null;
    minimumBackend: string;
    maximumBackend?: string;
    features: string[];
}

/**
 * Feature compatibility
 */
export interface FeatureCompatibility {
    feature: string;
    minVersion: string;
    maxVersion?: string;
    deprecated?: boolean;
    replacement?: string;
}

/**
 * Compatibility check result
 */
export interface CompatibilityResult {
    compatible: boolean;
    warnings: string[];
    errors: string[];
    suggestions: string[];
    requiredActions: string[];
}

/**
 * Migration rule
 */
export interface MigrationRule {
    fromVersion: string;
    toVersion: string;
    migrate: (data: any) => any;
    description: string;
}

/**
 * Version manager for handling compatibility
 */
export class VersionManager {
    private static instance: VersionManager;
    private extensionVersion: string;
    private backendVersion: string | null = null;
    private featureMap = new Map<string, FeatureCompatibility>();
    private migrationRules: MigrationRule[] = [];
    private outputChannel: vscode.OutputChannel;
    
    // Version compatibility matrix
    private readonly compatibilityMatrix: Record<string, {
        minBackend: string;
        maxBackend?: string;
        features: string[];
    }> = {
        '0.1.0': {
            minBackend: '0.1.0',
            maxBackend: '0.2.0',
            features: ['basic-graph', 'execution', 'websocket']
        },
        '0.2.0': {
            minBackend: '0.2.0',
            maxBackend: '0.3.0',
            features: ['basic-graph', 'execution', 'websocket', 'toppings', 'class-definition']
        },
        '0.3.0': {
            minBackend: '0.3.0',
            features: ['basic-graph', 'execution', 'websocket', 'toppings', 'class-definition', 'state-management']
        }
    };
    
    private constructor(
        private context: vscode.ExtensionContext,
        private serverManager?: RamenServerManager
    ) {
        this.outputChannel = vscode.window.createOutputChannel('Ramen Version');
        this.extensionVersion = this.getExtensionVersion();
        this.setupFeatureMap();
        this.setupMigrationRules();
    }
    
    static getInstance(
        context: vscode.ExtensionContext,
        serverManager?: RamenServerManager
    ): VersionManager {
        if (!VersionManager.instance) {
            VersionManager.instance = new VersionManager(context, serverManager);
        }
        return VersionManager.instance;
    }
    
    /**
     * Check overall compatibility
     */
    async checkCompatibility(): Promise<CompatibilityResult> {
        const result: CompatibilityResult = {
            compatible: true,
            warnings: [],
            errors: [],
            suggestions: [],
            requiredActions: []
        };
        
        try {
            // Get backend version
            await this.fetchBackendVersion();
            
            if (!this.backendVersion) {
                result.warnings.push('Backend version could not be determined');
                result.suggestions.push('Ensure the backend server is running');
                return result;
            }
            
            // Check version compatibility
            const versionCheck = this.checkVersionCompatibility();
            result.compatible = versionCheck.compatible;
            result.warnings.push(...versionCheck.warnings);
            result.errors.push(...versionCheck.errors);
            
            // Check feature compatibility
            const featureCheck = this.checkFeatureCompatibility();
            result.warnings.push(...featureCheck.warnings);
            result.errors.push(...featureCheck.errors);
            
            // Check for available updates
            const updateCheck = await this.checkForUpdates();
            if (updateCheck.updateAvailable) {
                result.suggestions.push(
                    `Update available: ${updateCheck.latestVersion} (current: ${this.extensionVersion})`
                );
            }
            
            // Add migration suggestions if needed
            if (this.needsMigration()) {
                result.requiredActions.push('Data migration required for full compatibility');
            }
            
            this.logCompatibilityResult(result);
            
        } catch (error) {
            errorHandler.handle(
                new RamenError(
                    `Compatibility check failed: ${error}`,
                    ErrorCategory.UNKNOWN,
                    ErrorSeverity.WARNING
                )
            );
            result.errors.push(`Compatibility check error: ${error}`);
            result.compatible = false;
        }
        
        return result;
    }
    
    /**
     * Check if a specific feature is available
     */
    isFeatureAvailable(feature: string): boolean {
        const compatibility = this.featureMap.get(feature);
        
        if (!compatibility) {
            return false;
        }
        
        if (!this.backendVersion) {
            return false;
        }
        
        const backendSatisfies = semver.satisfies(
            this.backendVersion,
            `>=${compatibility.minVersion}${
                compatibility.maxVersion ? ` <=${compatibility.maxVersion}` : ''
            }`
        );
        
        return backendSatisfies && !compatibility.deprecated;
    }
    
    /**
     * Get feature status
     */
    getFeatureStatus(feature: string): {
        available: boolean;
        deprecated: boolean;
        replacement?: string;
        message: string;
    } {
        const compatibility = this.featureMap.get(feature);
        
        if (!compatibility) {
            return {
                available: false,
                deprecated: false,
                message: `Feature '${feature}' is not recognized`
            };
        }
        
        const available = this.isFeatureAvailable(feature);
        
        let message = '';
        if (compatibility.deprecated) {
            message = `Feature '${feature}' is deprecated`;
            if (compatibility.replacement) {
                message += `. Use '${compatibility.replacement}' instead`;
            }
        } else if (!available) {
            message = `Feature '${feature}' requires backend version ${compatibility.minVersion} or higher`;
        } else {
            message = `Feature '${feature}' is available`;
        }
        
        return {
            available,
            deprecated: compatibility.deprecated || false,
            replacement: compatibility.replacement,
            message
        };
    }
    
    /**
     * Migrate data to new version format
     */
    async migrateData<T = any>(data: T, fromVersion: string, toVersion: string): Promise<T> {
        let migratedData = data;
        
        // Find applicable migration rules
        const applicableRules = this.migrationRules.filter(rule => {
            const fromSatisfies = semver.gte(fromVersion, rule.fromVersion);
            const toSatisfies = semver.lte(toVersion, rule.toVersion);
            return fromSatisfies && toSatisfies;
        });
        
        // Sort rules by version
        applicableRules.sort((a, b) => 
            semver.compare(a.fromVersion, b.fromVersion)
        );
        
        // Apply migrations in order
        for (const rule of applicableRules) {
            try {
                this.outputChannel.appendLine(
                    `Applying migration: ${rule.description}`
                );
                migratedData = rule.migrate(migratedData);
            } catch (error) {
                throw new RamenError(
                    `Migration failed: ${rule.description}`,
                    ErrorCategory.UNKNOWN,
                    ErrorSeverity.ERROR,
                    { rule, error }
                );
            }
        }
        
        return migratedData;
    }
    
    /**
     * Show compatibility report to user
     */
    async showCompatibilityReport(): Promise<void> {
        const result = await this.checkCompatibility();
        
        const report = [
            '# Ramen Compatibility Report',
            '',
            `**Extension Version:** ${this.extensionVersion}`,
            `**Backend Version:** ${this.backendVersion || 'Unknown'}`,
            `**Compatibility:** ${result.compatible ? '✅ Compatible' : '❌ Incompatible'}`,
            ''
        ];
        
        if (result.errors.length > 0) {
            report.push('## Errors');
            result.errors.forEach(error => report.push(`- ❌ ${error}`));
            report.push('');
        }
        
        if (result.warnings.length > 0) {
            report.push('## Warnings');
            result.warnings.forEach(warning => report.push(`- ⚠️ ${warning}`));
            report.push('');
        }
        
        if (result.suggestions.length > 0) {
            report.push('## Suggestions');
            result.suggestions.forEach(suggestion => report.push(`- 💡 ${suggestion}`));
            report.push('');
        }
        
        if (result.requiredActions.length > 0) {
            report.push('## Required Actions');
            result.requiredActions.forEach(action => report.push(`- 🔧 ${action}`));
            report.push('');
        }
        
        // Feature availability
        report.push('## Feature Availability');
        for (const [feature, compatibility] of this.featureMap) {
            const status = this.getFeatureStatus(feature);
            const icon = status.available ? '✅' : status.deprecated ? '⚠️' : '❌';
            report.push(`- ${icon} ${feature}: ${status.message}`);
        }
        
        const document = await vscode.workspace.openTextDocument({
            content: report.join('\n'),
            language: 'markdown'
        });
        
        await vscode.window.showTextDocument(document);
    }
    
    // Private methods
    
    private getExtensionVersion(): string {
        const packageJson = vscode.extensions.getExtension('ramen.ramen-vscode')?.packageJSON;
        return packageJson?.version || '0.1.0';
    }
    
    private async fetchBackendVersion(): Promise<void> {
        if (!this.serverManager || !this.serverManager.isRunning()) {
            this.backendVersion = null;
            return;
        }
        
        try {
            const info = await this.serverManager.getServerInfo();
            this.backendVersion = info?.version || null;
        } catch (error) {
            this.outputChannel.appendLine(`Failed to fetch backend version: ${error}`);
            this.backendVersion = null;
        }
    }
    
    private checkVersionCompatibility(): {
        compatible: boolean;
        warnings: string[];
        errors: string[];
    } {
        const result = {
            compatible: true,
            warnings: [] as string[],
            errors: [] as string[]
        };
        
        if (!this.backendVersion) {
            result.warnings.push('Backend version unknown, compatibility cannot be verified');
            return result;
        }
        
        const compatibility = this.compatibilityMatrix[this.extensionVersion];
        
        if (!compatibility) {
            result.errors.push(`No compatibility information for extension version ${this.extensionVersion}`);
            result.compatible = false;
            return result;
        }
        
        // Check minimum backend version
        if (semver.lt(this.backendVersion, compatibility.minBackend)) {
            result.errors.push(
                `Backend version ${this.backendVersion} is too old. ` +
                `Minimum required: ${compatibility.minBackend}`
            );
            result.compatible = false;
        }
        
        // Check maximum backend version
        if (compatibility.maxBackend && semver.gt(this.backendVersion, compatibility.maxBackend)) {
            result.warnings.push(
                `Backend version ${this.backendVersion} is newer than tested. ` +
                `Maximum tested: ${compatibility.maxBackend}`
            );
        }
        
        // Check for major version mismatch
        const extensionMajor = semver.major(this.extensionVersion);
        const backendMajor = semver.major(this.backendVersion);
        
        if (extensionMajor !== backendMajor) {
            result.warnings.push(
                `Major version mismatch: Extension v${extensionMajor}.x, Backend v${backendMajor}.x`
            );
        }
        
        return result;
    }
    
    private checkFeatureCompatibility(): {
        warnings: string[];
        errors: string[];
    } {
        const result = {
            warnings: [] as string[],
            errors: [] as string[]
        };
        
        const compatibility = this.compatibilityMatrix[this.extensionVersion];
        
        if (!compatibility) {
            return result;
        }
        
        // Check each expected feature
        for (const feature of compatibility.features) {
            const status = this.getFeatureStatus(feature);
            
            if (!status.available && !status.deprecated) {
                result.errors.push(`Required feature '${feature}' is not available`);
            } else if (status.deprecated) {
                result.warnings.push(
                    `Feature '${feature}' is deprecated${
                        status.replacement ? `. Use '${status.replacement}' instead` : ''
                    }`
                );
            }
        }
        
        return result;
    }
    
    private async checkForUpdates(): Promise<{
        updateAvailable: boolean;
        latestVersion: string | null;
    }> {
        // This would typically check a remote registry or GitHub releases
        // For now, return mock data
        return {
            updateAvailable: false,
            latestVersion: this.extensionVersion
        };
    }
    
    private needsMigration(): boolean {
        // Check if stored data version differs from current version
        const storedVersion = this.context.globalState.get<string>('dataVersion');
        
        if (!storedVersion) {
            return false;
        }
        
        return semver.lt(storedVersion, this.extensionVersion);
    }
    
    private setupFeatureMap(): void {
        // Define feature compatibility requirements
        this.featureMap.set('basic-graph', {
            feature: 'basic-graph',
            minVersion: '0.1.0'
        });
        
        this.featureMap.set('execution', {
            feature: 'execution',
            minVersion: '0.1.0'
        });
        
        this.featureMap.set('websocket', {
            feature: 'websocket',
            minVersion: '0.1.0'
        });
        
        this.featureMap.set('toppings', {
            feature: 'toppings',
            minVersion: '0.2.0'
        });
        
        this.featureMap.set('class-definition', {
            feature: 'class-definition',
            minVersion: '0.2.0'
        });
        
        this.featureMap.set('state-management', {
            feature: 'state-management',
            minVersion: '0.3.0'
        });
        
        // Deprecated features
        this.featureMap.set('legacy-api', {
            feature: 'legacy-api',
            minVersion: '0.1.0',
            maxVersion: '0.2.0',
            deprecated: true,
            replacement: 'rest-api'
        });
    }
    
    private setupMigrationRules(): void {
        // Example migration rules
        this.migrationRules.push({
            fromVersion: '0.1.0',
            toVersion: '0.2.0',
            description: 'Migrate graph format to v2',
            migrate: (data: any) => {
                if (data.version === '1.0.0') {
                    data.version = '2.0.0';
                    // Add new required fields
                    if (!data.metadata) {
                        data.metadata = {
                            created: new Date().toISOString(),
                            modified: new Date().toISOString()
                        };
                    }
                }
                return data;
            }
        });
        
        this.migrationRules.push({
            fromVersion: '0.2.0',
            toVersion: '0.3.0',
            description: 'Add state management fields',
            migrate: (data: any) => {
                if (!data.state) {
                    data.state = {
                        variables: {},
                        executionHistory: []
                    };
                }
                return data;
            }
        });
    }
    
    private logCompatibilityResult(result: CompatibilityResult): void {
        this.outputChannel.appendLine('=== Compatibility Check ===');
        this.outputChannel.appendLine(`Extension: ${this.extensionVersion}`);
        this.outputChannel.appendLine(`Backend: ${this.backendVersion || 'Unknown'}`);
        this.outputChannel.appendLine(`Compatible: ${result.compatible}`);
        
        if (result.errors.length > 0) {
            this.outputChannel.appendLine('Errors:');
            result.errors.forEach(e => this.outputChannel.appendLine(`  - ${e}`));
        }
        
        if (result.warnings.length > 0) {
            this.outputChannel.appendLine('Warnings:');
            result.warnings.forEach(w => this.outputChannel.appendLine(`  - ${w}`));
        }
        
        this.outputChannel.appendLine('========================');
    }
    
    /**
     * Get version information
     */
    getVersionInfo(): VersionInfo {
        const compatibility = this.compatibilityMatrix[this.extensionVersion] || {
            minBackend: '0.1.0',
            features: []
        };
        
        return {
            extension: this.extensionVersion,
            backend: this.backendVersion,
            minimumBackend: compatibility.minBackend,
            maximumBackend: compatibility.maxBackend,
            features: compatibility.features
        };
    }
}

// Stub for semver if not installed
const semver = {
    satisfies: (version: string, range: string): boolean => {
        // Simple version comparison stub
        return true;
    },
    lt: (v1: string, v2: string): boolean => {
        return v1 < v2;
    },
    gt: (v1: string, v2: string): boolean => {
        return v1 > v2;
    },
    gte: (v1: string, v2: string): boolean => {
        return v1 >= v2;
    },
    lte: (v1: string, v2: string): boolean => {
        return v1 <= v2;
    },
    major: (version: string): number => {
        return parseInt(version.split('.')[0]);
    },
    compare: (v1: string, v2: string): number => {
        return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
    }
};
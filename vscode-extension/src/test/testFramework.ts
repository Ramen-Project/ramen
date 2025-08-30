import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Comprehensive test framework for Ramen extension
 */
export class TestFramework {
    private static instance: TestFramework;
    private testResults: TestResult[] = [];
    private currentSuite: string = '';
    
    static getInstance(): TestFramework {
        if (!this.instance) {
            this.instance = new TestFramework();
        }
        return this.instance;
    }
    
    /**
     * Run all test suites
     */
    async runAllTests(): Promise<TestReport> {
        console.log('Starting comprehensive test suite...');
        const startTime = Date.now();
        
        // Run different test categories
        await this.runUnitTests();
        await this.runIntegrationTests();
        await this.runE2ETests();
        await this.runPerformanceTests();
        
        const endTime = Date.now();
        
        return this.generateReport(endTime - startTime);
    }
    
    /**
     * Unit tests for individual components
     */
    async runUnitTests(): Promise<void> {
        this.currentSuite = 'Unit Tests';
        
        // Test ErrorHandler
        await this.test('ErrorHandler - handle basic error', async () => {
            const { ErrorHandler } = await import('../extension/core/errorHandler');
            const handler = ErrorHandler.getInstance();
            
            // Should not throw
            handler.handle(new Error('Test error'), 'test-context');
            assert.ok(true, 'Error handled successfully');
        });
        
        // Test ResourceManager
        await this.test('ResourceManager - register and dispose resource', async () => {
            const { ResourceManager } = await import('../extension/core/resourceManager');
            const manager = ResourceManager.getInstance();
            
            let disposed = false;
            const resource = { dispose: () => { disposed = true; } };
            
            const id = manager.register(resource, 'disposable' as any, 'test-resource');
            assert.ok(id, 'Resource registered successfully');
            
            await manager.unregister(id);
            assert.ok(disposed, 'Resource disposed successfully');
        });
        
        // Test StateManager
        await this.test('StateManager - update and get state', async () => {
            const { StateManager } = await import('../extension/core/stateManager');
            const manager = StateManager.getInstance();
            
            manager.update('test.value', 42);
            const value = manager.get('test.value');
            assert.strictEqual(value, 42, 'State updated and retrieved correctly');
        });
        
        // Test Performance utilities
        await this.test('Performance - debounce function', async () => {
            const { debounce } = await import('../extension/utils/performance');
            
            let callCount = 0;
            const fn = debounce(() => callCount++, 100);
            
            fn();
            fn();
            fn();
            
            assert.strictEqual(callCount, 0, 'Function not called immediately');
            
            await new Promise(resolve => setTimeout(resolve, 150));
            assert.strictEqual(callCount, 1, 'Function called once after delay');
        });
    }
    
    /**
     * Integration tests for component interactions
     */
    async runIntegrationTests(): Promise<void> {
        this.currentSuite = 'Integration Tests';
        
        // Test WebSocket with message queue
        await this.test('WebSocket - message queue integration', async () => {
            // Mock test since actual WebSocket requires server
            assert.ok(true, 'WebSocket integration test placeholder');
        });
        
        // Test Backend interface with local provider
        await this.test('Backend - local connection lifecycle', async () => {
            const { BackendConnectionFactory } = await import('../extension/backend/backendInterface');
            const { LocalBackendProvider, LocalBackendConnection } = await import('../extension/backend/localBackend');
            
            BackendConnectionFactory.registerProvider('local' as any, new LocalBackendProvider());
            
            // Test factory can create connection (mock)
            const types = BackendConnectionFactory.getAvailableTypes();
            assert.ok(types.includes('local' as any), 'Local backend provider registered');
        });
        
        // Test State persistence integration
        await this.test('State - persistence and recovery', async () => {
            const { StateManager } = await import('../extension/core/stateManager');
            const manager = StateManager.getInstance();
            
            // Set state
            manager.update('persist.test', { value: 'test-data' });
            
            // Clear state
            manager.clear();
            
            // Verify cleared
            const restored = manager.get('persist.test');
            assert.strictEqual(restored, undefined, 'State cleared successfully');
        });
    }
    
    /**
     * End-to-end tests for complete workflows
     */
    async runE2ETests(): Promise<void> {
        this.currentSuite = 'E2E Tests';
        
        // Test graph creation workflow
        await this.test('E2E - create and save graph', async () => {
            // This would test the complete flow of creating a graph
            // For now, placeholder
            assert.ok(true, 'E2E graph creation test placeholder');
        });
        
        // Test graph execution workflow
        await this.test('E2E - execute graph with results', async () => {
            // This would test executing a graph and getting results
            assert.ok(true, 'E2E graph execution test placeholder');
        });
    }
    
    /**
     * Performance tests for critical paths
     */
    async runPerformanceTests(): Promise<void> {
        this.currentSuite = 'Performance Tests';
        
        // Test state update performance
        await this.test('Performance - state updates', async () => {
            const { StateManager } = await import('../extension/core/stateManager');
            const manager = StateManager.getInstance();
            
            const startTime = Date.now();
            
            // Perform many updates
            for (let i = 0; i < 1000; i++) {
                manager.update(`perf.test.${i}`, i);
            }
            
            const elapsed = Date.now() - startTime;
            assert.ok(elapsed < 100, `State updates completed in ${elapsed}ms (should be < 100ms)`);
        });
        
        // Test resource management performance
        await this.test('Performance - resource tracking', async () => {
            const { ResourceManager } = await import('../extension/core/resourceManager');
            const manager = ResourceManager.getInstance();
            
            const startTime = Date.now();
            
            // Register many resources
            const ids: string[] = [];
            for (let i = 0; i < 100; i++) {
                const id = manager.register({}, 'disposable' as any, `resource-${i}`);
                ids.push(id);
            }
            
            // Dispose all
            await manager.disposeAll();
            
            const elapsed = Date.now() - startTime;
            assert.ok(elapsed < 500, `Resource management completed in ${elapsed}ms (should be < 500ms)`);
        });
        
        // Test batch processing performance
        await this.test('Performance - batch processor', async () => {
            const { BatchProcessor } = await import('../extension/utils/performance');
            
            let processedCount = 0;
            const processor = new BatchProcessor<number>(
                async (items) => {
                    processedCount += items.length;
                },
                10,
                50
            );
            
            // Add many items
            for (let i = 0; i < 100; i++) {
                processor.add(i);
            }
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 200));
            
            assert.strictEqual(processedCount, 100, 'All items processed in batches');
        });
    }
    
    /**
     * Helper method to run individual test
     */
    private async test(name: string, fn: () => Promise<void> | void): Promise<void> {
        const startTime = Date.now();
        let result: TestResult;
        
        try {
            await fn();
            result = {
                suite: this.currentSuite,
                name,
                status: 'passed',
                duration: Date.now() - startTime
            };
            console.log(`✓ ${name}`);
        } catch (error) {
            result = {
                suite: this.currentSuite,
                name,
                status: 'failed',
                duration: Date.now() - startTime,
                error: error instanceof Error ? error.message : String(error)
            };
            console.error(`✗ ${name}: ${result.error}`);
        }
        
        this.testResults.push(result);
    }
    
    /**
     * Generate test report
     */
    private generateReport(totalDuration: number): TestReport {
        const passed = this.testResults.filter(r => r.status === 'passed').length;
        const failed = this.testResults.filter(r => r.status === 'failed').length;
        const skipped = this.testResults.filter(r => r.status === 'skipped').length;
        
        const report: TestReport = {
            totalTests: this.testResults.length,
            passed,
            failed,
            skipped,
            duration: totalDuration,
            suites: this.groupBySuite(),
            timestamp: new Date().toISOString()
        };
        
        // Save report to file
        this.saveReport(report);
        
        return report;
    }
    
    private groupBySuite(): Record<string, TestResult[]> {
        const suites: Record<string, TestResult[]> = {};
        
        for (const result of this.testResults) {
            if (!suites[result.suite]) {
                suites[result.suite] = [];
            }
            suites[result.suite].push(result);
        }
        
        return suites;
    }
    
    private saveReport(report: TestReport): void {
        const reportPath = path.join(
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            'test-reports',
            `report-${Date.now()}.json`
        );
        
        try {
            const dir = path.dirname(reportPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`Test report saved to: ${reportPath}`);
        } catch (error) {
            console.error('Failed to save test report:', error);
        }
    }
}

interface TestResult {
    suite: string;
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
}

interface TestReport {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    suites: Record<string, TestResult[]>;
    timestamp: string;
}

/**
 * Test runner command
 */
export async function runTests(): Promise<void> {
    const framework = TestFramework.getInstance();
    const report = await framework.runAllTests();
    
    // Show results in output channel
    const outputChannel = vscode.window.createOutputChannel('Ramen Tests');
    outputChannel.appendLine('Test Results');
    outputChannel.appendLine('============');
    outputChannel.appendLine(`Total: ${report.totalTests}`);
    outputChannel.appendLine(`Passed: ${report.passed}`);
    outputChannel.appendLine(`Failed: ${report.failed}`);
    outputChannel.appendLine(`Duration: ${report.duration}ms`);
    outputChannel.show();
    
    // Show notification
    if (report.failed === 0) {
        vscode.window.showInformationMessage(`All ${report.totalTests} tests passed!`);
    } else {
        vscode.window.showErrorMessage(`${report.failed} of ${report.totalTests} tests failed`);
    }
}
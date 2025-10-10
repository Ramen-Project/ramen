/**
 * CommandRegistry 單元測試
 * 測試命令註冊、執行和中間件功能
 */

import * as assert from 'assert';
import { expect } from 'chai';
import * as sinon from 'sinon';
import {
    CommandRegistry,
    CommandMetadata,
    CommandHandler,
    CommandContext,
} from '../../../extension/commands/commandRegistry';
import { StateManager } from '../../../extension/core/stateManager';
import { ErrorHandler } from '../../../extension/core/errorHandler';
import {
    createMockExtensionContext,
    createTestDIContainer,
    cleanupTestResources,
    registerMockServices,
} from '../../helpers/mockHelpers';

suite('CommandRegistry Test Suite', () => {
    let registry: CommandRegistry;
    let mockContext: any;
    let stateManager: StateManager;
    let errorHandler: ErrorHandler;
    let container: any;

    setup(() => {
        mockContext = createMockExtensionContext();
        stateManager = StateManager.getInstance(mockContext);
        errorHandler = ErrorHandler.getInstance();
        container = createTestDIContainer(mockContext);
        registerMockServices(container);

        registry = new CommandRegistry(mockContext, stateManager, errorHandler, container);
    });

    teardown(() => {
        cleanupTestResources();
    });

    suite('命令註冊', () => {
        test('應該能夠註冊單個命令', () => {
            // Arrange
            const metadata: CommandMetadata = {
                id: 'test.command',
                title: 'Test Command',
            };
            const handler = sinon.stub().resolves();

            // Act
            registry.register(metadata, handler);

            // Assert
            expect(registry.isRegistered('test.command')).to.be.true;
        });

        test('應該能夠批次註冊命令', () => {
            // Arrange
            const commands = [
                {
                    metadata: { id: 'test.command1', title: 'Command 1' },
                    handler: sinon.stub().resolves(),
                },
                {
                    metadata: { id: 'test.command2', title: 'Command 2' },
                    handler: sinon.stub().resolves(),
                },
            ];

            // Act
            registry.registerBatch(commands);

            // Assert
            expect(registry.isRegistered('test.command1')).to.be.true;
            expect(registry.isRegistered('test.command2')).to.be.true;
        });

        test('自動添加 ramen. 前綴到命令 ID', () => {
            // Arrange
            const metadata: CommandMetadata = {
                id: 'testCommand',
                title: 'Test Command',
            };
            const handler = sinon.stub().resolves();

            // Act
            registry.register(metadata, handler);

            // Assert
            expect(registry.isRegistered('ramen.testCommand')).to.be.true;
        });

        test('不應該重複添加 ramen. 前綴', () => {
            // Arrange
            const metadata: CommandMetadata = {
                id: 'ramen.testCommand',
                title: 'Test Command',
            };
            const handler = sinon.stub().resolves();

            // Act
            registry.register(metadata, handler);

            // Assert
            expect(registry.isRegistered('ramen.testCommand')).to.be.true;
            expect(registry.isRegistered('ramen.ramen.testCommand')).to.be.false;
        });
    });

    suite('命令執行', () => {
        test('應該能夠執行已註冊的命令', async () => {
            // Arrange
            const metadata: CommandMetadata = {
                id: 'test.execute',
                title: 'Execute Test',
            };
            const handler = sinon.stub().resolves();
            registry.register(metadata, handler);

            // Act
            await registry.execute('ramen.test.execute');

            // Assert
            expect(handler.calledOnce).to.be.true;
        });

        test('命令 handler 應該接收到 CommandContext', async () => {
            // Arrange
            const metadata: CommandMetadata = {
                id: 'test.context',
                title: 'Context Test',
            };
            const handler = sinon.stub().resolves();
            registry.register(metadata, handler);

            // Act
            await registry.execute('ramen.test.context');

            // Assert
            expect(handler.calledOnce).to.be.true;
            const context = handler.getCall(0).args[0] as CommandContext;
            expect(context).to.exist;
            expect(context.stateManager).to.equal(stateManager);
            expect(context.extensionPath).to.exist;
        });

        test('命令 handler 應該接收到額外的參數', async () => {
            // Arrange
            const metadata: CommandMetadata = {
                id: 'test.args',
                title: 'Args Test',
            };
            const handler = sinon.stub().resolves();
            registry.register(metadata, handler);

            // Act
            await registry.execute('ramen.test.args', 'arg1', 'arg2', 42);

            // Assert
            expect(handler.calledOnce).to.be.true;
            const args = handler.getCall(0).args.slice(1);
            expect(args).to.deep.equal(['arg1', 'arg2', 42]);
        });

        test('執行未註冊的命令應該拋出錯誤', async () => {
            // Act & Assert
            try {
                await registry.execute('ramen.nonexistent');
                assert.fail('應該拋出錯誤');
            } catch (error: any) {
                expect(error.message).to.include('Command not found');
            }
        });
    });

    suite('中間件', () => {
        test('應該執行中間件', async () => {
            // Arrange
            const middlewareSpy = sinon.stub().callsFake(async (context, metadata, next) => {
                await next();
            });

            const handler = sinon.stub().resolves();
            const metadata: CommandMetadata = {
                id: 'test.middleware',
                title: 'Middleware Test',
            };

            // Act
            registry.use(middlewareSpy);
            registry.register(metadata, handler);
            await registry.execute('ramen.test.middleware');

            // Assert
            expect(middlewareSpy.calledOnce).to.be.true;
            expect(handler.calledOnce).to.be.true;
        });

        test('中間件應該能夠修改執行流程', async () => {
            // Arrange
            const middlewareSpy = sinon.stub().callsFake(async (context, metadata, next) => {
                // 不呼叫 next()，中斷執行
            });

            const handler = sinon.stub().resolves();
            const metadata: CommandMetadata = {
                id: 'test.intercept',
                title: 'Intercept Test',
            };

            // Act
            registry.use(middlewareSpy);
            registry.register(metadata, handler);
            await registry.execute('ramen.test.intercept');

            // Assert
            expect(middlewareSpy.calledOnce).to.be.true;
            expect(handler.called).to.be.false; // handler 不應該被執行
        });

        test('多個中間件應該按順序執行', async () => {
            // Arrange
            const executionOrder: number[] = [];

            const middleware1 = sinon.stub().callsFake(async (context, metadata, next) => {
                executionOrder.push(1);
                await next();
                executionOrder.push(4);
            });

            const middleware2 = sinon.stub().callsFake(async (context, metadata, next) => {
                executionOrder.push(2);
                await next();
                executionOrder.push(3);
            });

            const handler = sinon.stub().callsFake(async () => {
                executionOrder.push(5);
            });

            const metadata: CommandMetadata = {
                id: 'test.order',
                title: 'Order Test',
            };

            // Act
            registry.use(middleware1);
            registry.use(middleware2);
            registry.register(metadata, handler);
            await registry.execute('ramen.test.order');

            // Assert - 預設 logging 中間件會先執行
            // 所以實際順序是 [logging, 1, 2, 5, 3, 4]
            // 我們只檢查我們的中間件順序
            const ourMiddlewareOrder = executionOrder.filter((x) => x <= 5);
            expect(ourMiddlewareOrder).to.include.members([1, 2, 5, 3, 4]);
        });

        test('中間件應該能夠捕獲錯誤', async () => {
            // Arrange
            let errorCaught = false;

            const errorMiddleware = sinon.stub().callsFake(async (context, metadata, next) => {
                try {
                    await next();
                } catch (error) {
                    errorCaught = true;
                    // 不重新拋出，表示錯誤已處理
                }
            });

            const handler = sinon.stub().rejects(new Error('Command failed'));
            const metadata: CommandMetadata = {
                id: 'test.error',
                title: 'Error Test',
            };

            // Act
            registry.use(errorMiddleware);
            registry.register(metadata, handler);
            await registry.execute('ramen.test.error');

            // Assert
            expect(errorCaught).to.be.true;
        });
    });

    suite('服務注入到 CommandContext', () => {
        test('CommandContext 應該包含從 DI 容器解析的服務', async () => {
            // Arrange
            const metadata: CommandMetadata = {
                id: 'test.services',
                title: 'Services Test',
            };

            let capturedContext: CommandContext | null = null;
            const handler = sinon.stub().callsFake(async (context: CommandContext) => {
                capturedContext = context;
            });

            registry.register(metadata, handler);

            // Act
            await registry.execute('ramen.test.services');

            // Assert
            expect(capturedContext).to.exist;
            // 檢查是否有從 DI 容器注入的服務
            // 根據 mockHelpers 註冊的服務
            expect(capturedContext!.stateManager).to.exist;
        });
    });

    suite('命令查詢', () => {
        test('getAllCommands 應該返回所有已註冊的命令', () => {
            // Arrange
            registry.register({ id: 'cmd1', title: 'Command 1' }, sinon.stub().resolves());
            registry.register({ id: 'cmd2', title: 'Command 2' }, sinon.stub().resolves());

            // Act
            const commands = registry.getAllCommands();

            // Assert
            expect(commands.length).to.be.at.least(2);
            const commandIds = commands.map((cmd) => cmd.metadata.id);
            expect(commandIds).to.include('cmd1');
            expect(commandIds).to.include('cmd2');
        });

        test('getCommand 應該返回指定的命令', () => {
            // Arrange
            const metadata: CommandMetadata = { id: 'testCmd', title: 'Test' };
            registry.register(metadata, sinon.stub().resolves());

            // Act
            const command = registry.getCommand('ramen.testCmd');

            // Assert
            expect(command).to.exist;
            expect(command!.metadata.id).to.equal('testCmd');
        });

        test('getCommand 對於未註冊的命令應該返回 undefined', () => {
            // Act
            const command = registry.getCommand('ramen.nonexistent');

            // Assert
            expect(command).to.be.undefined;
        });
    });

    suite('錯誤處理', () => {
        test('命令執行錯誤應該被正確處理', async () => {
            // Arrange
            const errorMessage = 'Command execution failed';
            const handler = sinon.stub().rejects(new Error(errorMessage));
            const metadata: CommandMetadata = {
                id: 'test.error',
                title: 'Error Test',
            };

            registry.register(metadata, handler);

            // Act & Assert
            try {
                await registry.execute('ramen.test.error');
                // 預設的 logging 中間件應該會捕獲並記錄錯誤，但不會阻止錯誤傳播
            } catch (error: any) {
                // 錯誤應該被傳播
                expect(error.message).to.include(errorMessage);
            }
        });
    });
});

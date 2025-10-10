/**
 * DIContainer 單元測試
 * 測試依賴注入容器的核心功能
 */

import * as assert from 'assert';
import { expect } from 'chai';
import * as sinon from 'sinon';
import {
    DIContainer,
    ServiceIdentifiers,
    ServiceLifetime,
} from '../../../extension/core/di/DIContainer';
import { createMockExtensionContext, cleanupTestResources } from '../../helpers/mockHelpers';

suite('DIContainer Test Suite', () => {
    let container: DIContainer;
    let mockContext: any;

    setup(() => {
        mockContext = createMockExtensionContext();
        container = new DIContainer(mockContext);
    });

    teardown(() => {
        container.dispose();
        cleanupTestResources();
    });

    suite('基本服務註冊', () => {
        test('應該能夠註冊和解析 Singleton 服務', () => {
            // Arrange
            const serviceId = Symbol('TestService');
            const mockService = { name: 'TestService' };

            // Act
            container.registerSingleton(serviceId, () => mockService);
            const resolved = container.resolve(serviceId);

            // Assert
            expect(resolved).to.equal(mockService);
        });

        test('Singleton 服務應該返回相同的實例', () => {
            // Arrange
            const serviceId = Symbol('TestService');
            let instanceCount = 0;
            const factory = () => ({ id: ++instanceCount });

            // Act
            container.registerSingleton(serviceId, factory);
            const instance1 = container.resolve(serviceId);
            const instance2 = container.resolve(serviceId);

            // Assert
            expect(instance1).to.equal(instance2);
            expect((instance1 as any).id).to.equal(1);
        });

        test('Transient 服務應該每次返回新實例', () => {
            // Arrange
            const serviceId = Symbol('TestService');
            let instanceCount = 0;
            const factory = () => ({ id: ++instanceCount });

            // Act
            container.registerTransient(serviceId, factory);
            const instance1 = container.resolve(serviceId);
            const instance2 = container.resolve(serviceId);

            // Assert
            expect(instance1).to.not.equal(instance2);
            expect((instance1 as any).id).to.equal(1);
            expect((instance2 as any).id).to.equal(2);
        });

        test('應該能夠註冊已存在的實例', () => {
            // Arrange
            const serviceId = Symbol('TestService');
            const existingInstance = { name: 'ExistingService' };

            // Act
            container.registerInstance(serviceId, existingInstance);
            const resolved = container.resolve(serviceId);

            // Assert
            expect(resolved).to.equal(existingInstance);
        });
    });

    suite('依賴注入', () => {
        test('應該能夠解析服務的依賴', () => {
            // Arrange
            const depId = Symbol('Dependency');
            const serviceId = Symbol('Service');
            const mockDependency = { name: 'Dependency' };

            container.registerSingleton(depId, () => mockDependency);
            container.registerSingleton(serviceId, (c) => ({
                name: 'Service',
                dependency: c.resolve(depId),
            }));

            // Act
            const resolved: any = container.resolve(serviceId);

            // Assert
            expect(resolved.name).to.equal('Service');
            expect(resolved.dependency).to.equal(mockDependency);
        });

        test('應該能夠處理多層依賴', () => {
            // Arrange
            const dep1Id = Symbol('Dep1');
            const dep2Id = Symbol('Dep2');
            const serviceId = Symbol('Service');

            container.registerSingleton(dep1Id, () => ({ name: 'Dep1' }));
            container.registerSingleton(dep2Id, (c) => ({
                name: 'Dep2',
                dep1: c.resolve(dep1Id),
            }));
            container.registerSingleton(serviceId, (c) => ({
                name: 'Service',
                dep2: c.resolve(dep2Id),
            }));

            // Act
            const resolved: any = container.resolve(serviceId);

            // Assert
            expect(resolved.name).to.equal('Service');
            expect(resolved.dep2.name).to.equal('Dep2');
            expect(resolved.dep2.dep1.name).to.equal('Dep1');
        });
    });

    suite('服務檢查', () => {
        test('isRegistered 應該正確檢查服務是否註冊', () => {
            // Arrange
            const serviceId = Symbol('TestService');

            // Act & Assert
            expect(container.isRegistered(serviceId)).to.be.false;

            container.registerSingleton(serviceId, () => ({}));
            expect(container.isRegistered(serviceId)).to.be.true;
        });

        test('tryResolve 應該返回服務或 undefined', () => {
            // Arrange
            const registeredId = Symbol('Registered');
            const unregisteredId = Symbol('Unregistered');
            const mockService = { name: 'Service' };

            container.registerSingleton(registeredId, () => mockService);

            // Act & Assert
            expect(container.tryResolve(registeredId)).to.equal(mockService);
            expect(container.tryResolve(unregisteredId)).to.be.undefined;
        });

        test('resolve 未註冊的服務應該拋出錯誤', () => {
            // Arrange
            const unregisteredId = Symbol('Unregistered');

            // Act & Assert
            expect(() => container.resolve(unregisteredId)).to.throw('Service not registered');
        });
    });

    suite('內建服務', () => {
        test('應該自動註冊 DIContainer 本身', () => {
            // Act
            const resolved = container.resolve(DIContainer);

            // Assert
            expect(resolved).to.equal(container);
        });

        test('應該自動註冊 ExtensionContext', () => {
            // Act
            const resolved = container.resolve('ExtensionContext');

            // Assert
            expect(resolved).to.equal(mockContext);
        });
    });

    suite('子容器', () => {
        test('應該能夠建立子容器', () => {
            // Act
            const childContainer = container.createChildContainer();

            // Assert
            expect(childContainer).to.be.instanceOf(DIContainer);
            expect(childContainer).to.not.equal(container);
        });

        test('子容器應該能夠存取父容器的服務', () => {
            // Arrange
            const serviceId = Symbol('ParentService');
            const mockService = { name: 'ParentService' };
            container.registerSingleton(serviceId, () => mockService);

            // Act
            const childContainer = container.createChildContainer();
            const resolved = childContainer.resolve(serviceId);

            // Assert
            expect(resolved).to.equal(mockService);
        });

        test('子容器可以覆寫父容器的服務', () => {
            // Arrange
            const serviceId = Symbol('Service');
            const parentService = { name: 'ParentService' };
            const childService = { name: 'ChildService' };

            container.registerSingleton(serviceId, () => parentService);
            const childContainer = container.createChildContainer();
            childContainer.registerSingleton(serviceId, () => childService);

            // Act
            const parentResolved = container.resolve(serviceId);
            const childResolved = childContainer.resolve(serviceId);

            // Assert
            expect(parentResolved).to.equal(parentService);
            expect(childResolved).to.equal(childService);
        });
    });

    suite('資源清理', () => {
        test('dispose 應該清理所有服務', () => {
            // Arrange
            const serviceId = Symbol('DisposableService');
            const mockService = {
                name: 'Service',
                dispose: sinon.stub(),
            };
            container.registerSingleton(serviceId, () => mockService);
            container.resolve(serviceId); // 觸發實例化

            // Act
            container.dispose();

            // Assert
            expect(mockService.dispose.calledOnce).to.be.true;
        });

        test('dispose 後不應該能夠註冊新服務', () => {
            // Arrange
            const serviceId = Symbol('Service');
            container.dispose();

            // Act & Assert
            expect(() => container.registerSingleton(serviceId, () => ({}))).to.throw(
                'Container has been disposed'
            );
        });

        test('dispose 後不應該能夠解析服務', () => {
            // Arrange
            const serviceId = Symbol('Service');
            container.registerSingleton(serviceId, () => ({}));
            container.dispose();

            // Act & Assert
            expect(() => container.resolve(serviceId)).to.throw('Container has been disposed');
        });
    });

    suite('錯誤處理', () => {
        test('重複註冊相同服務應該拋出錯誤', () => {
            // Arrange
            const serviceId = Symbol('Service');
            container.registerSingleton(serviceId, () => ({}));

            // Act & Assert
            expect(() => container.registerSingleton(serviceId, () => ({}))).to.throw(
                'Service already registered'
            );
        });

        test('服務工廠拋出錯誤應該被傳播', () => {
            // Arrange
            const serviceId = Symbol('Service');
            const errorMessage = 'Service factory error';
            container.registerSingleton(serviceId, () => {
                throw new Error(errorMessage);
            });

            // Act & Assert
            expect(() => container.resolve(serviceId)).to.throw(errorMessage);
        });
    });

    suite('真實服務註冊測試', () => {
        test('應該能夠註冊和解析 StateManager', () => {
            // Arrange
            const StateManager = require('../../../extension/core/stateManager').StateManager;
            container.registerSingleton(ServiceIdentifiers.StateManager, () =>
                StateManager.getInstance(mockContext)
            );

            // Act
            const stateManager = container.resolve(ServiceIdentifiers.StateManager);

            // Assert
            expect(stateManager).to.exist;
            expect((stateManager as any).constructor.name).to.equal('StateManager');
        });
    });
});

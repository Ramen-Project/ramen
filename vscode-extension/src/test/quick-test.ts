/**
 * 快速測試驗證腳本
 * 不需要完整的 VSCode 測試環境，僅驗證測試邏輯是否正確
 */

import { expect } from 'chai';
import * as sinon from 'sinon';

console.log('🍜 Ramen Extension - Quick Test Validation');
console.log('==========================================\n');

// 測試 1: Chai 斷言庫
console.log('✓ Testing Chai assertions...');
try {
    expect(1 + 1).to.equal(2);
    expect('hello').to.be.a('string');
    expect([1, 2, 3]).to.have.lengthOf(3);
    console.log('  ✅ Chai assertions work correctly\n');
} catch (error) {
    console.error('  ❌ Chai assertions failed:', error);
    process.exit(1);
}

// 測試 2: Sinon stub 功能
console.log('✓ Testing Sinon stubs...');
try {
    const stub = sinon.stub().returns(42);
    const result = stub('test');
    expect(result).to.equal(42);
    expect(stub.calledOnce).to.be.true;
    expect(stub.calledWith('test')).to.be.true;
    console.log('  ✅ Sinon stubs work correctly\n');
} catch (error) {
    console.error('  ❌ Sinon stubs failed:', error);
    process.exit(1);
}

// 測試 3: 非同步測試
console.log('✓ Testing async operations...');
async function testAsync() {
    const asyncStub = sinon.stub().resolves('async result');
    const result = await asyncStub();
    expect(result).to.equal('async result');
    expect(asyncStub.calledOnce).to.be.true;
}

testAsync()
    .then(() => {
        console.log('  ✅ Async operations work correctly\n');
        console.log('==========================================');
        console.log('✅ All quick tests passed!');
        console.log('✅ Test infrastructure is ready');
        console.log('\nNext steps:');
        console.log('1. Run "npm run test:vscode" for full test suite');
        console.log('2. Or press F5 in VSCode to test interactively');
        process.exit(0);
    })
    .catch((error) => {
        console.error('  ❌ Async operations failed:', error);
        process.exit(1);
    });

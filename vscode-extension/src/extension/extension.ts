/**
 * Extension 入口點（使用 DI 架構重構版本）
 *
 * 這個版本使用依賴注入容器來管理所有服務，
 * 簡化初始化邏輯並提高可測試性。
 */

import * as vscode from 'vscode';
import { Application } from './core/Application';

// 全域 Application 實例
let app: Application | null = null;

/**
 * Extension 啟動函數
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log('🍜 Ramen extension is activating...');

    try {
        // 建立並啟動 Application
        app = new Application(context);
        await app.start();

        console.log('🍜 Ramen extension activated successfully');
    } catch (error) {
        console.error('🍜 Failed to activate Ramen extension:', error);
        vscode.window.showErrorMessage(
            `Failed to activate Ramen Extension: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
    }
}

/**
 * Extension 停止函數
 */
export async function deactivate() {
    console.log('🍜 Ramen extension is deactivating...');

    if (app) {
        try {
            await app.stop();
            console.log('🍜 Ramen extension deactivated successfully');
        } catch (error) {
            console.error('🍜 Error during extension deactivation:', error);
        } finally {
            app = null;
        }
    }
}

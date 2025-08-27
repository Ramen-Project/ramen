# VSCode Extension Test Guide

## 測試 Ramen VSCode 擴展

### 1. 在開發環境中測試

1. 在 VSCode 中開啟 `vscode-extension` 目錄
2. 按 F5 啟動 Extension Development Host
3. 在新窗口中開啟包含 .ramen 檔案的專案

### 2. 測試功能

#### 基本功能
- [ ] 擴展成功載入
- [ ] .ramen 檔案有正確的語法高亮
- [ ] 右鍵選單顯示 "Ramen: Open Graph Editor"
- [ ] 命令面板中可找到 Ramen 相關命令

#### 圖形編輯器
- [ ] 開啟圖形編輯器成功顯示 webview
- [ ] 可以看到圖形數據
- [ ] 基本的用戶界面元素正常顯示
- [ ] VSCode 主題正確應用

#### 語言伺服器
- [ ] .ramen 檔案有基本的語法驗證
- [ ] JSON 格式錯誤會顯示診斷信息

#### 命令功能
- [ ] "Create New Graph" 可以創建新檔案
- [ ] "Execute Graph" 嘗試執行圖形
- [ ] 伺服器管理命令工作正常

### 3. 預期問題和解決方案

#### Python 環境
- 確保系統有 Python 3.12+
- 需要安裝 `pygls` 套件用於 Language Server

#### 後端伺服器
- 當前後端是模擬的，真實伺服器需要 Ramen Python 套件

#### Webview 內容
- 當前是簡化版本，不是完整的 React 應用

### 4. 下一步開發

1. 整合真實的 React 前端應用
2. 實作完整的後端伺服器通訊
3. 完善 Language Server 功能
4. 添加更多測試案例
5. 優化性能和使用體驗

### 5. 打包和分發

```bash
# 安裝 vsce
npm install -g vsce

# 打包擴展
vsce package

# 這會生成 .vsix 檔案可供安裝
```
# 測試伺服器控制命令

這個文件包含了測試伺服器控制功能的步驟。

## 測試步驟

1. **打開 VSCode 並安裝擴展**
   - 確保 Ramen 擴展已安裝且激活
   - 檢查側邊欄是否顯示 "Ramen Server" 面板

2. **測試啟動伺服器**
   - 方式1：在 Ramen Server 面板中點擊 "Start Server" 按鈕
   - 方式2：使用命令面板 (Ctrl+Shift+P) 執行 "Ramen: Start Server"
   - 預期結果：
     - 伺服器狀態變為 "Running"
     - 顯示成功訊息
     - Server 面板顯示 PID、端口等資訊

3. **測試重啟伺服器**
   - 在伺服器運行時，點擊 "Restart Server" 按鈕
   - 或使用命令面板執行 "Ramen: Restart Server"
   - 預期結果：
     - 顯示 "Restarting Ramen server..." 訊息
     - 舊進程被終止
     - 新進程啟動
     - PID 改變，狀態保持 "Running"

4. **測試停止伺服器**
   - 在伺服器運行時，點擊 "Stop Server" 按鈕
   - 或使用命令面板執行 "Ramen: Stop Server"
   - 預期結果：
     - 伺服器狀態變為 "Stopped"
     - PID 和運行時間資訊消失
     - WebSocket 連接斷開

## 檢查點

- [ ] 按鈕在正確的狀態下顯示（基於 `ramen:serverRunning` 上下文）
- [ ] 命令能正確執行且顯示適當的訊息
- [ ] 伺服器程序能正確啟動、停止和重啟
- [ ] WebSocket 連接狀態正確更新
- [ ] Server 面板資訊正確更新

## 已修復的問題

1. ✅ 添加了缺失的 `stopServer` 和 `restartServer` 方法
2. ✅ 註冊了伺服器控制命令
3. ✅ 修復了伺服器關閉邏輯（優雅關閉 + 強制關閉）
4. ✅ 確保 `ramen:serverRunning` 上下文在初始化時正確設置
5. ✅ 添加了 WebSocket 斷開邏輯
6. ✅ 改善了擴展停用時的資源清理

## 技術改進

1. **優雅關閉**：首先發送 SIGTERM，等待5秒，然後使用 SIGKILL 強制終止
2. **狀態同步**：確保 UI 狀態與實際伺服器狀態同步
3. **錯誤處理**：添加了適當的錯誤處理和用戶反饋
4. **資源清理**：確保在擴展關閉時正確清理所有資源
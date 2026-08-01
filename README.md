# 鮮選食材採購網 — RWD + PWA 版本

## 這個 ZIP 裡有什麼

```
index.html      主頁面（已加入 PWA meta 標籤、SW 註冊、手機版導覽選單）
manifest.json   PWA 應用程式資訊（名稱、圖示、主題色、啟動方式）
sw.js           Service Worker（離線快取、App Shell 快取）
offline.html    離線時的備用頁面
icons/          PWA 圖示（192/512px 一般版與 maskable 版、Apple Touch Icon）
```

## 已完成的調整

### RWD（響應式設計）
- 原本的 Tailwind 版面已具備 `sm:` / `lg:` 響應式類別（商品格線在手機上為 1 欄、平板 2 欄、桌機 4 欄）。
- 新增**手機版導覽選單抽屜**：原本手機上的漢堡選單按鈕沒有作用，現在點擊會滑出左側選單。
- `viewport` meta 標籤加上 `viewport-fit=cover`，讓內容能正確延伸至有瀏海/圓角的手機螢幕。

### PWA（漸進式網頁應用）
- **manifest.json**：定義應用名稱、圖示、`standalone` 顯示模式、主題色 `#15803d`，讓使用者可以「加到主畫面」，開啟後如同原生 App（無瀏覽器網址列）。
- **Service Worker（sw.js）**：
  - 安裝時預先快取首頁、離線頁與圖示（App Shell）。
  - 頁面導覽採 **Network First**，離線時自動顯示 `offline.html`。
  - 其他靜態資源（CDN 的 Tailwind/Lucide/字型/圖片）採 **Stale-While-Revalidate**，加快重複造訪速度並支援離線瀏覽。
  - Supabase API 與 GA4 追蹤請求一律直連網路，不快取，避免訂單資料或分析數據失真。
- **安裝提示 Banner**：偵測瀏覽器的 `beforeinstallprompt` 事件，顯示自訂樣式的「安裝到主畫面」提示卡片。
- 已加入 Apple / Android 相關 meta 標籤（`apple-mobile-web-app-capable`、`theme-color` 等），提升 iOS Safari 加入主畫面後的體驗。

## 如何測試

⚠️ **Service Worker 必須在 HTTPS 或 localhost 環境下才能運作**，直接用瀏覽器開啟 `file://` 路徑無法註冊成功。

### 方法一：使用 VS Code 的 Live Server 擴充套件
1. 用 VS Code 開啟這個資料夾。
2. 安裝「Live Server」擴充套件，右鍵 `index.html` → Open with Live Server。

### 方法二：使用 Python 內建伺服器
```bash
cd 這個資料夾
python3 -m http.server 8000
```
然後瀏覽器開啟 `http://localhost:8000`。

### 檢查 PWA 是否成功
1. Chrome 開發者工具 → Application 分頁 → Manifest / Service Workers，確認皆已註冊成功、無錯誤。
2. 網址列右側應會出現「安裝」圖示，或頁面右下角會跳出安裝提示卡片。
3. 安裝後開啟關閉網路（開發者工具 Network → Offline），重新整理頁面，應能看到離線頁面而非瀏覽器錯誤畫面。

## 部署到正式環境
上傳到任何支援 HTTPS 的靜態網站託管服務即可（例如 Vercel、Netlify、GitHub Pages、Cloudflare Pages）。上傳時請保持資料夾結構不變（`manifest.json`、`sw.js`、`icons/` 需與 `index.html` 同層）。

## 注意事項
- 原始檔案中的 Supabase 金鑰與資料表設定維持不變，請自行確認正式上線前的安全性與 RLS 權限設定。
- 若要更換 App 圖示，請替換 `icons/` 資料夾內的圖片（保持相同檔名與尺寸）即可，或修改 `manifest.json` 中的路徑。

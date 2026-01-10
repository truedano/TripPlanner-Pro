<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 📝 TripPlanner Pro (v0.3.1)


### 您的 AI 智慧旅遊規劃專家

一款專為現代旅人設計的精品行程管理工具。整合了 Gemini AI 的智慧與直覺的地理視覺化功能。

[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat&logo=react&logoColor=white)](https://reactjs.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199903?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)

---

</div>

## ✨ 核心特色

### 🤖 AI 智慧規劃與優化
- **一鍵生成行程**：只需輸入名稱與日期，AI 即可為您規劃景點與美食地圖。
- **路徑自動優化**：智慧分析地理位置，一鍵重新排序最順路的行程，拒絕繞路。
- **GPS 座標賦予**：AI 在規劃時會自動補全景點座標，無需手動查詢。

### 🗺️ 互動式地圖視覺化 (New)
- **視覺化動線**：整合 Leaflet 地圖，直接在編輯器中查看到當日景點分布與移動曲線。
- **全螢幕地圖切換**：靈活切換「列表模式」與「地圖模式」。
- **座標快速管理**：全面支援 Google Maps 網址解析 (含短網址與座標格式)，亦可直接貼上「緯度, 經度」。

### 📱 隨身導航助理
- **一鍵智慧導航**：在列表或地圖中點擊導航按鈕，立即喚起 Google Maps 啟動路徑導引。
- **行動優先設計**：流暢的響應式介面，支援長標題自動換行，讓您在手機上也能完整閱讀所有資訊。

### 🗂️ 全方位行程管理
- **拖拽式排序**：直覺的 DnD 操作，支援跨天調整行程。
- **多媒體紀錄**：支援拍照與相簿上傳，紀錄旅行的每一刻。
- **安心刪除機制**：刪除行程時會明確顯示行程名稱，防止誤刪重要回憶。
- **預算追蹤**：分類追蹤各項支出（交通、住宿、伙食等），自動統計當日總支出。

### ☁️ 卓越的雲端同步引擎 (New)
- **高效能並列同步**：採用非同步並列下載與批次處理技術，大幅提升雲端同步速度。
- **資料安全護盾**：內建 API 異常偵測機制，防止因連線問題導致本地行程誤刪，確保資料 100% 安全。
- **自動分頁處理**：完整支援 Google Drive 大量檔案存取，無上限管理您的所有旅行回憶。
- **智慧背景同步**：基於 Ref 狀態維護的背景更新機制，在不干擾操作的情況下默默守護您的資料。

---

## 🚀 快速開始

### 環境需求
- Node.js (建議 v18 以上)

### 安裝步驟

1. **複製專案並安裝依賴**
   ```bash
   npm install
   ```

2. **設定 API Key**
   點擊 App 內的「⚙️ 設定」或在 `.env` 中填寫您的 Google Gemini API Key。

3. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

### 🌍 設定 Google Maps 短網址解析 (選填)
為了讓應用程式能解析 `maps.app.goo.gl` 這類短網址，本專案使用 Google Apps Script 作為中介服務。

1. **取得程式碼**：
   複製專案目錄下 `scripts/GoogleMapsUrlResolver.gs` 的內容。

2. **建立 GAS 專案**：
   前往 [Google Apps Script](https://script.google.com/) 建立新專案，將程式碼貼入 `Code.gs`。

3. **部署服務**：
   - 點擊右上角「部署」>「新建部署」。
   - 選擇類型為「網頁應用程式」。
   - **誰可以存取**：務必設為「**任何人 (Anyone)**」以允許跨網域請求。
   - 複製部署後的 Web App URL。

4. **更新專案設定**：
   - 在專案根目錄建立或開啟 `.env` 檔案。
   - 新增變數 `VITE_GOOGLE_SCRIPT_URL=您的_WEB_APP_URL`。

---

## 🛠️ 技術棧
- **Frontend**: React 19, Vite, Tailwind CSS (Glassmorphism UI)
- **AI Service**: Google GenAI (Gemini-1.5-Flash)
- **DB & Storage**: Dexie.js (IndexedDB)
- **Mapping**: Leaflet, React Leaflet
- **Icons**: Lucide React

---
<div align="center">
  <p>致力於為每一位旅人提供極致的規劃體驗。</p>
</div>

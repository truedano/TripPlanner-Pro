<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 📝 TripPlanner Pro (v0.5.0)


### 您的 AI 智慧旅遊規劃專家

一款專為現代旅人設計的精品行程管理工具。整合了 Gemini AI 的智慧與直覺的地理視覺化功能。

[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat&logo=react&logoColor=white)](https://reactjs.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199903?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com/)

---

</div>

## ✨ 核心特色

### 🤖 AI 智慧規劃與優化 (Enhanced)
- **智慧導引流程**：全新的分步規劃嚮導，讓您從設定目標到生成行程一氣呵成。
- **一鍵生成行程**：只需輸入名稱與日期，AI 即可為您規劃景點與美食地圖。
- **路徑自動優化 (New)**：智慧分析地理位置，AI 一鍵為您重新排序最順路的行程，徹底告別繞路煩惱。
- **GPS 座標自動化**：AI 在規劃時會自動補全景點座標，實現精準的地圖定位。

### 🗺️ 互動式地圖視覺化 (Enhanced)
- **雙模式自由切換**：在行程編輯器中隨時切換「列表模式」與「地圖模式」，即時掌握景點分佈。
- **視覺化移動曲線**：整合 Leaflet 地圖，直接查看到當日景點間的移動動線。
- **座標快速管理**：全面支援 Google Maps 網址解析 (含短網址與座標格式)，亦可直接貼上「緯度, 經度」。

### 📱 隨身導航助理
- **一鍵智慧導航**：在列表或地圖中點擊導抗按鈕，立即喚起 Google Maps 啟動路徑導引。
- **行動優先設計**：精緻的響應式介面與手寫筆觸感設計，讓您在旅途中也能流暢操作。

### 🗂️ 全方位行程管理
- **住宿複製功能 (New)**：支援一鍵將住宿資料複製到任意多個日期，完美應對長期連住的情境。
- **分類管理系統**：將行程細分為景點、交通、住宿、伙食，管理更加井然有序。
- **跨天拖拽排序**：直覺的 DnD 操作，支援手動排序或直接將景點「跨天」拖動至其他日期標籤。
- **多媒體紀錄**：支援拍照與相簿上傳，紀錄旅行的每一刻。
- **預算精確追蹤**：智慧統計當日與總預算，支出類別清晰可見。

### ☁️ 卓越的雲端同步引擎
- **高效能並列同步**：採用非同步並列下載與批次處理技術，大幅提升雲端同步速度。
- **API 安全護盾**：內建 API 異常偵測與金鑰管理機制，確保資料同步安全無虞。
- **自動分頁處理**：完整支援 Google Drive 大量檔案存取，無上限管理您的所有旅行回憶。

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
- **Utils**: clsx, tailwind-merge

---

## 🆕 v0.5.0 更新說明 (Smart Copy & UX Polish)
- **住宿複製功能**：
  - 新增 `CopySpotModal` 組件，支援將住宿項目（含地點、筆記、圖片、支出）同步至多個自選日期。
  - 在住宿類型卡片新增「複製」操作按鈕。
  - 複製邏輯會自動為子項目（筆記與支出）生成全新 ID，確保各天紀錄互不干擾。
- **UI/UX 精緻化改進**：
  - **支出明細優化**：重構 `SpotEditModal` 的支出名稱佈局，解決小螢幕下的貨幣符號溢出缺陷，並優化對齊比例。
  - **時間輸入體驗**：時間輸入框改用 `tabular-nums` 字體，並調整寬度與內距，修復數字與操作圖示重疊的問題。
  - **數據專業化用語**：將財務總結中的「支出狀態」優化為「預算結餘」，並新增未設定預算時的提示引導。
- **性能與穩定性**：優化 Modal 內的渲染判斷，並確保複製過程中的資料完整性。

---

## 🆕 v0.4.2 更新說明 (UX & Code Architecture Optimization)
- **DnD 體驗優化**：重構拖拽碰撞偵測邏輯，將 `closestCenter` 改為 `pointerWithin`，顯著提升「跨天移動」景點時的分頁目標偵測靈敏度，修復無法移回前一天的問題。
- **架構簡化 (Code Simplification)**：
  - 建立全域 `utils/constants.ts` 集中管理景點分類的主題（圖示、標籤、Tailwind 色彩、SVG 顏色代碼）。
  - 徹底簡化 `Step2Editor` 與 `Step3Summary` 中的冗餘條件判斷邏輯，提升代碼可維護性。
- **渲染安全性強化**：在 `Step2Editor` 導入類型安全保護機制 (Optional Chaining & Fallback)，避免因異常數據或狀態同步延遲導致組件崩潰。
- **資料處理效能優化**：合併 `Step2Editor` 內部的多個過濾運算為單次遍歷，減少 React 渲染期間的運算開銷。

---

## 🆕 v0.4.1 更新說明 (Performance & Dx Optimization)
- **基礎設施升級**：整合 `clsx` 與 `tailwind-merge`，建立統一的類名管理工具 `cn()`。
- **渲染效能解析**：對 `Step2Editor` 進行深度重構，導入 `useMemo` 快取複雜過濾運算，並使用 `useCallback` 穩定函數引用，大幅減少不必要的子組件重繪。
- **UI 樣式模組化**：提取常用的 Tailwind 複合樣式為 `@utility` 類別，降低 JSX 冗餘度並維護主題一致性。
- **API 安全性強化**：
  - API Key 管理模組新增顯示/隱藏獨立狀態切換，防止敏感資訊洩漏。
  - 新增 API 驗證超時 (Timeout) 機制，優化網路不佳時的使用者體驗。
- **全域工具集**：建立 `utils/date.ts` 統一處理日期格式化，為未來的多語言支援打下基礎。

---

---
<div align="center">
  <p>致力於為每一位旅人提供極致的規劃體驗。</p>
</div>

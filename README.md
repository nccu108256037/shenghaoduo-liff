# 省好多日用品送到家 LIFF 商城

手機版 HTML/CSS/JavaScript 靜態商城，可部署到 Vercel，商品與訂單透過 Google Apps Script 連接 Google Sheet。

## 1. Google Sheet 欄位

建立一個 Google Sheet，新增兩個工作表：

### Products
| id | name | category | price | image | stock | tags | quick |
|---|---|---|---:|---|---:|---|---|
| P001 | 南亞保鮮膜 | 廚房用品 | 45 | 圖片網址 | 999 | 保鮮膜,廚房 | TRUE |

### Orders
第一列留給程式自動建立也可以：
| createdAt | orderId | lineUserId | lineName | name | phone | address | itemsJson | total | status |

## 2. Apps Script 部署

1. Google Sheet → 擴充功能 → Apps Script
2. 貼上 `apps-script/Code.gs`
3. 修改 `SHEET_ID` 成你的 Google Sheet ID
4. 部署 → 新增部署作業 → 網頁應用程式
5. 執行身分：我
6. 誰可以存取：任何人
7. 複製 Web App URL
8. 填回 `public/js/config.js` 的 `GOOGLE_SCRIPT_URL`

## 3. LIFF 設定

1. LINE Developers Console → 建立 LIFF app
2. Endpoint URL 填 Vercel 部署後的網址
3. Size 建議 Full
4. 複製 LIFF ID
5. 填回 `public/js/config.js` 的 `LIFF_ID`

## 4. Vercel 部署

```bash
npm i -g vercel
vercel --prod
```

或把資料夾推到 GitHub，再在 Vercel Import Project。

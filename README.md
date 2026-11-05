# LIFF_Demo — 純前端的 LINE 登入

一份**不含任何後端**的 LINE 登入示範，用 [LIFF](https://developers.line.biz/en/docs/liff/)
（LINE Front-end Framework）在瀏覽器裡直接拿到使用者的 profile 與 ID token，
可以直接丟到 GitHub Pages 這類靜態託管。

對照組是同目錄外的 `D:\git\GAE265\linelogin`：那套 FastAPI 版走的是標準
OAuth 2.0 authorization code 流程，必須用 `client_secret` 在伺服器端換 token。

---

## 為什麼這樣可以沒有後端

| | FastAPI 版 | 這個 LIFF 版 |
| --- | --- | --- |
| token 交換 | 伺服器端 `POST /oauth2/v2.1/token`，帶 `client_secret` | 不用交換，LINE 平台直接發給 LIFF SDK |
| 使用者資料 | 伺服器解析 ID token 後寫進 session | 前端 `liff.getProfile()` / `liff.getDecodedIDToken()` |
| 需要的基礎設施 | Python 服務 + 對外 HTTPS 網域 | 一個靜態網頁 |
| secret 放哪 | `.env`（伺服器） | **完全沒有 secret** |
| 適合 | 需要自己的 session、寫資料庫 | 前台展示、嵌入 LINE 聊天室 |

代價：LIFF 的登入體驗綁在 LINE 生態——在手機 LINE 裡打開最順，
在桌機瀏覽器直接開網址一樣要登入 LINE，而且需要先建 LIFF app。

---

## 檔案

```
Web/
├── index.html      # 頁面
├── styles.css      # 樣式
├── config.js       # 只有一個設定：LIFF_ID
├── app.js          # init / login / profile / ID token
└── README.md
```

沒有建置流程，改完存檔就是最終產物。

---

## 部署到 GitHub Pages

這個 repo：`https://github.com/jieyou-chyu/LIFF_Demo`

1. GitHub → repo → **Settings → Pages**
2. Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)`，按 Save
3. 等 1–2 分鐘，網址會是
   `https://jieyou-chyu.github.io/LIFF_Demo/`

之後每次 `git push` 到 `main` 都會自動重新部署。

> 頁面內所有資源都用相對路徑（`./styles.css`），所以放在 `/LIFF_Demo/` 子路徑也正常。

---

## 建立 LIFF app（只有第一次要做）

LINE Developers Console → 你的 LINE Login channel（ID `2012349310`）→ **LIFF** 分頁 → **Add**

| 欄位 | 填什麼 |
| --- | --- |
| LIFF app name | `LIFF Demo` |
| Size | `Full` |
| Endpoint URL | `https://jieyou-chyu.github.io/LIFF_Demo/` |
| Scope | 勾 **`profile`** 與 **`openid`** |
| Bot link feature | Off（用不到） |

建立後在列表複製 **LIFF ID**，長得像 `2012349310-AbCdEfgh`。

**Endpoint URL 的規則**：`liff.init()` 執行的網址必須以它為前綴。
設成 `https://jieyou-chyu.github.io/LIFF_Demo/` 時，
`https://jieyou-chyu.github.io/LIFF_Demo/`、`.../index.html` 都在範圍內；
若之後加了子頁（如 `/entry/`）也仍可用。

---

## 填 LIFF ID

編輯 `config.js`：

```js
window.LIFF_ID = "2012349310-AbCdEfgh";
```

然後 commit、push。**或者不改檔案**，臨時測試時在網址後面加：

```
https://jieyou-chyu.github.io/LIFF_Demo/?liffId=2012349310-AbCdEfgh
```

（該網址仍必須落在 Endpoint URL 之下）

---

## 怎麼測

1. **桌機瀏覽器**：直接開 Pages 網址 → 會出現「使用 LINE 登入」→ 走 LINE 帳號驗證 → 回來顯示名字／頭像／userId／ID token 內容。
2. **手機 LINE**：把網址傳到自己的 LINE 聊天室裡點開，會在 LINE 內開 LIFF 瀏覽器，通常**自動登入**，不會再跳帳密頁。

頁面上會顯示執行環境（是否在 LIFF 瀏覽器內、OS、SDK 版本），方便判斷現在走的是哪條路。

---

## 疑難排解

| 現象 | 原因 | 解法 |
| --- | --- | --- |
| 頁面顯示「還缺 LIFF ID」 | `config.js` 沒填 | 填 LIFF ID 或加 `?liffId=` |
| `liff.init() 失敗`，訊息含 `INVALID_ENDPOINT_URL` | Endpoint URL 與目前網址不是同一前綴 | 把 Endpoint URL 改成目前網址的上層路徑 |
| 拿不到 profile | Scope 沒勾 `profile` | LIFF 分頁 → Scope 補勾後儲存 |
| 拿不到 ID token | Scope 沒勾 `openid` | 同上 |
| 桌機開啟一直停在「尚未登入」 | 外部瀏覽器不會自動登入 | 按「使用 LINE 登入」 |
| 手機點開說找不到頁面 | Pages 還沒部署完 | 等 1–2 分鐘，或看 Actions 紀錄 |
| 改了檔案但畫面沒變 | 瀏覽器快取 | 強制重新整理（Ctrl+F5） |

---

## 安全備註

- 這份程式**沒有任何 secret**，也**不把使用者資料送回伺服器**——`liff.getProfile()`
  與 `liff.getDecodedIDToken()` 的結果只顯示在畫面上（官方文件也明確建議不要把這些資料送到伺服器）。
- 若之後要「前端顯示 + 後端驗身分」，正確做法是把 `liff.getIDToken()` 的 ID token
  送到後端，由後端呼叫 `POST https://api.line.me/oauth2/v2.1/verify` 驗證（只需 `client_id`，不需 secret）。
- GitHub Pages 是公開靜態站，別把任何 key、secret、內部網址寫進來。

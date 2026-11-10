# TSC VIP 雲端串接

原本的 Supabase 會員帳號、資料表和站內諮詢可繼續使用。Google 表單和站內諮詢會一起出現在「VIP 諮詢管理」，並標出來源。

## 啟用順序

1. 在對應環境的 Supabase 執行 [新增遷移](../../supabase/migrations/20261110_vip_portal_integrations.sql)。這份遷移依賴既有的 VIP 角色、漏斗、名錄、諮詢、工作人員目錄及分派資料表。
2. 用管理表單的 Google 帳號建立 Apps Script 專案，將 [Code.gs](Code.gs) 貼入並儲存。在專案設定的「指令碼屬性」加入 `TSC_SUPABASE_URL` 和 `TSC_SUPABASE_ANON_KEY`。使用既有網站的 Supabase publishable 或 anon key。
3. 從 Apps Script 編輯器執行 `setupTscConsultationForm`，由 Google 帳號持有人完成畫面上的授權。程式會建立表單、設定欄位、發佈並安裝提交觸發器。執行記錄會印出表單管理網址和 `NEXT_PUBLIC_GOOGLE_FORM_TEMPLATE`。
4. 在 Vercel 對應環境設定 `NEXT_PUBLIC_GOOGLE_FORM_TEMPLATE`，重新部署。先以測試 VIP 在會員頁開啟專屬連結，送一筆測試諮詢，再用已授權的員工帳號確認諮詢與來源。
5. 在 [會員檔案庫](https://drive.google.com/drive/folders/1YASoOSQUV6NiOeI-ckRQvu-HZgtnyuy6) 上傳逐字稿、合約、錄音或訪談細節。為檔案設定指定工作人員的 Google Drive 權限，再把連結登記到會員總覽。Supabase 限制檔案索引的讀取，Google Drive 另行判斷檔案本身的權限。

## 使用方式

- 會員可編輯自己的三階段漏斗，並選擇是否在名錄中分享漏斗及 LINE 聯絡連結。
- 工作人員可在會員總覽編輯生日、聯絡方式、LINE、追蹤燈號、下次追蹤日期與下一步。新欄位與檔案索引由管理員及該會員的有效指派人員存取。
- Google 表單的會員驗證碼有效 24 小時。回覆會以會員帳號和 Google 回覆 ID 對應，重送同一回覆時不會重複建單。若遇到同步中斷，可在 Apps Script 執行 `replayRecentTscConsultations` 補送最近 24 小時的回覆。

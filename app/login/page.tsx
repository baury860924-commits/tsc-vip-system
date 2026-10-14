"use client";
import {useState} from "react";
import {createClient} from "@supabase/supabase-js";
export default function LoginPage(){
 const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const ready=Boolean(url&&key);
 async function submit(e:React.FormEvent){e.preventDefault();if(!ready)return;setBusy(true);setMessage("");try{const client=createClient(url!,key!);const {error}=await client.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin+"/auth/callback"}});setMessage(error?"登入連結寄送失敗，請稍後再試。":"若此信箱可使用登入服務，請查看電子郵件中的驗證連結。");}catch{setMessage("登入服務暫時無法連線。");}finally{setBusy(false);}}
 return <main style={{maxWidth:480,margin:"8vh auto",padding:24,fontFamily:"system-ui,sans-serif"}}><a href="/" style={{color:"#155e75"}}>← 返回 VIP 系統展示頁</a><h1>VIP 系統登入</h1><p>管理人員與 VIP 會員登入入口</p><form onSubmit={submit} style={{display:"grid",gap:14}}><label htmlFor="email">電子郵件</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" style={{padding:12,border:"1px solid #aaa",borderRadius:8}}/><button disabled={!ready||busy} type="submit" style={{padding:12,border:0,borderRadius:8,background:"#164e63",color:"white"}}>{busy?"寄送中…":"寄送登入驗證連結"}</button></form>{message&&<p role="status">{message}</p>}{!ready&&<p style={{padding:12,background:"#fff4d6",borderRadius:8}}>登入功能尚未啟用：網站尚未完成 Supabase 連線設定。請勿在此輸入真實會員資料。</p>}<p style={{color:"#555",fontSize:14}}>此頁為登入入口建置階段；帳號角色、資料權限與雲端會員資料同步尚未開通。</p></main>;
}
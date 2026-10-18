"use client";
import {useState} from "react";
import {createClient} from "@supabase/supabase-js";

export default function LoginPage(){
 const [email,setEmail]=useState("baury860924@gmail.com");
 const [password,setPassword]=useState("");
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const ready=Boolean(url&&key);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!ready)return;
  setBusy(true);setMessage("");
  try{
   const client=createClient(url!,key!);
   const {error}=await client.auth.signInWithPassword({email:email.trim(),password});
   if(error){
    const code=error.code;
    if(code==="email_not_confirmed")setMessage("這個帳號的 Email 尚未完成驗證，請由 Supabase 管理員確認帳號狀態。");
    else if(code==="over_email_send_rate_limit"||code==="over_request_rate_limit"||error.status===429)setMessage("驗證服務目前有請求次數限制，請稍後再試，不要連續重複登入。");
    else if(code==="invalid_credentials")setMessage("電子郵件或密碼不正確，或此帳號尚未設定密碼。為保護帳號安全，系統不會透露帳號是否存在。請至 Supabase Authentication → Users 確認帳號。");
    else setMessage("登入失敗（"+(code||"驗證錯誤")+"），請檢查 Supabase Authentication 設定。");
    return;
   }
   window.location.assign("/account");
  }catch{setMessage("登入服務暫時無法連線。");}
  finally{setBusy(false);}
 }
 return <main style={{maxWidth:480,margin:"8vh auto",padding:24,fontFamily:"system-ui,sans-serif"}}>
  <a href="/" style={{color:"#155e75"}}>← 返回 VIP 系統展示頁</a>
  <h1>VIP 系統登入</h1>
  <p>管理人員與 VIP 會員登入入口</p>
  <form onSubmit={submit} style={{display:"grid",gap:14}}>
   <label htmlFor="email">電子郵件</label>
   <input id="email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" style={{padding:12,border:"1px solid #aaa",borderRadius:8}}/>
   <label htmlFor="password">密碼</label>
   <div style={{display:"flex",border:"1px solid #aaa",borderRadius:8,overflow:"hidden"}}>
    <input id="password" type={showPassword?"text":"password"} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="請輸入密碼" style={{flex:1,minWidth:0,padding:12,border:0}}/>
    <button type="button" aria-label={showPassword?"隱藏密碼":"顯示密碼"} aria-pressed={showPassword} title={showPassword?"隱藏密碼":"顯示密碼"} onClick={()=>setShowPassword(v=>!v)} style={{padding:"0 14px",border:0,background:"transparent",cursor:"pointer",fontSize:20}}>
     <span aria-hidden="true">👁</span>
     <span style={{fontSize:12,marginLeft:5}}>{showPassword?"隱藏":"顯示"}</span>
    </button>
   </div>
   <button disabled={!ready||busy} type="submit" style={{padding:12,border:0,borderRadius:8,background:"#164e63",color:"white",cursor:ready?"pointer":"not-allowed"}}>{busy?"驗證中…":"登入"}</button>
  </form>
  {message&&<p role="status">{message}</p>}
  {!ready&&<p style={{padding:12,background:"#fff4d6",borderRadius:8}}>登入尚未啟用：網站尚未完成 Supabase 連線設定。此處請勿輸入真實密碼。</p>}
  <p style={{color:"#555",fontSize:14}}>管理員 Email 僅預填方便辨識，不代表已建立帳號或授予管理權限。密碼需在正式身分驗證服務中安全建立。</p>
 </main>;
}

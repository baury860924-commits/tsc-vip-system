"use client";

import {useState,type FormEvent} from "react";
import {createClient} from "@supabase/supabase-js";
import "../member/portal.css";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function LoginPage(){
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [mode,setMode]=useState<"email"|"password">("email");
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [sentTo,setSentTo]=useState("");
 const emailMode=mode==="email";
 const ready=Boolean(url&&key);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!url||!key||busy)return;
  const address=email.trim();
  setBusy(true);
  setMessage("");
  setSentTo("");
  try {
   const client=createClient(url,key);
   const {error}=emailMode?await client.auth.signInWithOtp({
    email:address,options:{shouldCreateUser:false,emailRedirectTo:window.location.origin+"/auth/callback"}
   }):await client.auth.signInWithPassword({email:address,password});
   if(error){
    if(error.code==="over_email_send_rate_limit"||error.code==="over_request_rate_limit"||error.status===429){
     setMessage("剛才的登入嘗試較頻繁，請稍等幾分鐘再試。");
    }else if(emailMode){
     setMessage("目前無法寄出登入連結。請確認 Email 是否填寫正確，再試一次。");
    }else if(error.code==="email_not_confirmed"||error.code==="invalid_credentials"){
     setMessage("無法使用這組資料登入。請確認 Email 和密碼，或改用 Email 登入連結。");
    }else{
     setMessage("暫時無法登入，請稍後再試。");
    }
    return;
   }
   if(emailMode){
    setSentTo(address);
    return;
   }
   window.location.assign("/auth/landing");
  }catch{
   setMessage("目前連不上登入服務，請確認網路後再試。");
  }finally{
   setBusy(false);
  }
 }

 function chooseMode(nextMode:"email"|"password"){
  if(nextMode===mode)return;
  setMode(nextMode);
  setMessage("");
  setShowPassword(false);
 }

 return <main className="member-portal portal-access">
  <header className="portal-header">
   <span className="portal-brand"><strong>TSC</strong> VIP</span>
   <a href="/">返回系統展示頁</a>
  </header>
  <section className="portal-panel" aria-labelledby="login-title">
   <div className="portal-section-heading">
    <h1 id="login-title">歡迎回來</h1>
    <p>請使用你在 TSC 登記的 Email 登入。</p>
   </div>
   <div className="portal-mode" role="group" aria-label="登入方式">
    <button type="button" aria-pressed={emailMode} disabled={busy} onClick={()=>chooseMode("email")}>Email 登入連結</button>
    <button type="button" aria-pressed={!emailMode} disabled={busy} onClick={()=>chooseMode("password")}>使用密碼</button>
   </div>
   <p className="portal-hint">{emailMode?"我們會寄一封信給你，點開信中的連結就能登入。":"請輸入你已設定的登入密碼。"}</p>
   <form onSubmit={submit}>
    <fieldset className="portal-fields" disabled={!ready||busy}>
     <label>電子郵件
      <input type="email" name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={email} onChange={event=>{setEmail(event.target.value);setSentTo("");setMessage("");}} placeholder="name@example.com"/>
     </label>
     {!emailMode&&<div className="portal-password">
      <label>密碼
       <input type={showPassword?"text":"password"} name="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/>
      </label>
      <button className="portal-secondary" type="button" aria-label={showPassword?"隱藏密碼":"顯示密碼"} onClick={()=>setShowPassword(value=>!value)}>{showPassword?"隱藏":"顯示"}</button>
     </div>}
     <button type="submit">{busy?"處理中…":emailMode?(sentTo?"重新寄送登入連結":"寄送登入連結"):"登入"}</button>
    </fieldset>
   </form>
   <p className="portal-message" role="status">{emailMode&&sentTo?
    <>登入連結已寄到 <strong>{sentTo}</strong>。請到收件匣點開連結，也可以查看垃圾郵件資料夾。</>:
    message||(!ready?"會員服務目前無法登入，請聯絡 TSC 團隊。":"")}</p>
  </section>
  <p className="portal-access-help">第一次登入或不確定登記的是哪個 Email？請聯絡 TSC 團隊協助確認。</p>
 </main>;
}


"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";

export default function ResetPasswordPage(){
 const [client,setClient]=useState<SupabaseClient|null>(null);
 const [authorized,setAuthorized]=useState(false);
 const [loading,setLoading]=useState(true);
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [show,setShow]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [done,setDone]=useState(false);
 useEffect(()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setMessage("網站尚未設定登入服務。");setLoading(false);return;}
  const sb=createClient(url,key);
  setClient(sb);
  let active=true;
  const params=new URLSearchParams(window.location.search);
  const hash=new URLSearchParams(window.location.hash.replace(/^#/,""));
  const error=params.get("error_description")||hash.get("error_description");
  if(error){setMessage("重設連結已失效或無法驗證，請重新取得密碼重設信。");setLoading(false);return;}
  const {data:{subscription}}=sb.auth.onAuthStateChange((event,session)=>{
   if(!active)return;
   if(event==="PASSWORD_RECOVERY"&&session){setAuthorized(true);setMessage("");setLoading(false);}
  });
  async function initialize(){
   try{
    const tokenHash=params.get("token_hash");
    const code=params.get("code");
    if(tokenHash&&params.get("type")==="recovery"){
     const {error:verifyError}=await sb.auth.verifyOtp({token_hash:tokenHash,type:"recovery"});
     if(verifyError)throw verifyError;
    }else if(code){
     const {error:codeError}=await sb.auth.exchangeCodeForSession(code);
     if(codeError)throw codeError;
    }
    const {data:{session}}=await sb.auth.getSession();
    if(active){
     if(session&&(hash.get("type")==="recovery"||params.get("type")==="recovery"||Boolean(tokenHash)||Boolean(code)))setAuthorized(true);
     else setMessage("尚未取得有效的密碼重設授權。請由最新的重設信開啟此頁面。");
    }
   }catch{
    if(active)setMessage("密碼重設連結已失效，請重新申請一次。");
   }finally{if(active)setLoading(false);}
  }
  void initialize();
  return ()=>{active=false;subscription.unsubscribe();};
 },[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();
  if(!client||!authorized)return;
  if(password.length<12){setMessage("請設定至少 12 個字元的新密碼。");return;}
  if(password!==confirm){setMessage("兩次輸入的密碼不一致。");return;}
  setBusy(true);setMessage("");
  const {error}=await client.auth.updateUser({password});
  if(error)setMessage("更新失敗："+(error.code||"請稍後再試")+"。");
  else{setDone(true);setPassword("");setConfirm("");await client.auth.signOut();}
  setBusy(false);
 }
 return <main style={{maxWidth:480,margin:"8vh auto",padding:24,fontFamily:"system-ui,sans-serif"}}>
  <h1>設定新的登入密碼</h1>
  {loading?<p>正在驗證密碼重設連結…</p>:done?<><p role="status">密碼已更新成功，請使用新密碼登入。</p><a href="/login">前往登入頁面 →</a></>:authorized?<form onSubmit={submit} style={{display:"grid",gap:14}}>
   <label htmlFor="new-password">新密碼（至少 12 個字元）</label>
   <div style={{display:"flex",border:"1px solid #aaa",borderRadius:8}}>
    <input id="new-password" type={show?"text":"password"} autoComplete="new-password" value={password} required onChange={e=>setPassword(e.target.value)} style={{flex:1,minWidth:0,padding:12,border:0}}/>
    <button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?"隱藏密碼":"顯示密碼"} style={{padding:"0 12px",border:0,background:"transparent"}}>👁 {show?"隱藏":"顯示"}</button>
   </div>
   <label htmlFor="confirm-password">再次輸入新密碼</label>
   <input id="confirm-password" type={show?"text":"password"} autoComplete="new-password" value={confirm} required onChange={e=>setConfirm(e.target.value)} style={{padding:12,border:"1px solid #aaa",borderRadius:8}}/>
   <button type="submit" disabled={busy} style={{padding:12,border:0,borderRadius:8,background:"#164e63",color:"white"}}>{busy?"更新中…":"確認修改密碼"}</button>
  </form>:<p>目前無法修改密碼。</p>}
  {message&&<p role="status">{message}</p>}
  <p style={{fontSize:13,color:"#555"}}>請勿將密碼、驗證連結或含有驗證資訊的網址傳送給他人。</p>
 </main>;
}

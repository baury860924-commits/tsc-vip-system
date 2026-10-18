"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
export default function AccountPage(){
 const [client,setClient]=useState<SupabaseClient|null>(null);
 const [email,setEmail]=useState("");
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setMessage("登入服務尚未設定");setLoading(false);return;}
  const sb=createClient(url,key);setClient(sb);
  let active=true;
  sb.auth.getUser().then(({data,error})=>{
   if(!active)return;
   if(error||!data.user){setMessage("尚未登入，請先完成帳號驗證。");}
   else setEmail(data.user.email||"");
   setLoading(false);
  }).catch(()=>{if(active){setMessage("無法確認登入狀態。");setLoading(false);}});
  return ()=>{active=false;};
 },[]);
 async function signOut(){if(!client)return;await client.auth.signOut();window.location.href="/login";}
 return <main style={{maxWidth:620,margin:"8vh auto",padding:24,fontFamily:"system-ui,sans-serif"}}>
  <h1>TSC VIP 帳號中心</h1>
  {loading?<p>正在確認登入身分…</p>:email?<><p>已通過 Supabase 身分驗證：<strong>{email}</strong></p>
   <p style={{background:"#fff4d6",padding:16,borderRadius:8}}>正式管理員角色驗證、會員資料庫與存取權限尚未完成。此頁不提供管理員資料存取，也不會以 Email 名稱直接授予管理權限。</p>
   <p>目前僅能前往公開展示版測試功能；展示版資料存放在瀏覽器，請勿輸入真實會員個資。</p>
   <p><a href="/">前往展示版（非正式後台）</a></p>
   <button onClick={signOut} style={{padding:"10px 16px"}}>安全登出</button>
  </>:<><p role="status">{message}</p><a href="/login">返回登入頁面</a></>}
 </main>;
}

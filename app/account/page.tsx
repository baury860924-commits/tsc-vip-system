"use client";

import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
import "../member/portal.css";

type Account={email:string;role:string|null;roleError:boolean};

export default function AccountPage(){
 const [client,setClient]=useState<SupabaseClient|null>(null);
 const [account,setAccount]=useState<Account|null>(null);
 const [loading,setLoading]=useState(true);
 const [signingOut,setSigningOut]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  let active=true;
  async function loadAccount(){
   try {
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if(!url||!key){setMessage("會員服務目前無法使用，請聯絡 TSC 團隊。");return;}
    const sb=createClient(url,key);
    const {data:{user}}=await sb.auth.getUser();
    if(!active)return;
    if(!user){setMessage("登入後就能查看帳號資訊並前往會員專區。");return;}
    setClient(sb);
    const profile=await sb.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
    if(active)setAccount({email:user.email||"",role:profile.data?.role||null,roleError:Boolean(profile.error)});
   }catch{
    if(active)setMessage("暫時無法讀取帳號資訊，請重新整理後再試。");
   }finally{
    if(active)setLoading(false);
   }
  }
  void loadAccount();
  return ()=>{active=false;};
 },[]);

 async function signOut(){
  if(!client||signingOut)return;
  setSigningOut(true);
  setMessage("");
  try{
   const {error}=await client.auth.signOut();
   if(error)throw error;
   window.location.replace("/login");
  }catch{
   setMessage("暫時無法登出，請稍後再試。");
   setSigningOut(false);
  }
 }

 const isVip=account?.role==="vip";
 const isStaff=account?.role==="admin"||account?.role==="staff";
 const roleLabel=account?.role==="admin"?"管理員":isStaff?"工作人員":isVip?"VIP 會員":"等待開通";

 return <main className="member-portal portal-access">
  <header className="portal-header">
   <span className="portal-brand"><strong>TSC</strong> VIP</span>
  </header>
  <section className="portal-panel" aria-labelledby="account-title" aria-busy={loading}>
   <div className="portal-section-heading">
    <h1 id="account-title">我的帳號</h1>
    {!loading&&account&&<p>查看目前的登入資訊，或回到你的工作區。</p>}
   </div>
   {loading?<p role="status">正在確認登入狀態…</p>:account?<>
    <dl className="portal-profile portal-account-details">
     <div><dt>登入 Email</dt><dd>{account.email||"未提供"}</dd></div>
     <div><dt>帳號身分</dt><dd>{account.roleError?"暫時無法確認":roleLabel}</dd></div>
    </dl>
    {account.roleError?<p className="portal-empty">暫時無法確認帳號身分，請重新整理後再試。</p>:
     !isVip&&!isStaff&&<p className="portal-empty">帳號身分尚未設定。如果你已是 VIP 會員，請聯絡 TSC 團隊協助確認。</p>}
    <div className="portal-access-actions">
     {isStaff?<a className="portal-button" href="/admin/members">前往會員管理</a>:<a className="portal-button" href="/member">前往會員首頁</a>}
     <button className="portal-secondary" type="button" disabled={signingOut} onClick={()=>void signOut()}>{signingOut?"登出中…":"登出"}</button>
    </div>
    {isStaff&&<p className="portal-access-links"><a href="/member">會員前台</a><a href="/">系統展示頁</a></p>}
    {isStaff&&<p className="portal-hint">展示頁使用測試資料，請勿填寫真實個資。</p>}
    <p className="portal-message" role="status">{message}</p>
   </>:<>
    <p role="status">{message}</p>
    <a className="portal-button" href="/login">前往登入</a>
   </>}
  </section>
 </main>;
}


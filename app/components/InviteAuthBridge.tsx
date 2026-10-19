"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
export default function InviteAuthBridge(){
 const [status,setStatus]=useState("");
 useEffect(()=>{const hash=new URLSearchParams(window.location.hash.slice(1));const query=new URLSearchParams(window.location.search);const isAuth=hash.has("access_token")||hash.has("error")||query.has("code")||query.has("token_hash")||query.has("error");if(!isAuth)return;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key){setStatus("登入服務尚未設定，請聯絡管理員");return;}
 let cancelled=false;const sb=createClient(url,key,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
 void(async()=>{setStatus("正在驗證邀請，請稍候…");try{
 if(query.has("error")||hash.has("error"))throw Error("邀請連結已失效，請管理員重新寄送");
 if(query.has("token_hash")){const type=query.get("type");const token_hash=query.get("token_hash")!;const {error}=await sb.auth.verifyOtp({token_hash,type:type==="invite"?"invite":"magiclink"});if(error)throw error;}
 else if(query.has("code")){const {error}=await sb.auth.exchangeCodeForSession(query.get("code")!);if(error)throw error;}
 const {data,error}=await sb.auth.getSession();if(error||!data.session)throw Error("尚未建立登入狀態，請回到登入頁使用 Email 驗證信登入");
 if(!cancelled)window.location.replace("/auth/landing");
 }catch(e){if(!cancelled)setStatus(e instanceof Error?e.message:"驗證失敗，請回到登入頁重新登入");}})();return()=>{cancelled=true;};
 },[]);
 return status?<div role="status" style={{padding:16,margin:16,background:"#ecfeff",border:"1px solid #67e8f9",borderRadius:10}}>{status}　<a href="/login">登入頁</a></div>:null;
}

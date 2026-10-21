"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
export default function LoginLanding(){
 const [message,setMessage]=useState("正在確認登入身分與工作台權限…");
 useEffect(()=>{let active=true;void(async()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key){setMessage("登入服務尚未設定");return;}
 try{const sb=createClient(url,key);const {data:{user},error}=await sb.auth.getUser();if(error||!user){window.location.replace("/login");return;}
 const {data:profile,error:roleError}=await sb.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
 if(roleError){if(active)setMessage("無法讀取帳號權限，請稍後重試或聯絡管理員。");return;}
 if(profile?.role==="admin"||profile?.role==="staff"){window.location.replace("/admin/my-workbench");return;}
 if(profile?.role==="vip"){window.location.replace("/member");return;}
 window.location.replace("/account");
 }catch{if(active)setMessage("驗證連線失敗，請稍後重試。");}})();return()=>{active=false;};},[]);
 return <main style={{maxWidth:560,margin:"12vh auto",padding:24,fontFamily:"system-ui,sans-serif"}}><h1>TSC VIP 登入導向</h1><p role="status">{message}</p><a href="/account">查看帳號狀態</a></main>;
}

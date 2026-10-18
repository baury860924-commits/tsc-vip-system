"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
type Member={id:string;name:string;vip_number:string|null;company:string;industry:string;contract_start:string|null;contract_end:string|null};
type Stage={stage_number:number;title:string;description:string;goal:string;action_plan:string};
export default function MemberHome(){
 const [member,setMember]=useState<Member|null>(null);
 const [stages,setStages]=useState<Stage[]>([]);
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setNotice("登入服務尚未設定");setLoading(false);return;}
  const sb=createClient(url,key);let active=true;
  async function init(){
   try{
    const {data:{user}}=await sb.auth.getUser();
    if(!user){if(active)setNotice("請先登入帳號中心");return;}
    const {data:m,error}=await sb.from("vip_members").select("id,name,vip_number,company,industry,contract_start,contract_end").eq("user_id",user.id).maybeSingle();
    if(error){if(active)setNotice("無法讀取會員資料："+error.code);return;}
    if(!m){if(active)setNotice("這個帳號尚未綁定 VIP 會員資料，請由管理員完成帳號綁定。");return;}
    if(active)setMember(m);
    const {data:rows,error:funnelError}=await sb.from("vip_funnel_stages").select("stage_number,title,description,goal,action_plan").eq("member_id",m.id).order("stage_number");
    if(active){if(funnelError)setNotice("銷售漏斗尚未完成設定。");else setStages(rows||[]);}
   }catch{if(active)setNotice("讀取資料失敗");}
   finally{if(active)setLoading(false);}
  }
  void init();return()=>{active=false;};
 },[]);
 return <main style={{maxWidth:960,margin:"32px auto",padding:24,fontFamily:"system-ui,sans-serif"}}>
  <a href="/account">← 帳號中心</a><h1>TSC VIP 會員專區</h1>
  {loading?<p>正在確認會員身分…</p>:member?<><h2>歡迎，{member.name}</h2>
   <p>{member.vip_number||"VIP"}｜{member.company}｜{member.industry}</p>
   <nav style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}}><a href="#funnel">我的銷售漏斗</a><a href="#profile">個人資料</a><a href="#consultation">提出諮詢</a><a href="#directory">探索 VIP</a><a href="#announcements">公告</a></nav>
   <section id="funnel"><h2>我的三階段銷售漏斗</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>{[1,2,3].map(n=>{const stage=stages.find(x=>x.stage_number===n);return <article key={n} style={{border:"1px solid #cbd5e1",padding:16,borderRadius:12}}><h3>第 {n} 階段｜{stage?.title||["陌生接觸","入門體驗","主要產品"][n-1]}</h3><p style={{whiteSpace:"pre-wrap"}}>{stage?.description||"尚未設定"}</p>{stage?.goal&&<p>目標：{stage.goal}</p>}{stage?.action_plan&&<p>行動：{stage.action_plan}</p>}</article>;})}</div></section>
   <section id="profile" style={{marginTop:24}}><h2>我的會員資料</h2><p>會員編號：{member.vip_number||"未設定"}｜公司：{member.company||"未設定"}｜產業：{member.industry||"未設定"}</p><p>合約期間：{member.contract_start||"未設定"} ～ {member.contract_end||"未設定"}</p></section>
   <section id="consultation" style={{marginTop:24}}><h2>提出諮詢</h2><p>會員自助申請正在建置中。現階段請由 TSC 管理員協助登記需求。</p></section>
   <section id="directory" style={{marginTop:24}}><h2>探索 VIP 會員</h2><p>會員公開名錄尚未開放，未經本人同意不公開個人資料。</p></section>
   <section id="announcements" style={{marginTop:24}}><h2>公告</h2><p>公告功能尚未開放。</p></section>
  </>:<p role="status">{notice}</p>}
  {member&&notice&&<p role="status">{notice}</p>}
 </main>;
}

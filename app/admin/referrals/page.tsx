"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Member={id:string;name:string;vip_number:string|null};
type Referral={id:string;referrer_member_id:string;recipient_member_id:string;referral_date:string;lead_label:string;summary:string;status:string;follow_up_date:string|null;internal_note:string;created_at:string};
const statuses=["已介紹","已聯繫","洽談中","已成交","未成交"];
const field={width:"100%",boxSizing:"border-box" as const,padding:12,border:"1px solid #cbd5e1",borderRadius:9,marginTop:5};
export default function ReferralsAdmin(){
 const [sb,setSb]=useState<SupabaseClient|null>(null),[members,setMembers]=useState<Member[]>([]),[items,setItems]=useState<Referral[]>([]);
 const [ready,setReady]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [referrer,setReferrer]=useState(""),[recipient,setRecipient]=useState(""),[date,setDate]=useState(new Date().toLocaleDateString("en-CA")),[lead,setLead]=useState(""),[summary,setSummary]=useState("");
 const [editing,setEditing]=useState<string|null>(null),[status,setStatus]=useState("已介紹"),[follow,setFollow]=useState(""),[note,setNote]=useState(""),[filter,setFilter]=useState("全部");
 useEffect(()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key){setNotice("Supabase 尚未設定");setLoading(false);return;}
 const client=createClient(url,key);setSb(client);let active=true;
 void(async()=>{try{const {data:{user}}=await client.auth.getUser();if(!user){if(active)setNotice("請先登入");return;}
 const {data:p}=await client.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
 if(!["admin","staff"].includes(p?.role||"")){if(active)setNotice("僅限管理員及工作人員");return;}
 const [m,r]=await Promise.all([client.from("vip_members").select("id,name,vip_number").order("vip_number"),client.from("vip_referrals").select("id,referrer_member_id,recipient_member_id,referral_date,lead_label,summary,status,follow_up_date,internal_note,created_at").order("created_at",{ascending:false}).limit(300)]);
 if(!active)return;if(m.error||r.error){setNotice("讀取失敗，請先執行轉介紹資料表 SQL："+(r.error?.message||m.error?.message));return;}
 setMembers(m.data||[]);setItems(r.data||[]);setReady(true);
 }catch{if(active)setNotice("資料庫連線失敗");}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[]);
 const nameOf=(id:string)=>{const m=members.find(x=>x.id===id);return m?(m.vip_number||"VIP")+"｜"+m.name:"未知會員";};
 async function create(e:React.FormEvent){e.preventDefault();if(!sb||!ready||!referrer||!recipient||referrer===recipient||!date)return;
 setBusy(true);setNotice("");
 const {data,error}=await sb.from("vip_referrals").insert({referrer_member_id:referrer,recipient_member_id:recipient,referral_date:date,lead_label:lead.trim(),summary:summary.trim()}).select("id,referrer_member_id,recipient_member_id,referral_date,lead_label,summary,status,follow_up_date,internal_note,created_at").single();
 if(error)setNotice("新增失敗："+error.message);else if(data){setItems(old=>[data,...old]);setLead("");setSummary("");setNotice("已建立轉介紹紀錄");}setBusy(false);}
 function begin(r:Referral){setEditing(r.id);setStatus(r.status);setFollow(r.follow_up_date||"");setNote(r.internal_note||"");}
 async function update(id:string){if(!sb||!ready)return;setBusy(true);setNotice("");
 const {data,error}=await sb.from("vip_referrals").update({status,follow_up_date:follow||null,internal_note:note,updated_at:new Date().toISOString()}).eq("id",id).select("id,referrer_member_id,recipient_member_id,referral_date,lead_label,summary,status,follow_up_date,internal_note,created_at").single();
 if(error)setNotice("更新失敗："+error.message);else if(data){setItems(old=>old.map(x=>x.id===id?data:x));setEditing(null);setNotice("已更新轉介紹進度");}setBusy(false);}
 const visible=items.filter(x=>filter==="全部"||x.status===filter);
 return <main style={{maxWidth:1080,margin:"32px auto",padding:24,fontFamily:"system-ui,sans-serif"}}><a href="/admin/members">← 返回會員管理</a><h1>VIP 轉介紹管理</h1><p>追蹤會員間的資源媒合與成交進度。第一版僅限管理員查看，請勿輸入被介紹者的電話、身分證或其他敏感資料。</p>
 {loading?<p>正在讀取…</p>:ready?<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:24}}>
 {[["總介紹數",items.length],["洽談中",items.filter(x=>x.status==="洽談中").length],["已成交",items.filter(x=>x.status==="已成交").length],["成交率",items.length?Math.round(items.filter(x=>x.status==="已成交").length/items.length*100)+"%":"—"]].map(([label,value])=><div key={label} style={{padding:18,border:"1px solid #cbd5e1",borderRadius:12}}><div>{label}</div><strong style={{fontSize:28}}>{value}</strong></div>)}</div>
 <section style={{border:"1px solid #cbd5e1",padding:20,borderRadius:12,marginBottom:24}}><h2>新增轉介紹紀錄</h2><form onSubmit={create} style={{display:"grid",gap:14}}>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14}}>
 <label>介紹人 VIP *<select required style={field} value={referrer} onChange={e=>setReferrer(e.target.value)}><option value="">請選擇介紹人</option>{members.map(m=><option key={m.id} value={m.id}>{nameOf(m.id)}</option>)}</select></label>
 <label>接受介紹 VIP *<select required style={field} value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="">請選擇接收會員</option>{members.filter(m=>m.id!==referrer).map(m=><option key={m.id} value={m.id}>{nameOf(m.id)}</option>)}</select></label>
 <label>介紹日期 *<input required type="date" style={field} value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <label>案件代稱（選填，避免填寫個資）<input style={field} maxLength={120} value={lead} onChange={e=>setLead(e.target.value)} placeholder="例如：餐飲業主合作機會"/></label>
 <label>介紹內容<textarea style={field} rows={3} maxLength={2000} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
 <button disabled={busy||!referrer||!recipient||referrer===recipient} style={{padding:12,border:0,borderRadius:9,background:"#164e63",color:"white"}}>{busy?"儲存中…":"新增轉介紹"}</button></form></section>
 <h2>轉介紹追蹤清單（{visible.length} 筆）</h2><label>篩選狀態<select style={{...field,maxWidth:240}} value={filter} onChange={e=>setFilter(e.target.value)}>{["全部",...statuses].map(x=><option key={x}>{x}</option>)}</select></label>
 {visible.length===0&&<p>目前沒有符合條件的紀錄。</p>}
 {visible.map(r=><article key={r.id} style={{border:"1px solid #cbd5e1",borderRadius:12,padding:18,marginTop:14}}>
 <strong>{nameOf(r.referrer_member_id)} → {nameOf(r.recipient_member_id)}</strong><p>{r.referral_date}｜{r.lead_label||"未命名案件"}｜<strong>{r.status}</strong></p>{r.summary&&<p style={{whiteSpace:"pre-wrap"}}>{r.summary}</p>}{r.follow_up_date&&<p>下次追蹤：{r.follow_up_date}</p>}
 {editing===r.id?<div style={{display:"grid",gap:12}}><label>進度<select style={field} value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></label><label>追蹤日期<input type="date" style={field} value={follow} onChange={e=>setFollow(e.target.value)}/></label><label>內部備註<textarea rows={3} style={field} value={note} onChange={e=>setNote(e.target.value)}/></label><div><button disabled={busy} onClick={()=>void update(r.id)} style={{padding:10}}>儲存進度</button> <button onClick={()=>setEditing(null)} style={{padding:10}}>取消</button></div></div>:<button onClick={()=>begin(r)} style={{padding:10}}>更新進度</button>}
 </article>)}
 </>:<p>轉介紹功能尚未啟用。</p>}{notice&&<p role="status">{notice}</p>}</main>;
}
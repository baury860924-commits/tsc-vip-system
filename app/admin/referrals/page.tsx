"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Member={id:string;name:string;vip_number:string|null};
type Referral={id:string;referrer_member_id:string;recipient_member_id:string|null;referral_type:string;referral_date:string;lead_label:string;summary:string;status:string;follow_up_date:string|null;internal_note:string;created_at:string};
const channels=["咖啡聚會","藍海定位一日課","VIP 陪跑","VIP 互相轉介紹"];
const statuses=["已介紹","已聯繫","洽談中","已成交","未成交"];
const field={width:"100%",boxSizing:"border-box" as const,padding:12,border:"1px solid #cbd5e1",borderRadius:9,marginTop:5};
export default function ReferralsAdmin(){
 const [sb,setSb]=useState<SupabaseClient|null>(null),[members,setMembers]=useState<Member[]>([]),[items,setItems]=useState<Referral[]>([]);
 const [ready,setReady]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [referrer,setReferrer]=useState(""),[recipient,setRecipient]=useState(""),[date,setDate]=useState(new Date().toLocaleDateString("en-CA")),[lead,setLead]=useState(""),[summary,setSummary]=useState("");
 const [view,setView]=useState<"overview"|"member">("overview"),[selectedMember,setSelectedMember]=useState("");
 const [channel,setChannel]=useState("咖啡聚會"),[channelFilter,setChannelFilter]=useState("全部類型");
 const [editing,setEditing]=useState<string|null>(null),[status,setStatus]=useState("已介紹"),[follow,setFollow]=useState(""),[note,setNote]=useState(""),[filter,setFilter]=useState("全部");
 useEffect(()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key){setNotice("Supabase 尚未設定");setLoading(false);return;}
 const client=createClient(url,key);setSb(client);let active=true;
 void(async()=>{try{const {data:{user}}=await client.auth.getUser();if(!user){if(active)setNotice("請先登入");return;}
 const {data:p}=await client.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
 if(!["admin","staff"].includes(p?.role||"")){if(active)setNotice("僅限管理員及工作人員");return;}
 const [m,r]=await Promise.all([client.from("vip_members").select("id,name,vip_number").order("vip_number"),client.from("vip_referrals").select("id,referrer_member_id,recipient_member_id,referral_type,referral_date,lead_label,summary,status,follow_up_date,internal_note,created_at").order("created_at",{ascending:false}).limit(300)]);
 if(!active)return;if(m.error||r.error){setNotice("讀取失敗，請先執行轉介紹資料表 SQL："+(r.error?.message||m.error?.message));return;}
 setMembers(m.data||[]);setItems(r.data||[]);setReady(true);
 }catch{if(active)setNotice("資料庫連線失敗");}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[]);
 const nameOf=(id:string)=>{const m=members.find(x=>x.id===id);return m?(m.vip_number||"VIP")+"｜"+m.name:"未知會員";};
 async function create(e:React.FormEvent){e.preventDefault();if(!sb||!ready||!referrer||!date||(channel==="VIP 互相轉介紹"&&(!recipient||referrer===recipient)))return;
 setBusy(true);setNotice("");
 const {data,error}=await sb.from("vip_referrals").insert({referrer_member_id:referrer,recipient_member_id:channel==="VIP 互相轉介紹"?recipient:null,referral_type:channel,referral_date:date,lead_label:lead.trim(),summary:summary.trim()}).select("id,referrer_member_id,recipient_member_id,referral_date,lead_label,summary,status,follow_up_date,internal_note,created_at").single();
 if(error)setNotice("新增失敗："+error.message);else if(data){setItems(old=>[data,...old]);setLead("");setSummary("");setNotice("已建立轉介紹紀錄");}setBusy(false);}
 function begin(r:Referral){setEditing(r.id);setStatus(r.status);setFollow(r.follow_up_date||"");setNote(r.internal_note||"");}
 async function update(id:string){if(!sb||!ready)return;setBusy(true);setNotice("");
 const {data,error}=await sb.from("vip_referrals").update({status,follow_up_date:follow||null,internal_note:note,updated_at:new Date().toISOString()}).eq("id",id).select("id,referrer_member_id,recipient_member_id,referral_date,lead_label,summary,status,follow_up_date,internal_note,created_at").single();
 if(error)setNotice("更新失敗："+error.message);else if(data){setItems(old=>old.map(x=>x.id===id?data:x));setEditing(null);setNotice("已更新轉介紹進度");}setBusy(false);}
 const scoped=items.filter(x=>view==="overview"||x.referrer_member_id===selectedMember);
 const visible=scoped.filter(x=>(filter==="全部"||x.status===filter)&&(channelFilter==="全部類型"||x.referral_type===channelFilter));
 const personCount=(rows:Referral[])=>new Set(rows.map(x=>x.lead_label.trim().toLocaleLowerCase()).filter(Boolean)).size;
 const ranked=members.map(m=>({member:m,rows:items.filter(x=>x.referrer_member_id===m.id)})).sort((a,b)=>b.rows.length-a.rows.length);
 const metrics=(rows:Referral[])=>[["介紹案件",rows.length],["已記錄對象",personCount(rows)],["洽談中",rows.filter(x=>x.status==="洽談中").length],["已成交",rows.filter(x=>x.status==="已成交").length]];
 const openMember=(id:string)=>{setSelectedMember(id);setView("member");setFilter("全部");setChannelFilter("全部類型");};
 return <main style={{maxWidth:1080,margin:"32px auto",padding:24,fontFamily:"system-ui,sans-serif"}}><a href="/admin/members">← 返回會員管理</a><h1>VIP 轉介紹管理</h1><p>追蹤會員間的資源媒合與成交進度。第一版僅限管理員查看，請勿輸入被介紹者的電話、身分證或其他敏感資料。</p>
 {loading?<p>正在讀取…</p>:ready?<>
 <nav style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
 <button onClick={()=>{setView("overview");setSelectedMember("");}} style={{padding:12,background:view==="overview"?"#164e63":"#e2e8f0",color:view==="overview"?"white":"#0f172a",border:0,borderRadius:8}}>介紹總覽</button>
 <select aria-label="選擇會員個別介紹紀錄" style={{...field,width:"auto",marginTop:0}} value={view==="member"?selectedMember:""} onChange={e=>e.target.value?openMember(e.target.value):setView("overview")}>
 <option value="">查看個別會員介紹紀錄</option>{members.map(m=><option key={m.id} value={m.id}>{nameOf(m.id)}</option>)}</select>
 </nav>
 <h2>{view==="overview"?"轉介紹總覽":nameOf(selectedMember)+"｜個別介紹紀錄"}</h2>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:24}}>
 {metrics(scoped).map(([label,value])=><div key={label} style={{padding:18,border:"1px solid #cbd5e1",borderRadius:12}}><div>{label}</div><strong style={{fontSize:28}}>{value}</strong></div>)}</div>
 <p style={{color:"#475569"}}>「介紹案件」計算每筆介紹；「已記錄對象」依案件代稱去重，未填代稱不計入人數。請使用固定代稱以避免重複計算。</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:24}}>
 {channels.map(c=><div key={c} style={{border:"1px solid #cbd5e1",borderRadius:10,padding:14}}><div>{c}</div><strong style={{fontSize:24}}>{scoped.filter(x=>x.referral_type===c).length}</strong><div style={{fontSize:13}}>筆介紹案件</div></div>)}</div>
 {view==="overview"&&<section style={{marginBottom:28}}><h2>會員介紹排行榜</h2><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["會員","介紹案件","已記錄對象","咖啡聚會","藍海一日課","VIP 陪跑","會員互介","已成交","詳細"].map(h=><th key={h} style={{padding:10,textAlign:"left",borderBottom:"1px solid #cbd5e1"}}>{h}</th>)}</tr></thead><tbody>{ranked.map(({member:m,rows})=><tr key={m.id}><td style={{padding:10,borderBottom:"1px solid #e2e8f0"}}>{nameOf(m.id)}</td><td>{rows.length}</td><td>{personCount(rows)}</td>{channels.map(c=><td key={c}>{rows.filter(x=>x.referral_type===c).length}</td>)}<td>{rows.filter(x=>x.status==="已成交").length}</td><td><button onClick={()=>openMember(m.id)}>查看</button></td></tr>)}</tbody></table></div></section>}
 <section style={{border:"1px solid #cbd5e1",padding:20,borderRadius:12,marginBottom:24}}><h2>新增轉介紹紀錄</h2><form onSubmit={create} style={{display:"grid",gap:14}}>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14}}>
 <label>介紹人 VIP *<select required style={field} value={referrer} onChange={e=>setReferrer(e.target.value)}><option value="">請選擇介紹人</option>{members.map(m=><option key={m.id} value={m.id}>{nameOf(m.id)}</option>)}</select></label>
 <label style={{display:channel==="VIP 互相轉介紹"?"block":"none"}}>接受介紹 VIP *<select required={channel==="VIP 互相轉介紹"} style={field} value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="">請選擇接收會員</option>{members.filter(m=>m.id!==referrer).map(m=><option key={m.id} value={m.id}>{nameOf(m.id)}</option>)}</select></label>
 <label>介紹類型 *<select style={field} value={channel} onChange={e=>{setChannel(e.target.value);setRecipient("");}}>{channels.map(c=><option key={c}>{c}</option>)}</select></label><label>介紹日期 *<input required type="date" style={field} value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <label>被介紹對象代稱（建議固定填寫，用於計算介紹人數）<input style={field} maxLength={120} value={lead} onChange={e=>setLead(e.target.value)} placeholder="例如：餐飲業主合作機會"/></label>
 <label>介紹內容<textarea style={field} rows={3} maxLength={2000} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
 <button disabled={busy||!referrer||(channel==="VIP 互相轉介紹"&&(!recipient||referrer===recipient))} style={{padding:12,border:0,borderRadius:9,background:"#164e63",color:"white"}}>{busy?"儲存中…":"新增轉介紹"}</button></form></section>
 <h2>{view==="overview"?"全部轉介紹追蹤清單":"此會員轉介紹明細"}（{visible.length} 筆）</h2><div style={{display:"flex",gap:14,flexWrap:"wrap"}}><label>介紹類型<select style={{...field,maxWidth:240}} value={channelFilter} onChange={e=>setChannelFilter(e.target.value)}>{["全部類型",...channels].map(x=><option key={x}>{x}</option>)}</select></label><label>篩選狀態<select style={{...field,maxWidth:240}} value={filter} onChange={e=>setFilter(e.target.value)}>{["全部",...statuses].map(x=><option key={x}>{x}</option>)}</select></label>
 </div>{visible.length===0&&<p>目前沒有符合條件的紀錄。</p>}
 {visible.map(r=><article key={r.id} style={{border:"1px solid #cbd5e1",borderRadius:12,padding:18,marginTop:14}}>
 <strong>{nameOf(r.referrer_member_id)} → {r.referral_type==="VIP 互相轉介紹"&&r.recipient_member_id?nameOf(r.recipient_member_id):r.referral_type}</strong><p>{r.referral_date}｜{r.lead_label||"未命名案件"}｜<strong>{r.status}</strong></p>{r.summary&&<p style={{whiteSpace:"pre-wrap"}}>{r.summary}</p>}{r.follow_up_date&&<p>下次追蹤：{r.follow_up_date}</p>}
 {editing===r.id?<div style={{display:"grid",gap:12}}><label>進度<select style={field} value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></label><label>追蹤日期<input type="date" style={field} value={follow} onChange={e=>setFollow(e.target.value)}/></label><label>內部備註<textarea rows={3} style={field} value={note} onChange={e=>setNote(e.target.value)}/></label><div><button disabled={busy} onClick={()=>void update(r.id)} style={{padding:10}}>儲存進度</button> <button onClick={()=>setEditing(null)} style={{padding:10}}>取消</button></div></div>:<button onClick={()=>begin(r)} style={{padding:10}}>更新進度</button>}
 </article>)}
 </>:<p>轉介紹功能尚未啟用。</p>}{notice&&<p role="status">{notice}</p>}</main>;
}
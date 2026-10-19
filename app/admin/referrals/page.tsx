"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Member={id:string;name:string;vip_number:string|null};
type Lead={id:string;referrer_member_id:string;lead_code:string;display_name:string;coffee_stage:string;positioning_stage:string;vip_stage:string;assigned_staff_name?:string|null;last_contact_date?:string|null;next_follow_up_date?:string|null;contact_result?:string|null};
type Referral={id:string;lead_id:string|null;referrer_member_id:string;recipient_member_id:string|null;referral_type:string;referral_date:string;lead_label:string;summary:string;status:string;follow_up_date:string|null;internal_note:string;created_at:string};
const channels=["TSC 活動","藍海定位一日課","VIP 陪跑","VIP 互相轉介紹"];
const statuses=["已介紹","已聯繫","洽談中","已成交","未成交"];
const field={width:"100%",boxSizing:"border-box" as const,padding:12,border:"1px solid #cbd5e1",borderRadius:9,marginTop:5};
export default function ReferralsAdmin(){
 const [sb,setSb]=useState<SupabaseClient|null>(null),[members,setMembers]=useState<Member[]>([]),[items,setItems]=useState<Referral[]>([]),[leads,setLeads]=useState<Lead[]>([]);
 const [ready,setReady]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [referrer,setReferrer]=useState(""),[recipient,setRecipient]=useState(""),[date,setDate]=useState(new Date().toLocaleDateString("en-CA")),[lead,setLead]=useState(""),[summary,setSummary]=useState("");
 const [view,setView]=useState<"overview"|"member">("overview"),[selectedMember,setSelectedMember]=useState(""),[leadSearch,setLeadSearch]=useState(""),[followFilter,setFollowFilter]=useState("全部待追蹤"),[ownerFilter,setOwnerFilter]=useState("全部負責人");
 const [leadId,setLeadId]=useState(""),[linkLeadId,setLinkLeadId]=useState("");
 const [channel,setChannel]=useState("咖啡聚會"),[channelFilter,setChannelFilter]=useState("全部類型");
 const [editing,setEditing]=useState<string|null>(null),[status,setStatus]=useState("已介紹"),[follow,setFollow]=useState(""),[note,setNote]=useState(""),[filter,setFilter]=useState("全部");
 useEffect(()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key){setNotice("Supabase 尚未設定");setLoading(false);return;}
 const client=createClient(url,key);setSb(client);let active=true;
 void(async()=>{try{const {data:{session}}=await client.auth.getSession();const user=session?.user;if(!user){if(active)setNotice("請先登入");return;}
 const {data:p}=await client.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
 if(!["admin","staff"].includes(p?.role||"")){if(active)setNotice("僅限管理員及工作人員");return;}
 const [m,r,l]=await Promise.all([client.from("vip_members").select("id,name,vip_number").order("vip_number"),client.from("vip_referrals").select("id,lead_id,referrer_member_id,recipient_member_id,referral_type,referral_date,lead_label,summary,status,follow_up_date,internal_note,created_at").order("created_at",{ascending:false}).limit(300),client.from("vip_referral_leads").select("*").limit(500)]);
 if(!active)return;if(m.error||r.error||l.error){setNotice("讀取失敗，請先執行轉介紹資料表 SQL："+(r.error?.message||l.error?.message||m.error?.message));return;}
 setMembers(m.data||[]);setItems(r.data||[]);setLeads(l.data||[]);setReady(true);
 }catch{if(active)setNotice("資料庫連線失敗");}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[]);
 const nameOf=(id:string)=>{const m=members.find(x=>x.id===id);return m?(m.vip_number||"VIP")+"｜"+m.name:"未知會員";};
 async function create(e:React.FormEvent){e.preventDefault();if(!sb||!ready||!referrer||!date||(channel==="VIP 互相轉介紹"&&(!recipient||referrer===recipient)))return;
 setBusy(true);setNotice("");
 const {data,error}=await sb.from("vip_referrals").insert({referrer_member_id:referrer,lead_id:leadId||null,recipient_member_id:channel==="VIP 互相轉介紹"?recipient:null,referral_type:channel==="TSC 活動"?"咖啡聚會":channel,referral_date:date,lead_label:lead.trim(),summary:summary.trim()}).select("id,lead_id,referrer_member_id,recipient_member_id,referral_type,referral_date,lead_label,summary,status,follow_up_date,internal_note,created_at").single();
 if(error)setNotice("新增失敗："+error.message);else if(data){setItems(old=>[data,...old]);setLead("");setLeadId("");setSummary("");setNotice("已建立轉介紹紀錄");}setBusy(false);}
 function begin(r:Referral){setEditing(r.id);setLinkLeadId(r.lead_id||"");setStatus(r.status);setFollow(r.follow_up_date||"");setNote(r.internal_note||"");}
 async function update(id:string){if(!sb||!ready)return;setBusy(true);setNotice("");
 const {data,error}=await sb.from("vip_referrals").update({status,lead_id:linkLeadId||null,follow_up_date:follow||null,internal_note:note,updated_at:new Date().toISOString()}).eq("id",id).select("id,lead_id,referrer_member_id,recipient_member_id,referral_type,referral_date,lead_label,summary,status,follow_up_date,internal_note,created_at").single();
 if(error)setNotice("更新失敗："+error.message);else if(data){setItems(old=>old.map(x=>x.id===id?data:x));setEditing(null);setNotice("已更新轉介紹進度");}setBusy(false);}
 const scoped=items.filter(x=>view==="overview"||x.referrer_member_id===selectedMember);
 const scopedLeads=leads.filter(x=>view==="overview"||x.referrer_member_id===selectedMember);
 const searchedLeads=scopedLeads.filter(x=>(x.display_name||x.lead_code).toLocaleLowerCase().includes(leadSearch.trim().toLocaleLowerCase()));
 const visible=scoped.filter(x=>(filter==="全部"||x.status===filter)&&(channelFilter==="全部類型"||x.referral_type===(channelFilter==="TSC 活動"?"咖啡聚會":channelFilter)));
 const personCount=(rows:Referral[])=>new Set(rows.map(x=>x.lead_id||("legacy:"+x.referrer_member_id+":"+x.lead_label.trim().toLocaleLowerCase())).filter(x=>!x.endsWith(":"))).size;
 const ranked=members.map(m=>({member:m,rows:items.filter(x=>x.referrer_member_id===m.id),friends:leads.filter(x=>x.referrer_member_id===m.id)})).sort((a,b)=>b.friends.length-a.friends.length);
 const metrics=(rows:Referral[],friends:Lead[])=>[["介紹新朋友",friends.length],["TSC 活動已報名",friends.filter(x=>x.coffee_stage==="已報名").length],["藍海定位課已報名",friends.filter(x=>x.positioning_stage==="已報名").length],["VIP 已加入",friends.filter(x=>x.vip_stage==="已加入").length],["介紹案件",rows.length]];
 const followStage=(l:Lead)=>l.vip_stage==="已加入"?"已完成":l.vip_stage==="已報名"?"VIP 已報名待加入":l.positioning_stage==="已報名"?"藍海課已報名待加入 VIP":l.coffee_stage==="已報名"?"TSC 活動已報名待藍海課":"尚未報名 TSC 活動";
 const followList=scopedLeads.filter(l=>followStage(l)!=="已完成"&&(followFilter==="全部待追蹤"||followStage(l)===followFilter)&&(ownerFilter==="全部負責人"||(ownerFilter==="未指派"?!l.assigned_staff_name:l.assigned_staff_name===ownerFilter)));
 const owners=["全部負責人","未指派",...Array.from(new Set(scopedLeads.map(l=>l.assigned_staff_name).filter((x):x is string=>Boolean(x))))];
 const today=new Date().toLocaleDateString("en-CA");
 const overdue=scopedLeads.filter(l=>followStage(l)!=="已完成"&&l.next_follow_up_date&&l.next_follow_up_date<today).length;
 const followKinds=["全部待追蹤","VIP 已報名待加入","藍海課已報名待加入 VIP","TSC 活動已報名待藍海課","尚未報名 TSC 活動"];
 const openMember=(id:string)=>{setSelectedMember(id);setView("member");setFilter("全部");setChannelFilter("全部類型");};
 return <main style={{maxWidth:1080,margin:"32px auto",padding:24,fontFamily:"system-ui,sans-serif"}}><a href="/admin/members">← 返回會員管理</a><h1>VIP 轉介紹管理</h1><p><a href="/admin/leads">→ 新朋友檔案與轉換歷程</a></p><p>追蹤會員間的資源媒合與成交進度。第一版僅限管理員查看，請勿輸入被介紹者的電話、身分證或其他敏感資料。</p>
 {loading?<p>正在讀取…</p>:ready?<>
 <nav style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
 <button onClick={()=>{setView("overview");setSelectedMember("");}} style={{padding:12,background:view==="overview"?"#164e63":"#e2e8f0",color:view==="overview"?"white":"#0f172a",border:0,borderRadius:8}}>介紹總覽</button>
 <select aria-label="選擇會員個別介紹紀錄" style={{...field,width:"auto",marginTop:0}} value={view==="member"?selectedMember:""} onChange={e=>e.target.value?openMember(e.target.value):setView("overview")}>
 <option value="">查看個別會員介紹紀錄</option>{members.map(m=><option key={m.id} value={m.id}>{nameOf(m.id)}</option>)}</select>
 </nav>
 <h2>{view==="overview"?"轉介紹總覽":nameOf(selectedMember)+"｜個別介紹紀錄"}</h2>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:24}}>
 {metrics(scoped,scopedLeads).map(([label,value])=><div key={label} style={{padding:18,border:"1px solid #cbd5e1",borderRadius:12}}><div>{label}</div><strong style={{fontSize:28}}>{value}</strong></div>)}</div>
 <p style={{color:"#475569"}}>新朋友人數與三階段實績以「新朋友檔案」為準：TSC 活動及藍海定位課計算已報名，VIP 計算已加入。介紹案件另行統計，不與新朋友人數相加。</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:24}}>
 {channels.map(c=><div key={c} style={{border:"1px solid #cbd5e1",borderRadius:10,padding:14}}><div>{c}</div><strong style={{fontSize:24}}>{c==="TSC 活動"?scopedLeads.filter(x=>x.coffee_stage==="已報名").length:c==="藍海定位一日課"?scopedLeads.filter(x=>x.positioning_stage==="已報名").length:c==="VIP 陪跑"?scopedLeads.filter(x=>x.vip_stage==="已加入").length:scoped.filter(x=>x.referral_type===c).length}</strong><div style={{fontSize:13}}>{c==="VIP 互相轉介紹"?"筆介紹案件":c==="VIP 陪跑"?"位已加入":"位已報名"}</div></div>)}</div>
 <section style={{border:"1px solid #cbd5e1",borderRadius:12,padding:20,marginBottom:28}}>
 <h2>待追蹤名單（{followList.length} 人）</h2><p style={{color:"#b45309",fontWeight:700}}>逾期未追蹤：{overdue} 人（依下次追蹤日期）</p>
 <p style={{color:"#475569"}}>依目前報名狀態自動分類，優先關注已報名但尚未完成下一階段的人。此清單不代表已完成實際聯繫。</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:16}}>
 {followKinds.slice(1).map(k=><div key={k} style={{padding:12,background:"#f8fafc",borderRadius:9,border:"1px solid #e2e8f0"}}><div style={{fontSize:13}}>{k}</div><strong style={{fontSize:24}}>{scopedLeads.filter(l=>followStage(l)===k).length}</strong></div>)}</div>
 <label>依追蹤階段篩選<select style={{...field,maxWidth:420}} value={followFilter} onChange={e=>setFollowFilter(e.target.value)}>{followKinds.map(k=><option key={k}>{k}</option>)}</select></label> <label style={{display:"inline-block",marginLeft:12}}>追蹤負責人<select style={{...field,maxWidth:240}} value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)}>{owners.map(x=><option key={x}>{x}</option>)}</select></label>
 <div style={{overflowX:"auto",marginTop:16}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}><thead><tr>{["新朋友姓名","介紹人","待追蹤階段","負責人","下次追蹤","檔案"].map(h=><th key={h} style={{padding:12,textAlign:"left",borderBottom:"2px solid #cbd5e1"}}>{h}</th>)}</tr></thead>
 <tbody>{followList.map(l=><tr key={l.id}><td style={{padding:12,borderBottom:"1px solid #e2e8f0",fontWeight:600}}>{l.display_name||"未填姓名"}</td><td style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>{nameOf(l.referrer_member_id)}</td><td style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>{followStage(l)}</td><td style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>{l.assigned_staff_name||"未指派"}</td><td style={{padding:12,borderBottom:"1px solid #e2e8f0",color:l.next_follow_up_date&&l.next_follow_up_date<today?"#b45309":undefined}}>{l.next_follow_up_date||"未設定"}</td><td style={{padding:12,borderBottom:"1px solid #e2e8f0"}}><a href={"/admin/leads?lead="+encodeURIComponent(l.id)}>查看／更新 →</a></td></tr>)}</tbody></table></div>
 {followList.length===0&&<p>目前沒有符合條件的待追蹤對象。</p>}
 </section>
 {view==="overview"&&<section style={{marginBottom:28}}><h2>會員介紹排行榜</h2><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["會員","新朋友人數","TSC 活動已報名","藍海課已報名","VIP 已加入","互相轉介紹案件","詳細"].map(h=><th key={h} style={{padding:10,textAlign:"left",borderBottom:"1px solid #cbd5e1"}}>{h}</th>)}</tr></thead><tbody>{ranked.map(({member:m,rows,friends})=><tr key={m.id}><td style={{padding:10,borderBottom:"1px solid #e2e8f0"}}>{nameOf(m.id)}</td><td>{friends.length}</td><td>{friends.filter(x=>x.coffee_stage==="已報名").length}</td><td>{friends.filter(x=>x.positioning_stage==="已報名").length}</td><td>{friends.filter(x=>x.vip_stage==="已加入").length}</td><td>{rows.filter(x=>x.referral_type==="VIP 互相轉介紹").length}</td><td><button onClick={()=>openMember(m.id)}>查看</button></td></tr>)}</tbody></table></div></section>}
 <section style={{border:"1px solid #cbd5e1",padding:20,borderRadius:12,marginBottom:24}}>
 <h2>{view==="overview"?"新朋友姓名與轉換明細":"此會員介紹的新朋友"}（{scopedLeads.length} 人）</h2>
 <p style={{color:"#475569"}}>以新朋友姓名為主，三階段實績各自計算。點選「管理檔案」可更新報名或加入狀態。</p>
 <label>搜尋新朋友姓名<input type="search" style={{...field,maxWidth:380}} placeholder="輸入姓名查詢" value={leadSearch} onChange={e=>setLeadSearch(e.target.value)}/></label>
 <div style={{overflowX:"auto",marginTop:14}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
 <thead><tr>{["新朋友姓名","介紹人","TSC 活動","藍海定位課","VIP 陪跑","操作"].map(h=><th key={h} style={{textAlign:"left",padding:12,borderBottom:"2px solid #cbd5e1"}}>{h}</th>)}</tr></thead>
 <tbody>{searchedLeads.map(l=><tr key={l.id}>
 <td style={{padding:12,borderBottom:"1px solid #e2e8f0",fontWeight:600}}>{l.display_name||"未填姓名"}</td>
 <td style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>{nameOf(l.referrer_member_id)}</td>
 <td style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>{l.coffee_stage}</td>
 <td style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>{l.positioning_stage}</td>
 <td style={{padding:12,borderBottom:"1px solid #e2e8f0"}}>{l.vip_stage}</td>
 <td style={{padding:12,borderBottom:"1px solid #e2e8f0"}}><a href={"/admin/leads?lead="+encodeURIComponent(l.id)}>管理檔案 →</a></td>
 </tr>)}</tbody></table></div>
 {searchedLeads.length===0&&<p>目前沒有符合條件的新朋友。</p>}
 </section>
 <section style={{border:"1px solid #cbd5e1",padding:20,borderRadius:12,marginBottom:24}}><h2>新增轉介紹紀錄</h2><form onSubmit={create} style={{display:"grid",gap:14}}>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14}}>
 <label>介紹人 VIP *<select required style={field} value={referrer} onChange={e=>{setReferrer(e.target.value);setLeadId("");}}><option value="">請選擇介紹人</option>{members.map(m=><option key={m.id} value={m.id}>{nameOf(m.id)}</option>)}</select></label>
 <label style={{display:channel==="VIP 互相轉介紹"?"block":"none"}}>接受介紹 VIP *<select required={channel==="VIP 互相轉介紹"} style={field} value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="">請選擇接收會員</option>{members.filter(m=>m.id!==referrer).map(m=><option key={m.id} value={m.id}>{nameOf(m.id)}</option>)}</select></label>
 <label>介紹類型 *<select style={field} value={channel} onChange={e=>{setChannel(e.target.value);setRecipient("");}}>{channels.map(c=><option key={c}>{c}</option>)}</select></label><label>介紹日期 *<input required type="date" style={field} value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <label>關聯新朋友檔案<select style={field} value={leadId} onChange={e=>setLeadId(e.target.value)}><option value="">尚未建立／暫不關聯</option>{leads.filter(l=>l.referrer_member_id===referrer).map(l=><option key={l.id} value={l.id}>{l.display_name||l.lead_code}（{l.lead_code}）</option>)}</select><small>找不到新朋友？先到 <a href="/admin/leads">新朋友檔案</a> 建立。</small></label>
 <label>被介紹對象代稱（未關聯檔案時建議填寫）<input style={field} maxLength={120} value={lead} onChange={e=>setLead(e.target.value)} placeholder="例如：餐飲業主合作機會"/></label>
 <label>介紹內容<textarea style={field} rows={3} maxLength={2000} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
 <button disabled={busy||!referrer||(channel==="VIP 互相轉介紹"&&(!recipient||referrer===recipient))} style={{padding:12,border:0,borderRadius:9,background:"#164e63",color:"white"}}>{busy?"儲存中…":"新增轉介紹"}</button></form></section>
 <h2>{view==="overview"?"全部轉介紹追蹤清單":"此會員轉介紹明細"}（{visible.length} 筆）</h2><div style={{display:"flex",gap:14,flexWrap:"wrap"}}><label>介紹類型<select style={{...field,maxWidth:240}} value={channelFilter} onChange={e=>setChannelFilter(e.target.value)}>{["全部類型",...channels].map(x=><option key={x}>{x}</option>)}</select></label><label>篩選狀態<select style={{...field,maxWidth:240}} value={filter} onChange={e=>setFilter(e.target.value)}>{["全部",...statuses].map(x=><option key={x}>{x}</option>)}</select></label>
 </div>{visible.length===0&&<p>目前沒有符合條件的紀錄。</p>}
 {visible.map(r=><article key={r.id} style={{border:"1px solid #cbd5e1",borderRadius:12,padding:18,marginTop:14}}>
 <strong>{nameOf(r.referrer_member_id)} → {r.referral_type==="VIP 互相轉介紹"&&r.recipient_member_id?nameOf(r.recipient_member_id):r.referral_type}</strong><p>{r.referral_date}｜{r.lead_label||"未命名案件"}｜<strong>{r.status}</strong></p>{r.lead_id&&<p>新朋友：{leads.find(l=>l.id===r.lead_id)?.display_name||leads.find(l=>l.id===r.lead_id)?.lead_code||"已關聯檔案"}</p>}{r.summary&&<p style={{whiteSpace:"pre-wrap"}}>{r.summary}</p>}{r.follow_up_date&&<p>下次追蹤：{r.follow_up_date}</p>}
 {editing===r.id?<div style={{display:"grid",gap:12}}><label>關聯新朋友檔案<select style={field} value={linkLeadId} onChange={e=>setLinkLeadId(e.target.value)}><option value="">不關聯</option>{leads.filter(l=>l.referrer_member_id===r.referrer_member_id).map(l=><option key={l.id} value={l.id}>{l.display_name||l.lead_code}（{l.lead_code}）</option>)}</select></label><label>進度<select style={field} value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></label><label>追蹤日期<input type="date" style={field} value={follow} onChange={e=>setFollow(e.target.value)}/></label><label>內部備註<textarea rows={3} style={field} value={note} onChange={e=>setNote(e.target.value)}/></label><div><button disabled={busy} onClick={()=>void update(r.id)} style={{padding:10}}>儲存進度</button> <button onClick={()=>setEditing(null)} style={{padding:10}}>取消</button></div></div>:<button onClick={()=>begin(r)} style={{padding:10}}>更新進度</button>}
 </article>)}
 </>:<p>轉介紹功能尚未啟用。</p>}{notice&&<p role="status">{notice}</p>}</main>;
}
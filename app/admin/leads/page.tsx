"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Assignment={id:string;lead_id:string;previous_staff_name:string|null;new_staff_name:string|null;changed_at:string;changed_by_user_id:string|null};
type Contact={id:string;lead_id:string;contacted_on:string;staff_name:string;result:string;next_follow_up_date:string|null;created_at:string};
type M={id:string;name:string;vip_number:string|null};
type Staff={id:string;display_name:string;is_active:boolean};
type Lead={id:string;referrer_member_id:string;lead_code:string;display_name:string;first_referred_at:string;interest_coffee:boolean;interest_positioning:boolean;interest_vip:boolean;coffee_stage:string;positioning_stage:string;vip_stage:string;notes:string;assigned_staff_name?:string|null;last_contact_date?:string|null;next_follow_up_date?:string|null;contact_result?:string|null};
const interestBox={display:"flex",alignItems:"center",gap:14,padding:14,border:"1px solid #cbd5e1",borderRadius:10,cursor:"pointer",minHeight:58};
const checkStyle={width:28,height:28,minWidth:28,minHeight:28,flexShrink:0,accentColor:"#164e63",cursor:"pointer"};
const field={width:"100%",boxSizing:"border-box" as const,padding:11,border:"1px solid #cbd5e1",borderRadius:8,marginTop:5};
export default function LeadManagement(){
 const [staffDirectory,setStaffDirectory]=useState<Staff[]>([]),[sb,setSb]=useState<SupabaseClient|null>(null),[members,setMembers]=useState<M[]>([]),[leads,setLeads]=useState<Lead[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]),[assignmentReady,setAssignmentReady]=useState(false);
 const [signedInStaff,setSignedInStaff]=useState(""),[quickResult,setQuickResult]=useState(""),[quickDate,setQuickDate]=useState(""),[quickBusy,setQuickBusy]=useState(false),[quickNotice,setQuickNotice]=useState(""),[history,setHistory]=useState<Contact[]>([]),[historyReady,setHistoryReady]=useState(false),[historyBusy,setHistoryBusy]=useState(false),[historyNotice,setHistoryNotice]=useState("");
 const [ready,setReady]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [member,setMember]=useState(""),[name,setName]=useState(""),[selected,setSelected]=useState<string|null>(null),[filter,setFilter]=useState("");
 const [coffee,setCoffee]=useState(false),[positioning,setPositioning]=useState(false),[vip,setVip]=useState(false),[coffeeStage,setCoffeeStage]=useState("未報名"),[positioningStage,setPositioningStage]=useState("未報名"),[vipStage,setVipStage]=useState("未報名"),[notes,setNotes]=useState(""),[owner,setOwner]=useState(""),[lastContact,setLastContact]=useState(""),[nextContact,setNextContact]=useState(""),[contactResult,setContactResult]=useState("");
 useEffect(()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key){setLoading(false);setNotice("Supabase 未設定");return;}
 const client=createClient(url,key);setSb(client);let active=true;void(async()=>{try{const {data:{session}}=await client.auth.getSession();const user=session?.user;if(!user){setNotice("請先登入");return;}
 const [profile,m,l,staff]=await Promise.all([client.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle(),client.from("vip_members").select("id,name,vip_number").order("vip_number"),client.from("vip_referral_leads").select("*").order("first_referred_at",{ascending:false}).limit(500),client.from("tsc_staff_directory").select("id,display_name,is_active").order("display_name")]);
 const p=profile.data;if(!["admin","staff"].includes(p?.role||"")){setNotice("需要管理員權限");return;}
 if(!active)return;if(m.error||l.error){setNotice("請先執行被介紹者檔案 SQL："+(l.error?.message||m.error?.message));return;}
 const {data:identity}=await client.from("tsc_staff_directory").select("display_name").eq("user_id",user.id).eq("is_active",true).maybeSingle();if(!active)return;if(p?.role==="staff"&&!identity){setNotice("工作人員帳號尚未綁定或已停用，請聯絡管理員。");return;}setMembers(m.data||[]);setLeads(l.data||[]);setStaffDirectory(staff.data||[]);setReady(true);if(identity?.display_name)setSignedInStaff(identity.display_name);
 const linkedId=new URLSearchParams(window.location.search).get("lead");const linked=(l.data||[]).find(x=>x.id===linkedId);
 if(linked){void loadAssignmentsFrom(client,linked.id);const {data:logs,error:logsError}=await client.from("vip_lead_contact_history").select("*").eq("lead_id",linked.id).order("created_at",{ascending:false}).limit(100);setHistory(logs||[]);setHistoryReady(!logsError);setHistoryNotice(logsError?"聯繫歷程資料表尚未啟用，請先執行 SQL。":"");setSelected(linked.id);setQuickDate(linked.next_follow_up_date||"");setCoffee(linked.interest_coffee);setPositioning(linked.interest_positioning);setVip(linked.interest_vip);setCoffeeStage(linked.coffee_stage);setPositioningStage(linked.positioning_stage);setVipStage(linked.vip_stage);setNotes(linked.notes||"");setOwner(linked.assigned_staff_name||"");setLastContact(linked.last_contact_date||"");setNextContact(linked.next_follow_up_date||"");setContactResult(linked.contact_result||"");}
 }catch{if(active)setNotice("連線失敗");}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[]);
 const memberName=(id:string)=>{const m=members.find(x=>x.id===id);return m?(m.vip_number||"VIP")+"｜"+m.name:"未知會員";};
 async function add(e:React.FormEvent){e.preventDefault();if(!sb||!member||!name.trim()||busy)return;setBusy(true);setNotice("");
 const {data,error}=await sb.from("vip_referral_leads").insert({referrer_member_id:member,lead_code:"FRIEND-"+crypto.randomUUID(),display_name:name.trim()}).select("*").single();
 if(error)setNotice(error.code==="23505"?"這位介紹人的對象代碼已存在，請開啟既有檔案更新。":"新增失敗："+error.message);
 else if(data){setLeads(old=>[data,...old]);setName("");setNotice("已建立被介紹者檔案");}setBusy(false);}
 async function loadAssignmentsFrom(client:SupabaseClient,id:string){
  setAssignments([]);setAssignmentReady(false);
  const {data,error}=await client.from("vip_lead_assignment_history").select("id,lead_id,previous_staff_name,new_staff_name,changed_at,changed_by_user_id").eq("lead_id",id).order("changed_at",{ascending:false}).limit(100);
  if(error){setAssignmentReady(false);return;}
  setAssignments(data||[]);setAssignmentReady(true);
 }
 async function loadHistory(id:string){if(!sb)return;const {data,error}=await sb.from("vip_lead_contact_history").select("*").eq("lead_id",id).order("created_at",{ascending:false}).limit(100);setHistory(data||[]);setHistoryReady(!error);setHistoryNotice(error?"聯繫歷程資料表尚未啟用，請先執行 SQL。":"");}
 function choose(l:Lead){setQuickResult("");setQuickDate(l.next_follow_up_date||"");setQuickNotice("");if(sb)void loadAssignmentsFrom(sb,l.id);void loadHistory(l.id);setSelected(l.id);setCoffee(l.interest_coffee);setPositioning(l.interest_positioning);setVip(l.interest_vip);setCoffeeStage(l.coffee_stage);setPositioningStage(l.positioning_stage);setVipStage(l.vip_stage);setNotes(l.notes||"");setOwner(l.assigned_staff_name||"");setLastContact(l.last_contact_date||"");setNextContact(l.next_follow_up_date||"");setContactResult(l.contact_result||"");}
 async function save(){if(!sb||!selected||busy)return;setBusy(true);setNotice("");
 const {data,error}=await sb.from("vip_referral_leads").update({interest_coffee:coffee,interest_positioning:positioning,interest_vip:vip,coffee_stage:coffeeStage,positioning_stage:positioningStage,vip_stage:vipStage,notes,assigned_staff_name:owner.trim()||null,last_contact_date:lastContact||null,next_follow_up_date:nextContact||null,contact_result:contactResult.trim()||null,updated_at:new Date().toISOString()}).eq("id",selected).select("*").single();
 if(error)setNotice("更新失敗："+error.message);else if(data){setLeads(old=>old.map(l=>l.id===selected?data:l));setNotice("已儲存轉換歷程");if(sb&&(leads.find(l=>l.id===selected)?.assigned_staff_name||"")!==(data.assigned_staff_name||""))void loadAssignmentsFrom(sb,selected);}setBusy(false);}
 async function addHistory(){
 if(!sb||!selected||!signedInStaff||!contactResult.trim()||historyBusy)return;
 setHistoryBusy(true);setHistoryNotice("");
 const contactDay=lastContact||new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Taipei"});
 const {data,error}=await sb.from("vip_lead_contact_history").insert({lead_id:selected,staff_name:signedInStaff,contacted_on:contactDay,result:contactResult.trim(),next_follow_up_date:nextContact||null}).select("*").single();
 if(error){setHistoryNotice("新增紀錄失敗："+error.message);}
 else if(data){
  setHistory(old=>[data,...old]);
  const {data:updated,error:updateError}=await sb.from("vip_referral_leads").update({last_contact_date:contactDay,next_follow_up_date:nextContact||null,contact_result:contactResult.trim(),updated_at:new Date().toISOString()}).eq("id",selected).select("*").single();
  if(updated){setLeads(old=>old.map(l=>l.id===selected?updated:l));setLastContact(contactDay);}
  setHistoryNotice(updateError?"聯繫歷程已儲存，但新朋友摘要同步失敗："+updateError.message:"已儲存聯繫歷程，並同步更新最後聯繫日期與下次追蹤日期");
 }
 setHistoryBusy(false);
}
 async function quickSave(){if(!sb||!selected||quickBusy||!quickResult.trim())return;const current=leads.find(l=>l.id===selected);if(!current||!signedInStaff){setQuickNotice("目前登入帳號尚未綁定工作人員，請先由管理員完成帳號綁定後再記錄。");return;}setQuickBusy(true);setQuickNotice("");const day=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Taipei"});const {data,error}=await sb.from("vip_lead_contact_history").insert({lead_id:selected,staff_name:signedInStaff,contacted_on:day,result:quickResult.trim(),next_follow_up_date:quickDate||null}).select("*").single();if(error){setQuickNotice("新增失敗："+error.message);setQuickBusy(false);return;}if(data)setHistory(old=>[data,...old]);const {data:updated,error:syncError}=await sb.from("vip_referral_leads").update({last_contact_date:day,next_follow_up_date:quickDate||null,contact_result:quickResult.trim(),updated_at:new Date().toISOString()}).eq("id",selected).select("*").single();if(updated){setLeads(old=>old.map(l=>l.id===selected?updated:l));setLastContact(day);setNextContact(quickDate);setContactResult(quickResult.trim());}setQuickNotice(syncError?"歷程已新增，但摘要更新失敗："+syncError.message:"聯繫紀錄已儲存");if(!syncError){setQuickResult("");setQuickDate(updated?.next_follow_up_date||"");}setQuickBusy(false);}
 const visible=leads.filter(l=>!filter||l.referrer_member_id===filter);
 const selectedLead=leads.find(l=>l.id===selected);
 return <main style={{maxWidth:1440,margin:"32px auto",padding:24,fontFamily:"system-ui,sans-serif"}}><a href="/admin/referrals">← 返回轉介紹總覽</a><h1>被介紹者與轉換歷程</h1><p>同一位新朋友建立一筆檔案，記錄對三項 TSC 服務的興趣及進展。以姓名顯示新朋友，代碼由系統自動建立。新增前請確認沒有重複檔案，避免同名或重複計算。</p>
 {loading?<p>載入中…</p>:ready?<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:24}}>
 {[["新朋友總數",leads.length],["TSC 活動已報名",leads.filter(x=>x.coffee_stage==="已報名").length],["藍海定位課已報名",leads.filter(x=>x.positioning_stage==="已報名").length],["已加入 VIP",leads.filter(x=>x.vip_stage==="已加入").length]].map(([title,value])=><div key={title} style={{border:"1px solid #cbd5e1",borderRadius:12,padding:18}}><div>{title}</div><strong style={{fontSize:28}}>{value}</strong></div>)}</div>
 <section style={{border:"1px solid #cbd5e1",borderRadius:12,padding:20,marginBottom:24}}><h2>新增新朋友檔案</h2><form onSubmit={add} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
 <label>介紹人 VIP<select style={field} required value={member} onChange={e=>setMember(e.target.value)}><option value="">選擇會員</option>{members.map(m=><option key={m.id} value={m.id}>{memberName(m.id)}</option>)}</select></label>
 
 <label>新朋友姓名 *<input required style={field} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
 {member&&name.trim()&&leads.some(l=>l.referrer_member_id===member&&l.display_name.trim().toLocaleLowerCase()===name.trim().toLocaleLowerCase())&&<p style={{color:"#b45309",gridColumn:"1/-1",margin:0}}>提醒：這位 VIP 已有同名新朋友，請先檢查既有檔案，避免重複計算；若確實是不同人仍可建立。</p>}
 <button disabled={busy||!member||!name.trim()} style={{padding:12,background:"#164e63",color:"white",border:0,borderRadius:8,alignSelf:"end"}}>建立檔案</button></form></section>

 <div className="leadWorkspace">
 <section style={{minWidth:0}}>
 <h2>新朋友清單（{visible.length}）</h2>
 <label>依介紹人篩選<select style={field} value={filter} onChange={e=>{setFilter(e.target.value);if(selected&&!leads.some(l=>l.id===selected&&(!e.target.value||l.referrer_member_id===e.target.value)))setSelected(null);}}><option value="">全部會員</option>{members.map(m=><option key={m.id} value={m.id}>{memberName(m.id)}</option>)}</select></label>
 <div style={{display:"grid",gap:12,marginTop:16}}>
 {visible.map(l=><button key={l.id} onClick={()=>choose(l)} style={{textAlign:"left",padding:18,border:selected===l.id?"2px solid #164e63":"1px solid #cbd5e1",borderRadius:12,background:selected===l.id?"#f0f9ff":"white",color:"#0f172a",cursor:"pointer",width:"100%"}}>
 <strong style={{fontSize:18}}>{l.display_name||l.lead_code}</strong>
 <div style={{marginTop:6}}>{memberName(l.referrer_member_id)}</div>
 <div style={{marginTop:8,fontSize:14,lineHeight:1.7}}>TSC 活動：{l.coffee_stage}<br/>藍海定位課：{l.positioning_stage}<br/>VIP：{l.vip_stage}</div>
 </button>)}
 {visible.length===0&&<p>尚無新朋友檔案。</p>}
 </div></section>
 <section style={{minWidth:0}}>
 {selectedLead?<div style={{border:"1px solid #cbd5e1",padding:22,borderRadius:12}}>
 <h2>{selectedLead.display_name||selectedLead.lead_code}｜轉換歷程</h2><section style={{padding:16,background:"#ecfeff",border:"2px solid #0e7490",borderRadius:12,marginBottom:18}}><h3>快速記錄本次聯繫</h3><p>聯繫日期：今天。記錄人員：{signedInStaff||"登入帳號尚未綁定工作人員"}</p><label>聯繫結果 *<textarea rows={3} maxLength={1000} value={quickResult} onChange={e=>setQuickResult(e.target.value)} style={field}/></label><label style={{display:"block",marginTop:12}}>下次追蹤日期（預設保留原日期，可調整或清空）<input type="date" value={quickDate} onChange={e=>setQuickDate(e.target.value)} style={field}/></label><button type="button" disabled={quickBusy||!quickResult.trim()||!signedInStaff} onClick={()=>void quickSave()} style={{marginTop:12,padding:14,width:"100%",background:"#0f766e",color:"white",border:0,borderRadius:8}}>{quickBusy?"儲存中…":"儲存本次聯繫"}</button>{quickNotice&&<p role="status">{quickNotice}</p>}</section>
 <p>介紹人：{memberName(selectedLead.referrer_member_id)}<br/>代碼：{selectedLead.lead_code}</p>
 <div className="leadStages">
 <div style={{border:"1px solid #e2e8f0",borderRadius:12,padding:14}}>
 <label style={interestBox}><input style={checkStyle} type="checkbox" checked={coffee} onChange={e=>setCoffee(e.target.checked)}/><span>對 TSC 活動有興趣</span></label>
 <label style={{display:"block",marginTop:14}}>報名狀態<select style={field} value={coffeeStage} onChange={e=>setCoffeeStage(e.target.value)}>{["未報名","已報名"].map(x=><option key={x}>{x}</option>)}</select></label>
 </div>
 <div style={{border:"1px solid #e2e8f0",borderRadius:12,padding:14}}>
 <label style={interestBox}><input style={checkStyle} type="checkbox" checked={positioning} onChange={e=>setPositioning(e.target.checked)}/><span>對藍海定位一日課有興趣</span></label>
 <label style={{display:"block",marginTop:14}}>報名狀態<select style={field} value={positioningStage} onChange={e=>setPositioningStage(e.target.value)}>{["未報名","已報名"].map(x=><option key={x}>{x}</option>)}</select></label>
 </div>
 <div style={{border:"1px solid #e2e8f0",borderRadius:12,padding:14}}>
 <label style={interestBox}><input style={checkStyle} type="checkbox" checked={vip} onChange={e=>setVip(e.target.checked)}/><span>對 VIP 陪跑有興趣</span></label>
 <label style={{display:"block",marginTop:14}}>報名／加入狀態<select style={field} value={vipStage} onChange={e=>setVipStage(e.target.value)}>{["未報名","已報名","已加入"].map(x=><option key={x}>{x}</option>)}</select></label>
 </div></div>
 <div style={{marginTop:20,padding:16,border:"1px solid #cbd5e1",borderRadius:12,background:"#f8fafc"}}>
 <h3 style={{marginTop:0}}>追蹤責任與聯繫紀錄</h3>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14}}>
 <label>追蹤負責人<select style={field} value={owner} onChange={e=>setOwner(e.target.value)}><option value="">未指派</option>{staffDirectory.filter(st=>st.is_active||st.display_name===owner).map(st=><option key={st.id} value={st.display_name}>{st.display_name}{st.is_active?"":"（已停用，僅供保留原紀錄）"}</option>)}{owner&&!staffDirectory.some(st=>st.display_name===owner)&&<option value={owner}>{owner}（舊資料，請重新指派）</option>}</select><small>請指派給啟用中的人員；更改後按下儲存。<a href="/admin/staff">管理工作人員 →</a></small></label>
 <label>最後聯繫日期<input type="date" style={field} value={lastContact} onChange={e=>setLastContact(e.target.value)}/></label>
 <label>下次追蹤日期<input type="date" style={field} value={nextContact} onChange={e=>setNextContact(e.target.value)}/></label>
 </div>
 <label style={{display:"block",marginTop:14}}>最近聯繫結果<textarea style={field} rows={2} maxLength={1000} value={contactResult} onChange={e=>setContactResult(e.target.value)} placeholder="例如：已邀約，對方下週回覆"/></label>
 </div>
 <section style={{marginTop:18,padding:16,border:"1px solid #cbd5e1",borderRadius:12}}>
 <h3>聯繫歷程（{history.length} 筆）</h3>
 <p style={{fontSize:14,color:"#475569"}}>填寫聯繫日期與聯繫結果，系統會以實際登入的工作人員記錄，不會變更案件負責人。按「新增聯繫紀錄」後會同步更新追蹤摘要；不需再按一次儲存。</p>
 <button type="button" disabled={!historyReady||historyBusy||!signedInStaff||!contactResult.trim()} onClick={()=>void addHistory()} style={{padding:12,background:"#0f766e",color:"white",border:0,borderRadius:8,cursor:"pointer"}}>{historyBusy?"記錄中…":"＋ 新增聯繫紀錄"}</button>
 {historyNotice&&<p role="status">{historyNotice}</p>}
 {history.length===0&&<p>尚無聯繫歷程。</p>}
 {history.map(h=><article key={h.id} style={{padding:12,borderBottom:"1px solid #e2e8f0"}}><strong>{h.contacted_on}｜{h.staff_name}</strong><p style={{whiteSpace:"pre-wrap",margin:"8px 0"}}>{h.result}</p><small>下次追蹤：{h.next_follow_up_date||"未設定"}</small></article>)}
 </section>
 <section style={{marginTop:18,padding:16,border:"1px solid #cbd5e1",borderRadius:12}}>
 <h3>負責人交接歷程（{assignments.length} 筆）</h3>
 <p style={{fontSize:14,color:"#475569"}}>修改追蹤負責人並儲存後，系統會自動記錄原負責人、新負責人及變更時間。舊資料在啟用前的交接無法回溯。</p>
 {!assignmentReady?<p style={{color:"#b45309"}}>交接紀錄尚未啟用或讀取失敗，請確認已執行交接紀錄 SQL。</p>:assignments.length===0?<p>尚無交接紀錄。</p>:assignments.map(a=><article key={a.id} style={{padding:"10px 0",borderBottom:"1px solid #e2e8f0"}}>
 <strong>{new Date(a.changed_at).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})}</strong>
 <div>{a.previous_staff_name||"未指派"} → {a.new_staff_name||"未指派"}</div>
 </article>)}
 </section>
 <label style={{display:"block",marginTop:18}}>追蹤備註<textarea style={field} rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
 <button disabled={busy} onClick={()=>void save()} style={{padding:14,background:"#164e63",color:"white",border:0,borderRadius:8,marginTop:14,width:"100%",cursor:"pointer"}}>{busy?"儲存中…":"儲存轉換歷程"}</button>
 </div>:<div style={{border:"1px dashed #94a3b8",borderRadius:12,padding:32,color:"#475569"}}><h2>個別轉換歷程</h2><p>請從左側新朋友清單選擇一位，查看並編輯他的興趣及轉換進度。</p></div>}
 </section></div>
 <style jsx>{`
 .leadWorkspace{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:24px;align-items:start}
 .leadStages{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
 @media(max-width:980px){.leadStages{grid-template-columns:1fr}}
 @media(max-width:740px){.leadWorkspace{grid-template-columns:1fr}}
 `}</style>
 </>:<p>資料表尚未啟用。</p>}{notice&&<p role="status">{notice}</p>}</main>;
}
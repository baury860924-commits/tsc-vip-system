"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type M={id:string;name:string;vip_number:string|null};
type Lead={id:string;referrer_member_id:string;lead_code:string;display_name:string;first_referred_at:string;interest_coffee:boolean;interest_positioning:boolean;interest_vip:boolean;coffee_stage:string;positioning_stage:string;vip_stage:string;notes:string};
const field={width:"100%",boxSizing:"border-box" as const,padding:11,border:"1px solid #cbd5e1",borderRadius:8,marginTop:5};
export default function LeadManagement(){
 const [sb,setSb]=useState<SupabaseClient|null>(null),[members,setMembers]=useState<M[]>([]),[leads,setLeads]=useState<Lead[]>([]);
 const [ready,setReady]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const [member,setMember]=useState(""),[code,setCode]=useState(""),[name,setName]=useState(""),[selected,setSelected]=useState<string|null>(null),[filter,setFilter]=useState("");
 const [coffee,setCoffee]=useState(false),[positioning,setPositioning]=useState(false),[vip,setVip]=useState(false),[coffeeStage,setCoffeeStage]=useState("未參加"),[positioningStage,setPositioningStage]=useState("未參加"),[vipStage,setVipStage]=useState("未加入"),[notes,setNotes]=useState("");
 useEffect(()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key){setLoading(false);setNotice("Supabase 未設定");return;}
 const client=createClient(url,key);setSb(client);let active=true;void(async()=>{try{const {data:{user}}=await client.auth.getUser();if(!user){setNotice("請先登入");return;}
 const {data:p}=await client.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();if(!["admin","staff"].includes(p?.role||"")){setNotice("需要管理員權限");return;}
 const [m,l]=await Promise.all([client.from("vip_members").select("id,name,vip_number").order("vip_number"),client.from("vip_referral_leads").select("*").order("first_referred_at",{ascending:false}).limit(500)]);
 if(!active)return;if(m.error||l.error){setNotice("請先執行被介紹者檔案 SQL："+(l.error?.message||m.error?.message));return;}
 setMembers(m.data||[]);setLeads(l.data||[]);setReady(true);
 }catch{if(active)setNotice("連線失敗");}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[]);
 const memberName=(id:string)=>{const m=members.find(x=>x.id===id);return m?(m.vip_number||"VIP")+"｜"+m.name:"未知會員";};
 async function add(e:React.FormEvent){e.preventDefault();if(!sb||!member||!code.trim()||busy)return;setBusy(true);setNotice("");
 const {data,error}=await sb.from("vip_referral_leads").insert({referrer_member_id:member,lead_code:code.trim(),display_name:name.trim()}).select("*").single();
 if(error)setNotice(error.code==="23505"?"這位介紹人的對象代碼已存在，請開啟既有檔案更新。":"新增失敗："+error.message);
 else if(data){setLeads(old=>[data,...old]);setCode("");setName("");setNotice("已建立被介紹者檔案");}setBusy(false);}
 function choose(l:Lead){setSelected(l.id);setCoffee(l.interest_coffee);setPositioning(l.interest_positioning);setVip(l.interest_vip);setCoffeeStage(l.coffee_stage);setPositioningStage(l.positioning_stage);setVipStage(l.vip_stage);setNotes(l.notes);}
 async function save(){if(!sb||!selected||busy)return;setBusy(true);setNotice("");
 const {data,error}=await sb.from("vip_referral_leads").update({interest_coffee:coffee,interest_positioning:positioning,interest_vip:vip,coffee_stage:coffeeStage,positioning_stage:positioningStage,vip_stage:vipStage,notes,updated_at:new Date().toISOString()}).eq("id",selected).select("*").single();
 if(error)setNotice("更新失敗："+error.message);else if(data){setLeads(old=>old.map(l=>l.id===selected?data:l));setNotice("已儲存轉換歷程");}setBusy(false);}
 const visible=leads.filter(l=>!filter||l.referrer_member_id===filter);
 const selectedLead=leads.find(l=>l.id===selected);
 return <main style={{maxWidth:1150,margin:"32px auto",padding:24,fontFamily:"system-ui,sans-serif"}}><a href="/admin/referrals">← 返回轉介紹總覽</a><h1>被介紹者與轉換歷程</h1><p>同一位新朋友建立一筆檔案，記錄對三項 TSC 服務的興趣及進展。用代碼辨識即可，請勿填入電話、身分證或其他敏感資訊。</p>
 {loading?<p>載入中…</p>:ready?<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:24}}>
 {[["新朋友總數",leads.length],["咖啡聚會已參加",leads.filter(x=>x.coffee_stage==="已參加").length],["藍海課已參加",leads.filter(x=>x.positioning_stage==="已參加").length],["已加入 VIP",leads.filter(x=>x.vip_stage==="已加入").length]].map(([title,value])=><div key={title} style={{border:"1px solid #cbd5e1",borderRadius:12,padding:18}}><div>{title}</div><strong style={{fontSize:28}}>{value}</strong></div>)}</div>
 <section style={{border:"1px solid #cbd5e1",borderRadius:12,padding:20,marginBottom:24}}><h2>新增新朋友檔案</h2><form onSubmit={add} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
 <label>介紹人 VIP<select style={field} required value={member} onChange={e=>setMember(e.target.value)}><option value="">選擇會員</option>{members.map(m=><option key={m.id} value={m.id}>{memberName(m.id)}</option>)}</select></label>
 <label>新朋友代碼 *<input style={field} required maxLength={80} placeholder="例如：FRIEND-001" value={code} onChange={e=>setCode(e.target.value)}/></label>
 <label>新朋友稱呼（選填）<input style={field} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
 <button disabled={busy||!member||!code.trim()} style={{padding:12,background:"#164e63",color:"white",border:0,borderRadius:8,alignSelf:"end"}}>建立檔案</button></form></section>
 <h2>新朋友清單</h2><label>依介紹人篩選<select style={{...field,maxWidth:340}} value={filter} onChange={e=>setFilter(e.target.value)}><option value="">全部會員</option>{members.map(m=><option key={m.id} value={m.id}>{memberName(m.id)}</option>)}</select></label>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12,marginTop:16}}>
 {visible.map(l=><button key={l.id} onClick={()=>choose(l)} style={{textAlign:"left",padding:18,border:selected===l.id?"2px solid #164e63":"1px solid #cbd5e1",borderRadius:12,background:"white",color:"#0f172a",cursor:"pointer"}}><strong>{l.display_name||l.lead_code}</strong><div>{memberName(l.referrer_member_id)}</div><div>咖啡：{l.coffee_stage}｜藍海：{l.positioning_stage}｜VIP：{l.vip_stage}</div></button>)}</div>
 {visible.length===0&&<p>尚無新朋友檔案。</p>}
 {selectedLead&&<section style={{border:"1px solid #cbd5e1",padding:20,borderRadius:12,marginTop:24}}><h2>{selectedLead.display_name||selectedLead.lead_code}｜轉換歷程</h2><p>介紹人：{memberName(selectedLead.referrer_member_id)}｜代碼：{selectedLead.lead_code}</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14}}>
 <div><label><input type="checkbox" checked={coffee} onChange={e=>setCoffee(e.target.checked)}/> 對咖啡聚會有興趣</label><label style={{display:"block",marginTop:10}}>參與進度<select style={field} value={coffeeStage} onChange={e=>setCoffeeStage(e.target.value)}>{["未參加","已邀約","已報名","已參加"].map(x=><option key={x}>{x}</option>)}</select></label></div>
 <div><label><input type="checkbox" checked={positioning} onChange={e=>setPositioning(e.target.checked)}/> 對藍海定位一日課有興趣</label><label style={{display:"block",marginTop:10}}>參與進度<select style={field} value={positioningStage} onChange={e=>setPositioningStage(e.target.value)}>{["未參加","已邀約","已報名","已參加"].map(x=><option key={x}>{x}</option>)}</select></label></div>
 <div><label><input type="checkbox" checked={vip} onChange={e=>setVip(e.target.checked)}/> 對 VIP 陪跑有興趣</label><label style={{display:"block",marginTop:10}}>轉換進度<select style={field} value={vipStage} onChange={e=>setVipStage(e.target.value)}>{["未加入","洽談中","已加入"].map(x=><option key={x}>{x}</option>)}</select></label></div></div>
 <label style={{display:"block",marginTop:14}}>追蹤備註<textarea style={field} rows={3} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
 <button disabled={busy} onClick={()=>void save()} style={{padding:12,background:"#164e63",color:"white",border:0,borderRadius:8,marginTop:12}}>{busy?"儲存中…":"儲存轉換歷程"}</button></section>}
 </>:<p>資料表尚未啟用。</p>}{notice&&<p role="status">{notice}</p>}</main>;
}
"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Member={id:string;name:string;vip_number:string|null;company:string;industry:string;contract_start:string|null;contract_end:string|null};
type Stage={stage_number:number;title:string;description:string;goal:string;action_plan:string};
type Listing={member_id:string;display_name:string;company:string;industry:string;introduction:string;line_url:string};
const stageNames=["陌生接觸","入門體驗","主要產品"];
const stageFields = [
 ["title","階段名稱",150], ["description","內容說明",3000],
 ["goal","階段目標",3000], ["action_plan","執行行動",3000]
] as const;
const googleFormTemplate=process.env.NEXT_PUBLIC_GOOGLE_FORM_TEMPLATE;
function googleFormLink(code:string) {
 if(!googleFormTemplate?.includes("TSC_CODE_PLACEHOLDER"))return null;
 try {
  const url=new URL(googleFormTemplate.replace("TSC_CODE_PLACEHOLDER",encodeURIComponent(code)));
  return url.origin==="https://docs.google.com"&&url.pathname.startsWith("/forms/") ? url.href : null;
 } catch { return null; }
}
export default function MemberHome(){
 const [member,setMember]=useState<Member|null>(null);
 const [sb,setSb]=useState<SupabaseClient|null>(null);
 const [category,setCategory]=useState("商業經營");
 const [subject,setSubject]=useState("");
 const [description,setDescription]=useState("");
 const [priority,setPriority]=useState("一般");
 const [method,setMethod]=useState("不拘");
 const [sending,setSending]=useState(false);
 const [consultNotice,setConsultNotice]=useState("");
 const [stages,setStages]=useState<Stage[]>([]);
 const [savingFunnel,setSavingFunnel]=useState(false);
 const [funnelMessage,setFunnelMessage]=useState("");
 const [lineUrl,setLineUrl]=useState("");
 const [published,setPublished]=useState(false);
 const [directoryReady,setDirectoryReady]=useState(false);
 const [savingDirectory,setSavingDirectory]=useState(false);
 const [profileMessage,setProfileMessage]=useState("");
 const [formLink,setFormLink]=useState("");
 const [formBusy,setFormBusy]=useState(false);
 const [directory,setDirectory]=useState<Listing[]>([]);
 const [directoryStages,setDirectoryStages]=useState<(Stage&{member_id:string})[]>([]);
 const [directoryError,setDirectoryError]=useState("");
 const [directoryQuery,setDirectoryQuery]=useState("");
 const [industryFilter,setIndustryFilter]=useState("全部產業");
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setNotice("登入服務尚未設定");setLoading(false);return;}
  const sb=createClient(url,key);setSb(sb);let active=true;
  async function init(){
   try{
    const {data:{user}}=await sb.auth.getUser();
    if(!user){if(active)setNotice("請先登入帳號中心");return;}
    const {data:m,error}=await sb.from("vip_members").select("id,name,vip_number,company,industry,contract_start,contract_end").eq("user_id",user.id).maybeSingle();
    if(error){if(active)setNotice("無法讀取會員資料："+error.code);return;}
    if(!m){if(active)setNotice("這個帳號尚未綁定 VIP 會員資料，請由管理員完成帳號綁定。");return;}
    if(active)setMember(m);
    const {data:rows,error:funnelError}=await sb.from("vip_funnel_stages").select("stage_number,title,description,goal,action_plan").eq("member_id",m.id).order("stage_number");
    if(active){if(funnelError)setNotice("銷售漏斗尚未完成設定。");else setStages(stageNames.map((title,i)=>rows?.find(row=>row.stage_number===i+1)||{stage_number:i+1,title,description:"",goal:"",action_plan:""}));}
    const [d,prefs]=await Promise.all([
     sb.from("vip_directory").select("member_id,display_name,company,industry,introduction,line_url").eq("is_published",true).eq("consent_confirmed",true).order("display_name"),
     sb.from("vip_directory").select("line_url,is_published").eq("member_id",m.id).maybeSingle()
    ]);
    if(active&&!prefs.error){setLineUrl(prefs.data?.line_url||"");setPublished(prefs.data?.is_published||false);setDirectoryReady(true);}
    if(active&&prefs.error)setProfileMessage("無法讀取名錄設定。");
    if(active){if(d.error)setDirectoryError("公開名錄尚未啟用，請先執行資料庫設定。");else setDirectory(d.data||[]);}
    if(!d.error&&d.data?.length){
     const ids=d.data.map(x=>x.member_id);
     const f=await sb.from("vip_funnel_stages").select("member_id,stage_number,title,description,goal,action_plan").in("member_id",ids).order("stage_number");
     if(active&&f.data)setDirectoryStages(f.data);
    }
   }catch{if(active)setNotice("讀取資料失敗");}
   finally{if(active)setLoading(false);}
  }
  void init();return()=>{active=false;};
 },[]);
 async function submitConsultation(e:React.FormEvent){
  e.preventDefault();if(!sb||!member||!subject.trim()||sending)return;
  setSending(true);setConsultNotice("");
  const {data:{user},error:authError}=await sb.auth.getUser();
  if(authError||!user){setConsultNotice("登入已失效，請重新登入。");setSending(false);return;}
  const {error}=await sb.from("vip_consultations").insert({
   member_id:member.id,category,subject:subject.trim(),description:description.trim(),
   priority,preferred_method:method,created_by:user.id
  });
  if(error)setConsultNotice(error.code==="42501"?"尚未開啟會員諮詢權限，請管理員先執行會員諮詢 SQL。":"送出失敗："+(error.code||error.message));
  else{setSubject("");setDescription("");setConsultNotice("諮詢已送出！TSC 管理員可在諮詢後台查看並安排處理。");}
  setSending(false);
 }
 async function saveFunnel(event:React.FormEvent) {
  event.preventDefault();
  if(!sb||!member||stages.length!==3||savingFunnel)return;
  setSavingFunnel(true);
  setFunnelMessage("");
  try {
   const {error}=await sb.from("vip_funnel_stages").upsert(stages.map(stage=>({...stage,member_id:member.id,updated_at:new Date().toISOString()})),{onConflict:"member_id,stage_number"});
   setFunnelMessage(error?"儲存失敗，請稍後再試。":"三階段漏斗已儲存。");
   if(!error)setDirectoryStages(previous=>[...previous.filter(stage=>stage.member_id!==member.id),...stages.map(stage=>({...stage,member_id:member.id}))]);
  } finally {setSavingFunnel(false);}
 }
 async function saveDirectory(event:React.FormEvent) {
  event.preventDefault();
  if(!sb||!directoryReady||savingDirectory)return;
  setSavingDirectory(true);
  setProfileMessage("");
  try {
   const {error}=await sb.rpc("vip_save_directory_preferences",{p_line_url:lineUrl.trim(),p_publish:published});
   if(error){setProfileMessage("無法儲存名錄設定。請確認 LINE 連結以 https://line.me/ 或 https://lin.ee/ 開頭。");return;}
   window.location.reload();
  } finally {setSavingDirectory(false);}
 }
 async function prepareGoogleForm() {
  if(!sb||formBusy||!googleFormLink("test"))return;
  setFormBusy(true);
  setFormLink("");
  setConsultNotice("");
  try {
   const {data,error}=await sb.rpc("vip_issue_google_form_code");
   const link=!error&&typeof data==="string"?googleFormLink(data):null;
   if(link)setFormLink(link);
   else setConsultNotice("無法取得表單連結。請稍候再試，或直接填寫站內諮詢。");
  } finally {setFormBusy(false);}
 }
 const fieldStyle={width:"100%",boxSizing:"border-box" as const,padding:10,border:"1px solid #cbd5e1",borderRadius:8,marginTop:5};
 return <main style={{maxWidth:1440,margin:"32px auto",padding:24,fontFamily:"system-ui,sans-serif"}}>
  <a href="/account">← 帳號中心</a><h1>TSC VIP 會員專區</h1>
  {loading?<p>正在確認會員身分…</p>:member?<><h2>歡迎，{member.name}</h2>
   <p>{member.vip_number||"VIP"}｜{member.company}｜{member.industry}</p>
   <nav style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}}><a href="#funnel">我的銷售漏斗</a><a href="#profile">個人資料</a><a href="#consultation">提出諮詢</a><a href="#directory">探索 VIP</a><a href="#announcements">公告</a></nav>
   <section id="funnel"><h2>我的三階段銷售漏斗</h2>
    <form onSubmit={saveFunnel}>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
      {stages.map(stage=><fieldset key={stage.stage_number} style={{border:"1px solid #cbd5e1",padding:16,borderRadius:12,minWidth:0}}>
       <legend>第 {stage.stage_number} 階段｜{stageNames[stage.stage_number-1]}</legend>
       {stageFields.map(([field,label,limit])=><label key={field} style={{display:"block",marginBottom:10}}>{label}
        <textarea rows={field==="title"?1:3} maxLength={limit} style={fieldStyle} value={stage[field]} onChange={event=>setStages(current=>current.map(row=>row.stage_number===stage.stage_number?{...row,[field]:event.target.value}:row))}/>
       </label>)}
      </fieldset>)}
     </div>
     <button type="submit" disabled={savingFunnel||stages.length!==3}>儲存三階段漏斗</button>
     {funnelMessage&&<p role="status">{funnelMessage}</p>}
    </form>
   </section>
   <section id="profile" style={{marginTop:24}}><h2>我的會員資料</h2><p>會員編號：{member.vip_number||"未設定"}｜公司：{member.company||"未設定"}｜產業：{member.industry||"未設定"}</p><p>合約期間：{member.contract_start||"未設定"} ～ {member.contract_end||"未設定"}</p>
    {directoryReady&&<form onSubmit={saveDirectory}>
     <label>會員名錄用 LINE 連結<input type="url" maxLength={500} style={fieldStyle} value={lineUrl} onChange={event=>setLineUrl(event.target.value)} placeholder="https://line.me/…"/></label>
     <p><label><input type="checkbox" checked={published} onChange={event=>setPublished(event.target.checked)}/> 我同意讓其他 TSC VIP 會員看見我的名片、LINE 連結和三階段漏斗</label></p>
     <button type="submit" disabled={savingDirectory}>儲存名錄設定</button>
    </form>}
    {profileMessage&&<p role="status">{profileMessage}</p>}
   </section>
   <section id="consultation" style={{marginTop:24}}><h2>提出諮詢</h2><p>填寫需求後由 TSC 管理員協助安排。請勿填寫身分證、醫療或財務等敏感資料。</p>
    {googleFormLink("test")&&<p>
     {formLink?<a href={formLink} referrerPolicy="no-referrer" target="_blank" rel="noreferrer">開啟 Google 諮詢表單（24 小時內有效）</a>:
      <button type="button" disabled={formBusy} onClick={()=>void prepareGoogleForm()}>{formBusy?"取得連結中…":"使用 Google 表單"}</button>}
    </p>}
    <form onSubmit={submitConsultation} style={{display:"grid",gap:12,border:"1px solid #cbd5e1",borderRadius:12,padding:20}}>
     <label>諮詢類別<select style={fieldStyle} value={category} onChange={e=>setCategory(e.target.value)}>{["商業經營","銷售漏斗","資源媒合","行銷品牌","其他"].map(x=><option key={x}>{x}</option>)}</select></label>
     <label>諮詢主題 *<input required maxLength={150} style={fieldStyle} value={subject} onChange={e=>setSubject(e.target.value)}/></label>
     <label>需求描述<textarea rows={3} maxLength={3000} style={fieldStyle} value={description} onChange={e=>setDescription(e.target.value)}/></label>
     <label>優先程度<select style={fieldStyle} value={priority} onChange={e=>setPriority(e.target.value)}>{["一般","重要","緊急"].map(x=><option key={x}>{x}</option>)}</select></label>
     <label>希望諮詢方式<select style={fieldStyle} value={method} onChange={e=>setMethod(e.target.value)}>{["不拘","電話","視訊","實體"].map(x=><option key={x}>{x}</option>)}</select></label>
     <button disabled={sending||!subject.trim()} style={{padding:12,background:"#164e63",color:"white",border:0,borderRadius:8}}>{sending?"送出中…":"送出諮詢需求"}</button>
     {consultNotice&&<p role="status">{consultNotice}</p>}
    </form>
   </section>
   <section id="directory" style={{marginTop:24}}><h2>探索 VIP 會員</h2><p>僅顯示已取得本人同意公開的會員名片與銷售漏斗。</p>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}><label style={{flex:"2 1 260px"}}>搜尋姓名、公司、產業<input style={fieldStyle} value={directoryQuery} onChange={e=>setDirectoryQuery(e.target.value)} placeholder="輸入關鍵字"/></label><label style={{flex:"1 1 180px"}}>產業篩選<select style={fieldStyle} value={industryFilter} onChange={e=>setIndustryFilter(e.target.value)}><option>全部產業</option>{[...new Set(directory.map(d=>d.industry).filter(Boolean))].sort().map(v=><option key={v}>{v}</option>)}</select></label></div>
    {directoryError&&<p role="status">{directoryError}</p>}
    {!directoryError&&directory.length===0&&<p>目前尚無公開的 VIP 名片。</p>}
    <div style={{display:"grid",gap:20}}>{directory.filter(d=>(industryFilter==="全部產業"||d.industry===industryFilter)&&[d.display_name,d.company,d.industry,d.introduction].join(" ").toLocaleLowerCase().includes(directoryQuery.trim().toLocaleLowerCase())).map(d=><article key={d.member_id} style={{padding:28,border:"1px solid #cbd5e1",borderRadius:14}}>
      <header style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",alignItems:"start"}}>
       <div><h3 style={{margin:"0 0 8px"}}>{d.display_name}</h3><p style={{margin:"0 0 8px"}}>{d.company||"未填公司"}｜{d.industry||"未填產業"}</p></div>
       <span style={{fontSize:13,color:"#475569"}}>公開 VIP 名片</span>
      </header>
      {d.line_url&&/^https:\/\/(line\.me|lin\.ee)\//.test(d.line_url)&&<p><a href={d.line_url} target="_blank" rel="noreferrer">用 LINE 聯絡</a></p>}
      {d.introduction&&<p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{d.introduction}</p>}
      <h4 style={{marginBottom:12}}>三階段銷售漏斗</h4>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:18}}>
       {[1,2,3].map(n=>{const x=directoryStages.find(y=>y.member_id===d.member_id&&y.stage_number===n);return <div key={n} style={{border:"1px solid #e2e8f0",borderRadius:10,padding:22,minWidth:0,overflowWrap:"anywhere",background:"#f8fafc"}}>
        <strong>第 {n} 階段｜{x?.title||["陌生接觸","入門體驗","主要產品"][n-1]}</strong>
        <p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{x?.description||"尚未設定"}</p>
        {x?.goal&&<p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>目標：{x.goal}</p>}
        {x?.action_plan&&<p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>行動：{x.action_plan}</p>}
       </div>;})}
      </div>
    </article>)}</div>
   </section>
   <section id="announcements" style={{marginTop:24}}><h2>公告</h2><p>公告功能尚未開放。</p></section>
  </>:<p role="status">{notice}</p>}
  {member&&notice&&<p role="status">{notice}</p>}
 </main>;
}

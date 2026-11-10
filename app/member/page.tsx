"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
import "./portal.css";
type Member={id:string;name:string;vip_number:string|null;company:string;industry:string;contract_start:string|null;contract_end:string|null};
type Stage={stage_number:number;title:string;description:string;goal:string;action_plan:string};
type Listing={member_id:string;display_name:string;company:string;industry:string;introduction:string;line_url:string};
const stageNames=["陌生接觸","入門體驗","主要產品"];
const stageLabels=["階段一","階段二","階段三"];
const stageFields = [
 ["title","階段名稱",150,"替這個階段取個名字"],
 ["description","提供什麼？",3000,"例如：分享一份入門指南"],
 ["goal","希望客戶做什麼？",3000,"例如：預約一次體驗"],
 ["action_plan","我可以做的下一步",3000,"例如：整理預約流程"]
] as const;
const stageHints=["讓潛在客戶第一次認識你。","讓有興趣的人先試試你的服務。","把需求接到最適合的正式方案。"];
const shortcuts=[
 ["consultation","我想找 TSC 聊聊","送出諮詢，由 TSC 團隊協助安排","聊"],
 ["directory","認識其他會員","按姓名、公司或產業找夥伴","找"],
 ["funnel","整理我的銷售漏斗","規劃客戶從認識你到購買的三個階段","做"],
 ["profile","管理我的會員資料","查看合約、設定會員名片的可見範圍","我"],
] as const;
const lineLinkPattern=/^https:\/\/(line\.me|lin\.ee)\//;
const googleFormTemplate=process.env.NEXT_PUBLIC_GOOGLE_FORM_TEMPLATE;
function googleFormLink(code:string) {
 if(!googleFormTemplate?.includes("TSC_CODE_PLACEHOLDER"))return null;
 try {
  const url=new URL(googleFormTemplate.replace("TSC_CODE_PLACEHOLDER",encodeURIComponent(code)));
  return url.origin==="https://docs.google.com"&&url.pathname.startsWith("/forms/") ? url.href : null;
 } catch { return null; }
}

function FunnelOverview({stages,showDetails=false}:{stages:Stage[];showDetails?:boolean}){
 return <div className="portal-stages portal-funnel-overview">
  {stageNames.map((name,index)=>{
   const stage=stages.find(item=>item.stage_number===index+1);
   return <div className="portal-stage" key={name}>
    <strong>{stageLabels[index]}（{stage?.title?.trim()||name}）</strong>
    <div>
     <p className="portal-listing-text">{stage?.description||"尚未填寫內容"}</p>
     {showDetails&&stage?.goal&&<p className="portal-listing-text"><strong>目標</strong> {stage.goal}</p>}
     {showDetails&&stage?.action_plan&&<p className="portal-listing-text"><strong>下一步</strong> {stage.action_plan}</p>}
    </div>
   </div>;
  })}
 </div>;
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
 const [savedPublished,setSavedPublished]=useState(false);
 const [directoryReady,setDirectoryReady]=useState(false);
 const [savingDirectory,setSavingDirectory]=useState(false);
 const [profileMessage,setProfileMessage]=useState("");
 const [formLink,setFormLink]=useState("");
 const [formBusy,setFormBusy]=useState(false);
 const [formMessage,setFormMessage]=useState("");
 const [directory,setDirectory]=useState<Listing[]>([]);
 const [directoryStages,setDirectoryStages]=useState<(Stage&{member_id:string})[]>([]);
 const [directoryError,setDirectoryError]=useState("");
 const [directoryQuery,setDirectoryQuery]=useState("");
 const [industryFilter,setIndustryFilter]=useState("");
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState("");
 const [needsLogin,setNeedsLogin]=useState(false);
 const [funnelError,setFunnelError]=useState("");
 useEffect(()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setNotice("會員服務目前無法使用，請聯絡 TSC 團隊。");setLoading(false);return;}
  const sb=createClient(url,key);setSb(sb);let active=true;
  async function init(){
   try{
    const {data:{user}}=await sb.auth.getUser();
    if(!user){if(active){setNeedsLogin(true);setNotice("登入後就能提出諮詢、認識其他會員，並管理自己的資料。");}return;}
    const {data:m,error}=await sb.from("vip_members").select("id,name,vip_number,company,industry,contract_start,contract_end").eq("user_id",user.id).maybeSingle();
    if(error){if(active)setNotice("暫時無法讀取會員資料，請重新整理後再試。");return;}
    if(!m){if(active)setNotice("這個帳號還沒連結到 VIP 會員資料，請聯絡 TSC 團隊協助開通。");return;}
    if(active)setMember(m);
    const {data:rows,error:funnelError}=await sb.from("vip_funnel_stages").select("stage_number,title,description,goal,action_plan").eq("member_id",m.id).order("stage_number");
    if(active){
     if(funnelError)setFunnelError("暫時無法載入銷售漏斗，請重新整理後再試。");
     else {
      setStages(stageNames.map((title,i)=>rows?.find(row=>row.stage_number===i+1)||{stage_number:i+1,title,description:"",goal:"",action_plan:""}));
      setDirectoryStages((rows||[]).map(stage=>({...stage,member_id:m.id})));
     }
    }
    const [directoryResult,prefs]=await Promise.all([
     sb.from("vip_directory").select("member_id,display_name,company,industry,introduction,line_url").eq("is_published",true).eq("consent_confirmed",true).order("display_name"),
     sb.from("vip_directory").select("line_url,is_published,consent_confirmed").eq("member_id",m.id).maybeSingle()
    ]);
    const legacyDirectory=directoryResult.error?.code==="42703";
    const d=legacyDirectory?
     await sb.from("vip_directory").select("member_id,display_name,company,industry,introduction").eq("is_published",true).eq("consent_confirmed",true).order("display_name"):
     directoryResult;
    if(active&&!prefs.error){
     const visible=Boolean(prefs.data?.is_published&&prefs.data?.consent_confirmed);
     setLineUrl(prefs.data?.line_url||"");
     setPublished(visible);
     setSavedPublished(visible);
     setDirectoryReady(true);
    }
    if(active&&prefs.error)setProfileMessage(legacyDirectory?"目前可由 TSC 團隊協助更新名片設定。":"暫時無法載入名片設定，請重新整理後再試。");
    if(active){
     if(d.error)setDirectoryError("暫時無法載入會員名錄，請重新整理後再試。");
     else setDirectory((d.data||[]).map(entry=>({...entry,line_url:"line_url" in entry&&typeof entry.line_url==="string"?entry.line_url:""})));
    }
    const ids=d.data?.map(entry=>entry.member_id).filter(id=>id!==m.id)||[];
    if(!d.error&&ids.length){
     const f=await sb.from("vip_funnel_stages").select("member_id,stage_number,title,description,goal,action_plan").in("member_id",ids).order("stage_number");
     if(active&&f.data){const otherStages=f.data;setDirectoryStages(current=>[...current,...otherStages]);}
    }
   }catch{if(active)setNotice("部分資料暫時無法載入，請重新整理後再試。");}
   finally{if(active)setLoading(false);}
  }
  void init();return()=>{active=false;};
 },[]);
 async function submitConsultation(e:React.FormEvent){
  e.preventDefault();if(!sb||!member||!subject.trim()||sending)return;
  setSending(true);setConsultNotice("");
  try {
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user){setConsultNotice("無法確認登入狀態。請重新登入後再試。");return;}
   const {error}=await sb.from("vip_consultations").insert({
    member_id:member.id,category,subject:subject.trim(),description:description.trim(),
    priority,preferred_method:method,created_by:user.id
   });
   if(error)setConsultNotice(error.code==="42501"?"目前無法送出諮詢，請聯絡 TSC 團隊協助。":"諮詢送出失敗，請稍後再試。");
   else{setSubject("");setDescription("");setConsultNotice("諮詢已送出，TSC 團隊會查看你的需求並協助安排。");}
  } catch {setConsultNotice("諮詢送出失敗，請稍後再試。");}
  finally {setSending(false);}
 }
 async function saveFunnel(event:React.FormEvent) {
  event.preventDefault();
  if(!sb||!member||stages.length!==3||savingFunnel)return;
  setSavingFunnel(true);
  setFunnelMessage("");
  try {
   const {error}=await sb.from("vip_funnel_stages").upsert(stages.map(stage=>({...stage,member_id:member.id,updated_at:new Date().toISOString()})),{onConflict:"member_id,stage_number"});
   setFunnelMessage(error?.code==="42501"?"目前可由 TSC 團隊協助更新你的銷售漏斗。":error?"儲存失敗，請稍後再試。":"你的銷售漏斗已儲存。");
   if(!error)setDirectoryStages(previous=>[...previous.filter(stage=>stage.member_id!==member.id),...stages.map(stage=>({...stage,member_id:member.id}))]);
  } catch {setFunnelMessage("儲存失敗，請稍後再試。");}
  finally {setSavingFunnel(false);}
 }
 async function saveDirectory(event:React.FormEvent) {
  event.preventDefault();
  if(!sb||!member||!directoryReady||savingDirectory)return;
  const link=lineUrl.trim();
  if(link&&!lineLinkPattern.test(link)){
   setProfileMessage("請輸入以 https://line.me/ 或 https://lin.ee/ 開頭的 LINE 連結。");
   return;
  }
  setSavingDirectory(true);
  setProfileMessage("");
  let saved=false;
  try {
   const {error}=await sb.rpc("vip_save_directory_preferences",{p_line_url:link,p_publish:published});
   if(error){setProfileMessage("名片設定儲存失敗，請稍後再試。");return;}
   saved=true;
   setSavedPublished(published);
   setLineUrl(link);
   if(!published){
    setDirectory(current=>current.filter(entry=>entry.member_id!==member.id));
    setProfileMessage("設定已儲存，你的名片目前未在會員名錄公開。");
    return;
   }
   const {data:listing}=await sb.from("vip_directory").select("member_id,display_name,company,industry,introduction,line_url").eq("member_id",member.id).eq("is_published",true).eq("consent_confirmed",true).maybeSingle();
   if(!listing){setProfileMessage("設定已儲存，請重新整理頁面以查看更新後的名錄。");return;}
   setDirectory(current=>[...current.filter(item=>item.member_id!==member.id),listing].sort((a,b)=>a.display_name.localeCompare(b.display_name,"zh-Hant")));
   setProfileMessage("設定已儲存，其他 VIP 會員現在可以看到你的名片。");
  } catch {setProfileMessage(saved?"設定已儲存，請重新整理頁面以查看更新後的名錄。":"名片設定儲存失敗，請稍後再試。");}
  finally {setSavingDirectory(false);}
 }
 async function prepareGoogleForm() {
  if(!sb||formBusy||!googleFormLink("test"))return;
  setFormBusy(true);
  setFormLink("");
  setFormMessage("");
  try {
   const {data,error}=await sb.rpc("vip_issue_google_form_code");
   const link=!error&&typeof data==="string"?googleFormLink(data):null;
   if(link)setFormLink(link);
   else setFormMessage("暫時無法取得連結，你可以稍後再試，或直接在這裡填寫諮詢。");
  } catch {setFormMessage("暫時無法取得連結，你可以稍後再試，或直接在這裡填寫諮詢。");}
  finally {setFormBusy(false);}
 }
 const query=directoryQuery.trim().toLocaleLowerCase();
 const industries=[...new Set(directory.map(entry=>entry.industry).filter(Boolean))].sort();
 const matchingMembers=directory.filter(entry=>
  (!industryFilter||entry.industry===industryFilter)&&
  [entry.display_name,entry.company,entry.industry,entry.introduction].join(" ").toLocaleLowerCase().includes(query)
 );
 const hasGoogleForm=Boolean(googleFormLink("test"));

 return <main className="member-portal">
  <header className="portal-header">
   <span className="portal-brand"><strong>TSC</strong> VIP 會員專區</span>
   <a href="/account">帳號中心 <span aria-hidden="true">↗</span></a>
  </header>
  {loading?<section className="portal-panel portal-state" aria-busy="true">
   <h1>歡迎來到 VIP 會員專區</h1><p role="status">正在準備你的會員首頁…</p>
  </section>:member?<>
   <section className="portal-welcome" aria-labelledby="portal-title">
    <div>
     <p className="portal-kicker">會員首頁</p>
     <h1 id="portal-title">{member.name}，你好！</h1>
     <p>今天想做什麼？找 TSC 聊聊、認識新夥伴，或整理下一步。</p>
    </div>
    <div className="portal-membership">
     <strong>{member.vip_number||"VIP 會員"}</strong>
     {[member.company,member.industry].filter(Boolean).length>0&&
      <span>{[member.company,member.industry].filter(Boolean).join(" ・ ")}</span>}
    </div>
   </section>
   <nav className="portal-shortcuts" aria-label="會員常用功能">
    {shortcuts.map(([id,title,detail,icon])=><a key={id} href={"#"+id}>
     <span className="portal-icon" aria-hidden="true">{icon}</span>
     <span><strong>{title}</strong><small>{detail}</small></span>
     <span className="portal-arrow" aria-hidden="true">↘</span>
    </a>)}
   </nav>
   {notice&&<p className="portal-message" role="status">{notice}</p>}
   <section className="portal-panel" id="consultation" tabIndex={-1} aria-labelledby="consultation-title">
    <div className="portal-section-heading">
     <h2 id="consultation-title">我想找 TSC 聊聊</h2>
     <p>簡單說說你遇到的問題，TSC 團隊會查看你的需求並協助安排。</p>
    </div>
    <form onSubmit={submitConsultation}>
     <fieldset className="portal-fields" disabled={sending}>
      <div className="portal-two-columns">
       <label>想聊哪一類問題？<select value={category} onChange={event=>setCategory(event.target.value)}>{["商業經營","銷售漏斗","資源媒合","行銷品牌","其他"].map(value=><option key={value}>{value}</option>)}</select></label>
       <label>諮詢主題 <small>必填</small><input required maxLength={150} value={subject} onChange={event=>setSubject(event.target.value)} placeholder="例如：想提高體驗後的成交率"/></label>
      </div>
      <label>還有什麼想讓我們知道？ <small>選填</small>
       <textarea rows={3} maxLength={3000} value={description} onChange={event=>setDescription(event.target.value)} placeholder="可以說說你目前的做法，以及希望一起解決的問題。" aria-describedby="consultation-privacy"/>
      </label>
      <p id="consultation-privacy" className="portal-hint">請避免填寫身分證號、醫療資訊或財務資料。</p>
      <div className="portal-two-columns">
       <label>優先程度<select value={priority} onChange={event=>setPriority(event.target.value)}>{["一般","重要","緊急"].map(value=><option key={value}>{value}</option>)}</select></label>
       <label>偏好的諮詢方式<select value={method} onChange={event=>setMethod(event.target.value)}>{["不拘","電話","視訊","實體"].map(value=><option key={value}>{value}</option>)}</select></label>
      </div>
     </fieldset>
     <div className="portal-actions"><button type="submit" disabled={sending||!subject.trim()}>{sending?"送出中…":"送出諮詢"}</button></div>
     <p className="portal-message" role="status">{consultNotice}</p>
    </form>
    {hasGoogleForm&&<div className="portal-alternate">
     {formLink?<a href={formLink} referrerPolicy="no-referrer" target="_blank" rel="noreferrer">開啟 Google 諮詢表單（新分頁，24 小時內有效）</a>:
      <button className="portal-secondary" type="button" disabled={formBusy} onClick={()=>void prepareGoogleForm()}>{formBusy?"取得連結中…":"改用 Google 表單"}</button>}
     <p className="portal-message" role="status">{formMessage}</p>
    </div>}
   </section>
   <section className="portal-panel" id="directory" tabIndex={-1} aria-labelledby="directory-title">
    <div className="portal-section-heading">
     <h2 id="directory-title">認識其他會員</h2>
     <p>找找可能一起合作、交流的夥伴。這裡只顯示同意公開名片的 VIP 會員。</p>
    </div>
    {directoryError?<p className="portal-empty" role="status">{directoryError}</p>:directory.length===0?
     <p className="portal-empty">目前還沒有會員公開名片。</p>:<>
     <div className="portal-two-columns portal-directory-filters">
      <label>搜尋會員<input type="search" value={directoryQuery} onChange={event=>setDirectoryQuery(event.target.value)} placeholder="輸入姓名、公司、產業或關鍵字"/></label>
      <label>產業<select value={industryFilter} onChange={event=>setIndustryFilter(event.target.value)}>
       <option value="">全部產業</option>{industries.map(industry=><option key={industry}>{industry}</option>)}
      </select></label>
     </div>
     <p className="portal-hint portal-results" role="status">{matchingMembers.length>0?`找到 ${matchingMembers.length} 位會員`:"找不到符合條件的會員，試試其他關鍵字或產業。"}</p>
     {(directoryQuery||industryFilter)&&<button className="portal-secondary" type="button" onClick={()=>{setDirectoryQuery("");setIndustryFilter("");}}>清除篩選</button>}
     <div className="portal-listings">{matchingMembers.map(entry=>{
      const savedStages=directoryStages.filter(stage=>stage.member_id===entry.member_id);
      return <article className="portal-listing" key={entry.member_id}>
       <header>
        <div>
         <h3>{entry.display_name}</h3>
         <p className="portal-hint">{[entry.company,entry.industry].filter(Boolean).join(" ・ ")}</p>
        </div>
        {lineLinkPattern.test(entry.line_url)&&<a href={entry.line_url} target="_blank" rel="noreferrer" aria-label={`用 LINE 聯絡 ${entry.display_name}（新分頁）`}>用 LINE 聯絡 <span aria-hidden="true">↗</span></a>}
       </header>
       {entry.introduction&&<p className="portal-listing-text">{entry.introduction}</p>}
       {savedStages.length>0&&<details>
        <summary>查看三階段銷售漏斗</summary>
        <FunnelOverview stages={savedStages} showDetails/>
       </details>}
      </article>;
     })}</div>
    </>}
   </section>
   <section className="portal-panel" id="funnel" tabIndex={-1} aria-labelledby="funnel-title">
    <div className="portal-section-heading">
     <h2 id="funnel-title">我的銷售漏斗</h2>
     <p>想想客戶怎麼認識你、願意試用，以及最後選擇你的產品或服務。</p>
    </div>
    {stages.length===3?<>
     <FunnelOverview stages={directoryStages.filter(stage=>stage.member_id===member.id)}/>
     <details className="portal-funnel-editor">
      <summary>編輯銷售漏斗</summary>
      <form onSubmit={saveFunnel}>
     <div className="portal-stages">
      {stages.map(stage=><fieldset key={stage.stage_number} className="portal-stage" disabled={savingFunnel}>
       <legend>{stageLabels[stage.stage_number-1]}（{stageNames[stage.stage_number-1]}）</legend>
       <p className="portal-hint">{stageHints[stage.stage_number-1]}</p>
       {stageFields.map(([field,label,limit,placeholder])=><label key={field}>{label}
        <textarea rows={field==="title"?1:2} maxLength={limit} placeholder={placeholder} value={stage[field]} onChange={event=>setStages(current=>current.map(row=>row.stage_number===stage.stage_number?{...row,[field]:event.target.value}:row))}/>
       </label>)}
      </fieldset>)}
     </div>
     <div className="portal-actions"><button type="submit" disabled={savingFunnel}>{savingFunnel?"儲存中…":"儲存銷售漏斗"}</button></div>
     <p className="portal-message" role="status">{funnelMessage}</p>
      </form>
     </details>
    </>:<p className="portal-empty" role="status">{funnelError||"暫時無法載入銷售漏斗，請重新整理後再試。"}</p>}
   </section>
   <section className="portal-panel" id="profile" tabIndex={-1} aria-labelledby="profile-title">
    <div className="portal-section-heading">
     <h2 id="profile-title">我的會員資料</h2>
     <p>查看會員資料和合約，管理其他 VIP 會員能在名錄看到的資訊。</p>
    </div>
    <dl className="portal-profile">
     <div><dt>會員編號</dt><dd>{member.vip_number||"未設定"}</dd></div>
     <div><dt>公司</dt><dd>{member.company||"未設定"}</dd></div>
     <div><dt>產業</dt><dd>{member.industry||"未設定"}</dd></div>
     <div><dt>合約期間</dt><dd>{member.contract_start||"未設定"} ～ {member.contract_end||"未設定"}</dd></div>
    </dl>
    {directoryReady&&<form onSubmit={saveDirectory} className="portal-profile-form">
     <div className="portal-profile-heading"><h3>會員名片</h3><span className="portal-badge">{savedPublished?"已在會員名錄公開":"未在會員名錄公開"}</span></div>
     <fieldset className="portal-fields" disabled={savingDirectory}>
      <label>LINE 聯絡連結 <small>選填</small><input type="url" maxLength={500} value={lineUrl} onChange={event=>setLineUrl(event.target.value)} placeholder="https://line.me/… 或 https://lin.ee/…" /></label>
      <label className="portal-checkbox">
       <input type="checkbox" checked={published} onChange={event=>setPublished(event.target.checked)} aria-describedby="directory-visibility"/>
       <span>在 VIP 會員名錄公開我的名片
        <small id="directory-visibility">勾選並儲存後，其他 VIP 會員可看見你的名片、LINE 連結和三階段銷售漏斗。你可以隨時取消公開。</small>
       </span>
      </label>
     </fieldset>
     <div className="portal-actions"><button type="submit" disabled={savingDirectory}>{savingDirectory?"儲存中…":"儲存名片設定"}</button></div>
    </form>}
    <p className="portal-message" role="status">{profileMessage}</p>
   </section>
   <aside className="portal-announcements" id="announcements" aria-labelledby="announcements-title"><h2 id="announcements-title">會員公告</h2><p>目前沒有會員公告。</p></aside>
  </>:<section className="portal-panel portal-state">
   <h1>{needsLogin?"登入 VIP 會員專區":"VIP 會員專區"}</h1>
   <p role="status">{notice}</p>
   {needsLogin&&<a className="portal-button" href="/login">前往登入</a>}
  </section>}
 </main>;
}


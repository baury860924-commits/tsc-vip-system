"use client";

import {useEffect,useState,type FormEvent} from "react";
import type {SupabaseClient} from "@supabase/supabase-js";

const kinds=["逐字稿","合約","錄音檔","訪談細節"];
const lights=["未評估","綠燈","黃燈","紅燈"];
const colors:Record<string,string>={"未評估":"#475569","綠燈":"#166534","黃燈":"#854d0e","紅燈":"#b91c1c"};
const folder="https://drive.google.com/drive/folders/1YASoOSQUV6NiOeI-ckRQvu-HZgtnyuy6";
const empty={birthday:"",contact:"",line_id:"",followup_light:"未評估",next_followup:"",next_action:""};
type DocumentRow={id:string;kind:string;label:string;drive_url:string};

export default function MemberFollowup({client,memberId}:{client:SupabaseClient;memberId:string}){
 const [details,setDetails]=useState(empty);
 const [files,setFiles]=useState<DocumentRow[]>([]);
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [kind,setKind]=useState(kinds[0]);
 const [label,setLabel]=useState("");
 const [url,setUrl]=useState("");

 useEffect(()=>{
  let current=true;
  async function load(){
   const [followup,documents]=await Promise.all([
    client.from("vip_member_followups").select("birthday,contact,line_id,followup_light,next_followup,next_action").eq("member_id",memberId).maybeSingle(),
    client.from("vip_member_documents").select("id,kind,label,drive_url").eq("member_id",memberId).order("created_at",{ascending:false})
   ]);
   if(!current)return;
   if(followup.error||documents.error){setMessage("無法載入追蹤與檔案資料。");return;}
   if(followup.data)setDetails({...followup.data,birthday:followup.data.birthday||"",next_followup:followup.data.next_followup||""});
   setFiles(documents.data||[]);
   setReady(true);
  }
  void load();
  return()=>{current=false;};
 },[client,memberId]);

 async function save(event:FormEvent){
  event.preventDefault();
  if(busy||!ready)return;
  setBusy(true);
  setMessage("");
  try {
   const {error}=await client.from("vip_member_followups").upsert({
    ...details,member_id:memberId,birthday:details.birthday||null,next_followup:details.next_followup||null
   });
   setMessage(error?"無法儲存追蹤資料。":"會員追蹤資料已儲存。");
  } finally {setBusy(false);}
 }

 async function addFile(event:FormEvent){
  event.preventDefault();
  if(busy||!ready)return;
  const link=url.trim();
  if(!/^https:\/\/(drive|docs)\.google\.com\//.test(link)){setMessage("請輸入 Google Drive 或 Google 文件的 HTTPS 連結。");return;}
  setBusy(true);
  setMessage("");
  try {
   const {data,error}=await client.from("vip_member_documents").insert({
    member_id:memberId,kind,label:label.trim(),drive_url:link
   }).select("id,kind,label,drive_url").single();
   if(error){setMessage("無法登記檔案。");return;}
   setFiles(current=>[data,...current]);
   setLabel("");
   setUrl("");
   setMessage("已登記檔案連結。");
  } finally {setBusy(false);}
 }

 async function removeFile(id:string){
  if(busy||!ready||!window.confirm("移除後台的檔案連結？"))return;
  setBusy(true);
  setMessage("");
  try {
   const {error,count}=await client.from("vip_member_documents").delete({count:"exact"}).eq("id",id).eq("member_id",memberId);
   if(error||count!==1){setMessage("無法移除檔案連結。");return;}
   setFiles(current=>current.filter(file=>file.id!==id));
   setMessage("已移除檔案連結。");
  } finally {setBusy(false);}
 }

 const panel={border:"1px solid #cbd5e1",borderRadius:12,padding:18,marginBottom:16};
 const grid={display:"grid",gap:10,gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))"};
 const field={display:"block",width:"100%",boxSizing:"border-box",padding:8} as const;
 return <section style={panel}>
  <h2>會員追蹤與檔案</h2>
  {!ready&&!message&&<p role="status">載入中…</p>}
  {ready&&<>
   <h3 style={{color:colors[details.followup_light]}}>● {details.followup_light}</h3>
   <form onSubmit={save}>
    <fieldset disabled={busy} style={{border:0,padding:0}}>
     <div style={grid}>
      <label>生日<input type="date" style={field} value={details.birthday} onChange={e=>setDetails({...details,birthday:e.target.value})}/></label>
      <label>聯絡方式<input maxLength={300} style={field} value={details.contact} onChange={e=>setDetails({...details,contact:e.target.value})}/></label>
      <label>LINE<input maxLength={300} style={field} value={details.line_id} onChange={e=>setDetails({...details,line_id:e.target.value})}/></label>
      <label>追蹤燈號<select style={field} value={details.followup_light} onChange={e=>setDetails({...details,followup_light:e.target.value})}>{lights.map(light=><option key={light}>{light}</option>)}</select></label>
      <label>下次追蹤日期<input type="date" style={field} value={details.next_followup} onChange={e=>setDetails({...details,next_followup:e.target.value})}/></label>
     </div>
     <p><label>下一步<textarea maxLength={3000} rows={3} style={field} value={details.next_action} onChange={e=>setDetails({...details,next_action:e.target.value})}/></label></p>
     <button type="submit">儲存追蹤資料</button>
    </fieldset>
   </form>
   <h3>Google Drive 檔案</h3>
   <p>在 Drive 上傳檔案並設定工作人員存取權限，再將連結登記到這位會員。 <a href={folder} target="_blank" rel="noreferrer">開啟會員檔案庫</a></p>
   <form onSubmit={addFile}>
    <fieldset disabled={busy} style={{border:0,padding:0}}>
     <div style={grid}>
      <label>類型<select style={field} value={kind} onChange={e=>setKind(e.target.value)}>{kinds.map(item=><option key={item}>{item}</option>)}</select></label>
      <label>檔案名稱<input required maxLength={150} style={field} value={label} onChange={e=>setLabel(e.target.value)}/></label>
      <label>Drive 連結<input required type="url" maxLength={2048} style={field} value={url} onChange={e=>setUrl(e.target.value)}/></label>
     </div>
     <p><button type="submit">登記檔案</button></p>
    </fieldset>
   </form>
   {files.length?<ul>{files.map(file=><li key={file.id}>{file.kind}｜<a href={file.drive_url} target="_blank" rel="noreferrer">{file.label}</a>　<button disabled={busy} type="button" onClick={()=>void removeFile(file.id)}>移除連結</button></li>)}</ul>:<p>尚未登記檔案。</p>}
  </>}
  {message&&<p role="status">{message}</p>}
 </section>;
}

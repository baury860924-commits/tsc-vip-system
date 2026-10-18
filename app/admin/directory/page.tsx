"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
type M={id:string;name:string;company:string;industry:string;vip_number:string|null};
type D={member_id:string;display_name:string;company:string;industry:string;introduction:string;consent_confirmed:boolean;is_published:boolean};
export default function DirectoryAdmin(){
 const [members,setMembers]=useState<M[]>([]),[entries,setEntries]=useState<D[]>([]);
 const [id,setId]=useState(""),[name,setName]=useState(""),[company,setCompany]=useState(""),[industry,setIndustry]=useState(""),[intro,setIntro]=useState(""),[consent,setConsent]=useState(false),[published,setPublished]=useState(false);
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const sb=url&&key?createClient(url,key):null;
 useEffect(()=>{if(!sb)return;let active=true;(async()=>{
 const {data:{user}}=await sb.auth.getUser();if(!user){setNotice("請先登入");return;}
 const {data:p}=await sb.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
 if(!["admin","staff"].includes(p?.role||"")){setNotice("需要管理員權限");return;}
 const [m,d]=await Promise.all([sb.from("vip_members").select("id,name,company,industry,vip_number").order("vip_number"),sb.from("vip_directory").select("member_id,display_name,company,industry,introduction,consent_confirmed,is_published")]);
 if(!active)return;if(m.error||d.error){setNotice("請先執行公開名錄 SQL："+(d.error?.message||m.error?.message));return;}
 setMembers(m.data||[]);setEntries(d.data||[]);setReady(true);
 })();return()=>{active=false;};},[]);
 function choose(value:string){setId(value);const m=members.find(x=>x.id===value),d=entries.find(x=>x.member_id===value);setName(d?.display_name||m?.name||"");setCompany(d?.company||m?.company||"");setIndustry(d?.industry||m?.industry||"");setIntro(d?.introduction||"");setConsent(d?.consent_confirmed||false);setPublished(d?.is_published||false);setNotice("");}
 async function save(e:React.FormEvent){e.preventDefault();if(!sb||!id||!name.trim()||busy)return;if(published&&!consent){setNotice("必須取得本人同意");return;}
 setBusy(true);const row={member_id:id,display_name:name.trim(),company:company.trim(),industry:industry.trim(),introduction:intro.trim(),consent_confirmed:consent,is_published:published&&consent,updated_at:new Date().toISOString()};
 const {data,error}=await sb.from("vip_directory").upsert(row,{onConflict:"member_id"}).select("member_id,display_name,company,industry,introduction,consent_confirmed,is_published").single();
 if(error)setNotice("儲存失敗："+error.message);else if(data){setEntries(old=>[...old.filter(x=>x.member_id!==id),data]);setNotice(data.is_published?"已公開名片與銷售漏斗":"已儲存為不公開草稿");}
 setBusy(false);}
 const field={width:"100%",padding:10,boxSizing:"border-box" as const,border:"1px solid #cbd5e1",borderRadius:8};
 return <main style={{maxWidth:800,margin:"32px auto",padding:24,fontFamily:"system-ui,sans-serif"}}><a href="/admin/members">← 返回會員管理</a><h1>VIP 公開名錄設定</h1><p>預設不公開。只有確認取得會員本人同意後，才可以發布公開名片與銷售漏斗。</p>
 {ready?<form onSubmit={save} style={{display:"grid",gap:14}}>
 <label>選擇會員<select style={field} value={id} onChange={e=>choose(e.target.value)} required><option value="">請選擇</option>{members.map(m=><option key={m.id} value={m.id}>{m.vip_number}｜{m.name}</option>)}</select></label>
 {id&&<><label>公開姓名<input style={field} value={name} onChange={e=>setName(e.target.value)} required maxLength={100}/></label><label>公司<input style={field} value={company} onChange={e=>setCompany(e.target.value)} maxLength={150}/></label><label>產業<input style={field} value={industry} onChange={e=>setIndustry(e.target.value)} maxLength={100}/></label><label>公開介紹<textarea style={field} value={intro} onChange={e=>setIntro(e.target.value)} rows={4} maxLength={1500}/></label>
 <label><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);if(!e.target.checked)setPublished(false);}}/> 已取得會員本人同意公開名片及三階段漏斗</label>
 <label><input type="checkbox" checked={published} disabled={!consent} onChange={e=>setPublished(e.target.checked)}/> 發布到 VIP 名錄</label>
 <button disabled={busy} style={{padding:12,background:"#164e63",color:"white",border:0,borderRadius:8}}>{busy?"儲存中…":"儲存公開設定"}</button></>}</form>:<p>載入中或尚未啟用公開名錄。</p>}
 {notice&&<p role="status">{notice}</p>}</main>;
}
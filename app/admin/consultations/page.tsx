"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Member={id:string;name:string;vip_number:string|null};
type Consultation={id:string;member_id:string;category:string;subject:string;description:string;priority:string;preferred_method:string;status:string;internal_note:string;follow_up_date:string|null;created_at:string};
const statuses=["待處理","安排中","處理中","待追蹤","已完成"];
const inputStyle={width:"100%",boxSizing:"border-box" as const,padding:10,border:"1px solid #cbd5e1",borderRadius:8,marginTop:5};
export default function ConsultationAdmin(){
 const [sb,setSb]=useState<SupabaseClient|null>(null);
 const [authorized,setAuthorized]=useState(false);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [members,setMembers]=useState<Member[]>([]);
 const [items,setItems]=useState<Consultation[]>([]);
 const [memberId,setMemberId]=useState("");
 const [category,setCategory]=useState("商業經營");
 const [subject,setSubject]=useState("");
 const [description,setDescription]=useState("");
 const [priority,setPriority]=useState("一般");
 const [method,setMethod]=useState("不拘");
 const [filter,setFilter]=useState("全部");
 const [editing,setEditing]=useState<string|null>(null);
 const [status,setStatus]=useState("待處理");
 const [note,setNote]=useState("");
 const [followDate,setFollowDate]=useState("");
 useEffect(()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setNotice("登入服務尚未設定");setLoading(false);return;}
  const client=createClient(url,key);setSb(client);let alive=true;
  async function init(){
   try{
    const {data:{user}}=await client.auth.getUser();
    if(!user){if(alive)setNotice("請先登入");return;}
    const {data:profile,error:profileError}=await client.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
    if(profileError||!["admin","staff"].includes(profile?.role||"")){if(alive)setNotice("此頁僅供正式管理員及工作人員使用");return;}
    const [m,c]=await Promise.all([client.from("vip_members").select("id,name,vip_number").order("vip_number"),client.from("vip_consultations").select("id,member_id,category,subject,description,priority,preferred_method,status,internal_note,follow_up_date,created_at").order("created_at",{ascending:false}).limit(200)]);
    if(alive){setAuthorized(true);if(m.error)setNotice("會員讀取失敗："+m.error.code);else setMembers(m.data||[]);
     if(c.error)setNotice(c.error.code==="PGRST205"?"諮詢資料表尚未建立，請先執行 SQL。":"諮詢讀取失敗："+c.error.code);else setItems(c.data||[]);}
   }catch{if(alive)setNotice("連線失敗");}
   finally{if(alive)setLoading(false);}
  }
  void init();return()=>{alive=false;};
 },[]);
 const nameOf=(id:string)=>{const m=members.find(x=>x.id===id);return m?(m.vip_number||"未編號")+"｜"+m.name:"未知會員";};
 async function create(e:React.FormEvent){
  e.preventDefault();if(!sb||!authorized||!memberId||!subject.trim())return;
  setBusy(true);setNotice("");
  const {data,error}=await sb.from("vip_consultations").insert({member_id:memberId,category,subject:subject.trim(),description:description.trim(),priority,preferred_method:method}).select("id,member_id,category,subject,description,priority,preferred_method,status,internal_note,follow_up_date,created_at").single();
  if(error)setNotice("新增失敗："+(error.code==="PGRST205"?"請先建立諮詢資料表":error.code));
  else if(data){setItems(old=>[data,...old]);setSubject("");setDescription("");setNotice("諮詢已儲存至雲端");}
  setBusy(false);
 }
 async function update(id:string){
  if(!sb||!authorized)return;setBusy(true);setNotice("");
  const {data,error}=await sb.from("vip_consultations").update({status,internal_note:note,follow_up_date:followDate||null,updated_at:new Date().toISOString()}).eq("id",id).select("id,member_id,category,subject,description,priority,preferred_method,status,internal_note,follow_up_date,created_at").single();
  if(error)setNotice("更新失敗："+error.code);
  else if(data){setItems(old=>old.map(x=>x.id===id?data:x));setEditing(null);setNotice("諮詢進度已更新");}
  setBusy(false);
 }
 function begin(item:Consultation){setEditing(item.id);setStatus(item.status);setNote(item.internal_note);setFollowDate(item.follow_up_date||"");}
 return <main style={{maxWidth:1050,margin:"32px auto",padding:24,fontFamily:"system-ui,sans-serif"}}>
  <a href="/admin/members">← 返回會員管理</a><h1>VIP 會員諮詢管理｜正式後台</h1>
  <p style={{background:"#fff4d6",padding:14,borderRadius:8}}>目前為管理員代填諮詢與內部處理版本。會員前台尚未開放諮詢申請，內部備註不會對 VIP 公開。</p>
  {loading?<p>正在驗證身分…</p>:authorized?<><section style={{border:"1px solid #cbd5e1",borderRadius:12,padding:20,marginBottom:24}}>
   <h2>新增諮詢需求</h2><form onSubmit={create} style={{display:"grid",gap:12}}>
    <label>VIP 會員 *<select required style={inputStyle} value={memberId} onChange={e=>setMemberId(e.target.value)}><option value="">請選擇會員</option>{members.map(m=><option key={m.id} value={m.id}>{nameOf(m.id)}</option>)}</select></label>
    <label>諮詢類別<select style={inputStyle} value={category} onChange={e=>setCategory(e.target.value)}>{["商業經營","銷售漏斗","資源媒合","行銷品牌","其他"].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>諮詢主題 *<input required maxLength={150} style={inputStyle} value={subject} onChange={e=>setSubject(e.target.value)}/></label>
    <label>需求描述<textarea style={inputStyle} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label>
    <label>優先程度<select style={inputStyle} value={priority} onChange={e=>setPriority(e.target.value)}>{["一般","重要","緊急"].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>希望諮詢方式<select style={inputStyle} value={method} onChange={e=>setMethod(e.target.value)}>{["不拘","電話","視訊","實體"].map(x=><option key={x}>{x}</option>)}</select></label>
    <button disabled={busy||!memberId||!subject.trim()} style={{padding:12,background:"#164e63",color:"#fff",border:0,borderRadius:8}}>建立諮詢需求</button>
   </form></section>
   <h2>諮詢處理清單（{items.length} 筆）</h2>
   <label>狀態篩選<select style={{...inputStyle,maxWidth:240}} value={filter} onChange={e=>setFilter(e.target.value)}>{["全部",...statuses].map(x=><option key={x}>{x}</option>)}</select></label>
   {items.filter(x=>filter==="全部"||x.status===filter).map(item=><article key={item.id} style={{border:"1px solid #cbd5e1",borderRadius:12,padding:18,marginTop:14}}>
    <strong>{nameOf(item.member_id)}｜{item.subject}</strong>
    <p>{item.category}・{item.priority}・{item.preferred_method}・狀態：<strong>{item.status}</strong></p>
    {item.description&&<p style={{whiteSpace:"pre-wrap"}}>{item.description}</p>}
    {item.follow_up_date&&<p>追蹤日期：{item.follow_up_date}</p>}
    {editing===item.id?<div style={{display:"grid",gap:12}}>
     <label>處理狀態<select style={inputStyle} value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(x=><option key={x}>{x}</option>)}</select></label>
     <label>內部處理備註<textarea style={inputStyle} rows={3} value={note} onChange={e=>setNote(e.target.value)}/></label>
     <label>下次追蹤日期<input type="date" style={inputStyle} value={followDate} onChange={e=>setFollowDate(e.target.value)}/></label>
     <div><button disabled={busy} onClick={()=>void update(item.id)} style={{padding:"10px 18px",background:"#164e63",color:"white",border:0,borderRadius:8}}>儲存進度</button> <button onClick={()=>setEditing(null)} style={{padding:10}}>取消</button></div>
    </div>:<button onClick={()=>begin(item)} style={{padding:10,color:"#0f172a",background:"#fff",border:"1px solid #94a3b8",borderRadius:8}}>更新處理進度</button>}
   </article>)}
  </>:<p>無法使用正式諮詢後台。</p>}
  {notice&&<p role="status">{notice}</p>}
 </main>;
}

"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";

type VipMember={id:string;vip_number:string|null;name:string;company:string;industry:string;contract_start:string|null;contract_end:string|null;user_id:string|null;created_at:string};
export default function AdminMembersPage(){
 const [sb,setSb]=useState<SupabaseClient|null>(null);
 const [role,setRole]=useState<string|null>(null);
 const [members,setMembers]=useState<VipMember[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 const [name,setName]=useState("");
 const [company,setCompany]=useState("");
 const [industry,setIndustry]=useState("");
 const [vipNumber,setVipNumber]=useState("");
 const [start,setStart]=useState("");
 const [end,setEnd]=useState("");
 const [selected,setSelected]=useState<VipMember|null>(null);
 const [stages,setStages]=useState<{stage_number:number;title:string;description:string;goal:string;action_plan:string}[]>([]);
 const [bindingBusy,setBindingBusy]=useState(false);
 const [funnelBusy,setFunnelBusy]=useState(false);
 const [funnelMessage,setFunnelMessage]=useState("");
 const stageLabels=["陌生接觸","入門體驗","主要產品"];
 async function openFunnel(member:VipMember){
  if(!sb)return;
  setSelected(member);setFunnelBusy(true);setFunnelMessage("");
  const {data,error}=await sb.from("vip_funnel_stages").select("stage_number,title,description,goal,action_plan").eq("member_id",member.id);
  if(error){setFunnelMessage(error.code==="42P01"?"銷售漏斗資料表尚未建立，請先執行第二階段 SQL。":"讀取漏斗失敗："+(error.code||"請檢查權限"));setStages([]);}
  else setStages([1,2,3].map(n=>{const found=data?.find(x=>x.stage_number===n);return {stage_number:n,title:found?.title||stageLabels[n-1],description:found?.description||"",goal:found?.goal||"",action_plan:found?.action_plan||""};}));
  setFunnelBusy(false);
 }
 function editStage(n:number,key:"title"|"description"|"goal"|"action_plan",value:string){setStages(old=>old.map(s=>s.stage_number===n?{...s,[key]:value}:s));}
 async function saveFunnel(){
  if(!sb||!selected||!(role==="admin"||role==="staff"))return;
  setFunnelBusy(true);setFunnelMessage("");
  const rows=stages.map(s=>({...s,member_id:selected.id}));
  const {error}=await sb.from("vip_funnel_stages").upsert(rows,{onConflict:"member_id,stage_number"});
  setFunnelMessage(error?"儲存失敗："+(error.code||"請檢查權限"):"三階段銷售漏斗已儲存至 Supabase。");
  setFunnelBusy(false);
 }

 useEffect(()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setMessage("Supabase 連線尚未設定");setLoading(false);return;}
  const client=createClient(url,key);setSb(client);
  let alive=true;
  async function init(){
   try{
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user){if(alive)setMessage("請先登入正式帳號。");return;}
    const {data:profile,error:profileError}=await client.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
    if(profileError){if(alive)setMessage("無法確認資料庫角色，請檢查 RLS 設定。");return;}
    if(alive)setRole(profile?.role||null);
    if(profile?.role!=="admin"&&profile?.role!=="staff"){if(alive)setMessage("此頁僅供正式管理員與工作人員使用。");return;}
    const {data,error}=await client.from("vip_members").select("id,vip_number,name,company,industry,contract_start,contract_end,user_id,created_at").order("created_at",{ascending:false}).limit(200);
    if(alive){if(error)setMessage("會員名單讀取失敗："+(error.code||"未知錯誤"));else setMembers(data||[]);}
   }catch{if(alive)setMessage("登入或資料庫連線發生錯誤。");}
   finally{if(alive)setLoading(false);}
  }
  void init();return()=>{alive=false;};
 },[]);
 async function bindDemoVip(member:VipMember){
  if(!sb||role!=="admin"||member.name!=="陳柏儒"||member.user_id)return;
  const {data:{user},error:authError}=await sb.auth.getUser();
  if(authError||!user){setMessage("請先重新登入管理員帳號。");return;}
  if(members.some(m=>m.user_id===user.id)){setMessage("此帳號已綁定其他 VIP，請先確認。");return;}
  if(!window.confirm("確定將目前管理員帳號綁定為陳柏儒示範 VIP？管理員角色會保留。"))return;
  setBindingBusy(true);setMessage("");
  const {data,error}=await sb.from("vip_members").update({user_id:user.id}).eq("id",member.id).is("user_id",null).select("id,user_id").maybeSingle();
  if(error||!data)setMessage("綁定未完成："+(error?.message||"會員已綁定或資料有變動，請重新整理。"));
  else{setMembers(old=>old.map(m=>m.id===member.id?{...m,user_id:user.id}:m));setMessage("陳柏儒示範 VIP 已綁定。可開啟會員前台測試。");}
  setBindingBusy(false);
 }
 async function addMember(e:React.FormEvent){
  e.preventDefault();
  if(!sb||role!=="admin"&&role!=="staff")return;
  setSaving(true);setMessage("");
  const record={name:name.trim(),company:company.trim(),industry:industry.trim(),vip_number:vipNumber.trim()||("VIP-"+String(Math.max(0,...members.map(m=>Number(m.vip_number?.match(/^VIP-(\d+)$/)?.[1]||0)))+1).padStart(4,"0")),contract_start:start||null,contract_end:end||null};
  const {data,error}=await sb.from("vip_members").insert(record).select("id,vip_number,name,company,industry,contract_start,contract_end,user_id,created_at").single();
  if(error)setMessage("新增失敗："+(error.code==="23505"?"VIP 編號重複":error.code||"請確認資料庫權限"));
  else if(data){setMembers(old=>[data,...old]);setName("");setCompany("");setIndustry("");setVipNumber("");setStart("");setEnd("");setMessage("已新增至 Supabase 雲端會員資料庫。");}
  setSaving(false);
 }
 const fieldStyle={width:"100%",boxSizing:"border-box" as const,padding:10,border:"1px solid #cbd5e1",borderRadius:8};
 return <main style={{maxWidth:1000,margin:"32px auto",padding:24,fontFamily:"system-ui,sans-serif"}}>
  <a href="/account">← 返回帳號中心</a><h1>VIP 會員管理｜正式雲端版</h1>
  {loading?<p>正在驗證帳號與讀取會員名單…</p>:role==="admin"||role==="staff"?<>
   <p>目前角色：<strong>{role==="admin"?"管理員":"工作人員"}</strong>。本頁資料由 Supabase 讀取，不使用展示版瀏覽器儲存。</p>
   <p style={{background:"#fff4d6",padding:14,borderRadius:8}}>目前支援基本會員建檔與獨立銷售漏斗。訪談、錄音與諮詢尚未連接正式雲端資料庫。請勿在此輸入身分證、醫療或財務等敏感資料。</p>
   <section style={{padding:20,border:"1px solid #ddd",borderRadius:12,marginBottom:24}}>
    <h2>新增 VIP 會員</h2>
    <form onSubmit={addMember} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
     <label>姓名 *<input required maxLength={100} style={fieldStyle} value={name} onChange={e=>setName(e.target.value)}/></label>
     <label>公司<input maxLength={150} style={fieldStyle} value={company} onChange={e=>setCompany(e.target.value)}/></label>
     <label>產業<input maxLength={100} style={fieldStyle} value={industry} onChange={e=>setIndustry(e.target.value)}/></label>
     <label>VIP 編號（留白則自動產生）<input maxLength={30} style={fieldStyle} placeholder="例如 VIP-0001" value={vipNumber} onChange={e=>setVipNumber(e.target.value)}/></label>
     <label>合約開始日<input type="date" style={fieldStyle} value={start} onChange={e=>setStart(e.target.value)}/></label>
     <label>合約到期日<input type="date" min={start||undefined} style={fieldStyle} value={end} onChange={e=>setEnd(e.target.value)}/></label>
     <div style={{gridColumn:"1/-1"}}><button type="submit" disabled={saving||!name.trim()} style={{padding:"12px 22px",background:"#164e63",color:"white",border:0,borderRadius:8,cursor:"pointer"}}>{saving?"儲存中…":"新增雲端會員"}</button></div>
    </form>
   </section>
   <p><a href="/admin/coaching">前往 VIP 陪跑管理 →</a>　<a href="/admin/consultations">前往 VIP 諮詢管理 →</a>　<a href="/admin/directory">VIP 公開名錄設定 →</a></p>
   <h2>雲端會員名單（{members.length} 筆）</h2>
   {members.length===0?<p>尚未建立正式會員資料。原展示版測試資料不會自動匯入。</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr>{["VIP 編號","姓名","公司","產業","合約起日","合約到期","登入綁定","示範 VIP","銷售漏斗"].map(h=><th key={h} style={{padding:10,borderBottom:"2px solid #ddd"}}>{h}</th>)}</tr></thead><tbody>{members.map(m=><tr key={m.id}>{[m.vip_number||"未設定",m.name,m.company,m.industry,m.contract_start||"—",m.contract_end||"—",m.user_id?"已綁定":"尚未綁定"].map((v,i)=><td key={i} style={{padding:10,borderBottom:"1px solid #eee"}}>{v}</td>)}<td style={{padding:10,borderBottom:"1px solid #eee"}}>{role==="admin"&&m.name==="陳柏儒"&&!m.user_id?<button type="button" disabled={bindingBusy} onClick={()=>void bindDemoVip(m)}>{bindingBusy?"處理中…":"綁定目前帳號"}</button>:m.name==="陳柏儒"&&m.user_id?"已綁定":"—"}</td><td style={{padding:10,borderBottom:"1px solid #eee"}}><button type="button" onClick={()=>void openFunnel(m)}>編輯漏斗</button></td></tr>)}</tbody></table></div>}
   {selected&&<section style={{border:"1px solid #cbd5e1",borderRadius:12,padding:20,marginTop:24}}>
    <h2>{selected.name}｜專屬三階段銷售漏斗</h2>
    <p>每位會員有獨立內容。管理員可編輯，VIP 本人僅可依資料庫權限查看。</p>
    {funnelBusy&&<p>資料處理中…</p>}
    {stages.map(stage=><div key={stage.stage_number} style={{padding:16,marginBottom:14,border:"1px solid #e2e8f0",borderRadius:10,display:"grid",gap:10}}>
     <h3>第 {stage.stage_number} 階段｜{stageLabels[stage.stage_number-1]}</h3>
     <label>階段名稱<input style={fieldStyle} maxLength={150} value={stage.title} onChange={e=>editStage(stage.stage_number,"title",e.target.value)}/></label>
     <label>內容說明<textarea style={fieldStyle} rows={3} value={stage.description} onChange={e=>editStage(stage.stage_number,"description",e.target.value)}/></label>
     <label>階段目標<textarea style={fieldStyle} rows={2} value={stage.goal} onChange={e=>editStage(stage.stage_number,"goal",e.target.value)}/></label>
     <label>執行行動<textarea style={fieldStyle} rows={2} value={stage.action_plan} onChange={e=>editStage(stage.stage_number,"action_plan",e.target.value)}/></label>
    </div>)}
    {funnelMessage&&<p role="status">{funnelMessage}</p>}
    <button type="button" disabled={funnelBusy||stages.length!==3} onClick={()=>void saveFunnel()} style={{padding:"12px 20px",background:"#164e63",color:"white",border:0,borderRadius:8}}>儲存三階段漏斗</button>
    <button type="button" onClick={()=>setSelected(null)} style={{marginLeft:12,padding:"12px 20px"}}>關閉</button>
   </section>}
  </>:<p>未取得管理員權限。請先完成登入與資料庫角色設定。</p>}
  {message&&<p role="status">{message}</p>}
 </main>;
}

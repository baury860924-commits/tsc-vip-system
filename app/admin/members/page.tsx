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
 async function addMember(e:React.FormEvent){
  e.preventDefault();
  if(!sb||role!=="admin"&&role!=="staff")return;
  setSaving(true);setMessage("");
  const record={name:name.trim(),company:company.trim(),industry:industry.trim(),vip_number:vipNumber.trim()||null,contract_start:start||null,contract_end:end||null};
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
   <p style={{background:"#fff4d6",padding:14,borderRadius:8}}>第一階段僅提供基本會員建檔。尚未連接訪談、錄音、諮詢與各會員的銷售漏斗。請勿在此輸入身分證、醫療或財務等敏感資料。</p>
   <section style={{padding:20,border:"1px solid #ddd",borderRadius:12,marginBottom:24}}>
    <h2>新增 VIP 會員</h2>
    <form onSubmit={addMember} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
     <label>姓名 *<input required maxLength={100} style={fieldStyle} value={name} onChange={e=>setName(e.target.value)}/></label>
     <label>公司<input maxLength={150} style={fieldStyle} value={company} onChange={e=>setCompany(e.target.value)}/></label>
     <label>產業<input maxLength={100} style={fieldStyle} value={industry} onChange={e=>setIndustry(e.target.value)}/></label>
     <label>VIP 編號（選填）<input maxLength={30} style={fieldStyle} placeholder="例如 VIP-0001" value={vipNumber} onChange={e=>setVipNumber(e.target.value)}/></label>
     <label>合約開始日<input type="date" style={fieldStyle} value={start} onChange={e=>setStart(e.target.value)}/></label>
     <label>合約到期日<input type="date" min={start||undefined} style={fieldStyle} value={end} onChange={e=>setEnd(e.target.value)}/></label>
     <div style={{gridColumn:"1/-1"}}><button type="submit" disabled={saving||!name.trim()} style={{padding:"12px 22px",background:"#164e63",color:"white",border:0,borderRadius:8,cursor:"pointer"}}>{saving?"儲存中…":"新增雲端會員"}</button></div>
    </form>
   </section>
   <h2>雲端會員名單（{members.length} 筆）</h2>
   {members.length===0?<p>尚未建立正式會員資料。原展示版測試資料不會自動匯入。</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr>{["VIP 編號","姓名","公司","產業","合約起日","合約到期","登入綁定"].map(h=><th key={h} style={{padding:10,borderBottom:"2px solid #ddd"}}>{h}</th>)}</tr></thead><tbody>{members.map(m=><tr key={m.id}>{[m.vip_number||"未設定",m.name,m.company,m.industry,m.contract_start||"—",m.contract_end||"—",m.user_id?"已綁定":"尚未綁定"].map((v,i)=><td key={i} style={{padding:10,borderBottom:"1px solid #eee"}}>{v}</td>)}</tr>)}</tbody></table></div>}
  </>:<p>未取得管理員權限。請先完成登入與資料庫角色設定。</p>}
  {message&&<p role="status">{message}</p>}
 </main>;
}

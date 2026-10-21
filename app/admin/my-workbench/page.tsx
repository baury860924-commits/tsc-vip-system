"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
type Lead={id:string;display_name:string;next_follow_up_date:string|null;vip_stage:string};
export default function MyWorkbench(){
 const [rows,setRows]=useState<Lead[]>([]);
 const [name,setName]=useState("");
 const [message,setMessage]=useState("讀取個人工作台中…");
 const [filter,setFilter]=useState("全部");
 const [search,setSearch]=useState("");
 useEffect(()=>{let active=true;async function load(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setMessage("尚未設定登入服務");return;}
  const sb=createClient(url,key);
  const {data:{user}}=await sb.auth.getUser();
  if(!user){window.location.replace("/login");return;}
  const {data:profile}=await sb.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
  if(profile?.role!=="admin"&&profile?.role!=="staff"){setMessage("此帳號沒有工作人員權限");return;}
  const {data:staff}=await sb.from("tsc_staff_directory").select("display_name,is_active").eq("user_id",user.id).maybeSingle();
  if(!staff||!staff.is_active){setMessage("請先由管理員完成工作人員帳號綁定，或確認帳號未停用。");return;}
  const {data,error}=await sb.from("vip_referral_leads").select("id,display_name,next_follow_up_date,vip_stage").eq("assigned_staff_name",staff.display_name).limit(1000);
  if(!active)return;
  if(error){setMessage("讀取失敗："+error.message);return;}
  setName(staff.display_name);setRows((data||[]).filter(l=>l.vip_stage!=="已加入"));setMessage("");
 }
 void load();return()=>{active=false;};},[]);
 const today=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Taipei"});
 const due=(l:Lead)=>!l.next_follow_up_date?"未排定":l.next_follow_up_date<today?"已逾期":l.next_follow_up_date===today?"今日到期":"未來追蹤";
 const labels=["全部","已逾期","今日到期","未排定","未來追蹤"];
 const shown=rows.filter(l=>(filter==="全部"||due(l)===filter)&&l.display_name.includes(search)).sort((a,b)=>labels.indexOf(due(a))-labels.indexOf(due(b)));
 return <main style={{maxWidth:740,margin:"24px auto",padding:16,fontFamily:"system-ui,sans-serif"}}>
 <h1>我的每日追蹤</h1><p>{name}｜{today}</p><p><a href="/account">帳號中心</a>　<a href="/admin/referrals">轉介紹總覽</a></p>
 {message?<p role="status">{message}</p>:<>
 <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>{["今日到期","已逾期","未排定"].map(k=><button key={k} onClick={()=>setFilter(k)} style={{padding:12,border:"1px solid #cbd5e1",borderRadius:9}}><strong style={{fontSize:28}}>{rows.filter(l=>due(l)===k).length}</strong><br/>{k}</button>)}</div>
 <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"18px 0"}}>{labels.map(k=><button key={k} onClick={()=>setFilter(k)} aria-pressed={filter===k} style={{padding:10,background:filter===k?"#164e63":"#eee",color:filter===k?"white":"black",border:0,borderRadius:8}}>{k}</button>)}</div>
 <label>搜尋新朋友<input type="search" value={search} onChange={e=>setSearch(e.target.value)} style={{display:"block",width:"100%",padding:12,boxSizing:"border-box",margin:"8px 0 18px"}}/></label>
 <p>符合條件：{shown.length} 筆　<button onClick={()=>window.location.reload()}>重新整理</button></p>
 {shown.map(l=><article key={l.id} style={{padding:14,border:"1px solid #ddd",borderRadius:10,marginBottom:10}}><strong>{l.display_name}</strong><p>{due(l)}｜{l.next_follow_up_date||"未設定日期"}</p><a href={"/admin/leads?lead="+encodeURIComponent(l.id)}>開啟檔案／新增聯繫紀錄 →</a></article>)}
 {shown.length===0&&<p>目前沒有符合條件的待辦。</p>}
 <p style={{fontSize:13,color:"#64748b"}}>這是個人待辦畫面篩選，不代表資料庫存取權限已隔離。</p>
 </>}</main>;
}

"use client";
import {useCallback,useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Lead={id:string;display_name:string;assigned_staff_name:string|null;next_follow_up_date:string|null;last_contact_date:string|null;contact_result:string|null;coffee_stage:string;positioning_stage:string;vip_stage:string};
const categories=["全部","已逾期","今日到期","未排定","未來追蹤"] as const;
type Category=typeof categories[number];
const todayTaiwan=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
function category(l:Lead,today:string):Category{return !l.next_follow_up_date?"未排定":l.next_follow_up_date<today?"已逾期":l.next_follow_up_date===today?"今日到期":"未來追蹤";}
export default function MyWorkbench(){
 const [db,setDb]=useState<SupabaseClient|null>(null),[staff,setStaff]=useState(""),[role,setRole]=useState(""),[rows,setRows]=useState<Lead[]>([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState(""),[search,setSearch]=useState(""),[filter,setFilter]=useState<Category>("全部");
 const today=todayTaiwan();
 const load=useCallback(async(client:SupabaseClient,initial:boolean)=>{if(initial)setLoading(true);else setRefreshing(true);setError("");
 try{const {data:{user},error:userError}=await client.auth.getUser();if(userError||!user){window.location.replace("/login");return;}
 const {data:profile,error:profileError}=await client.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
 if(profileError||!["admin","staff"].includes(profile?.role||"")){setError("這個帳號尚未取得 TSC 工作人員權限。");return;}setRole(profile.role);
 const {data:directory,error:directoryError}=await client.from("tsc_staff_directory").select("display_name,is_active").eq("user_id",user.id).maybeSingle();
 if(directoryError){setError("無法確認工作人員綁定狀態，請聯絡管理員。");return;}
 if(!directory||!directory.is_active){setError(directory?"此工作人員帳號已停用，請聯絡管理員。":"此帳號尚未綁定工作人員姓名，請管理員至工作人員管理完成綁定。");return;}
 setStaff(directory.display_name);
 const all:Lead[]=[];let offset=0;const size=500;
 for(let page=0;page<20;page++){const {data,error:leadError}=await client.from("vip_referral_leads").select("id,display_name,assigned_staff_name,next_follow_up_date,last_contact_date,contact_result,coffee_stage,positioning_stage,vip_stage").eq("assigned_staff_name",directory.display_name).range(offset,offset+size-1);
 if(leadError){setError("讀取待辦失敗："+leadError.message);return;}const chunk=(data||[]) as Lead[];all.push(...chunk);if(chunk.length<size)break;offset+=size;if(page===19)setError("案件數量超過目前載入上限，請聯絡管理員協助調整。");}
 setRows(all.filter(l=>l.vip_stage!=="已加入"));
 }catch{setError("目前無法讀取工作台，請檢查網路後重試。");}finally{setLoading(false);setRefreshing(false);}},[]);
 useEffect(()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key){setError("系統尚未設定資料庫連線。");setLoading(false);return;}const client=createClient(url,key);setDb(client);void load(client,true);},[load]);
 const sorted=rows.filter(l=>(filter==="全部"||category(l,today)===filter)&&(l.display_name||"").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).sort((a,b)=>{const aKind=categories.findIndex(k=>k===category(a,today)),bKind=categories.findIndex(k=>k===category(b,today));return aKind-bKind||(a.next_follow_up_date||"9999").localeCompare(b.next_follow_up_date||"9999");});
 const counts=Object.fromEntries(categories.map(k=>[k,k==="全部"?rows.length:rows.filter(l=>category(l,today)===k).length])) as Record<Category,number>;
 return <main style={{maxWidth:760,margin:"24px auto",padding:"0 16px 48px",fontFamily:"system-ui,sans-serif",color:"#0f172a"}}>
 <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h1 style={{marginBottom:4}}>我的每日追蹤</h1><p style={{marginTop:0,color:"#475569"}}>{staff?staff+"｜":""}{today}｜{role==="admin"?"管理員":"工作人員"}</p></div><a href="/account">帳號中心</a></header>
 {loading?<p role="status">正在載入你的待辦案件…</p>:error?<div role="alert" style={{padding:18,background:"#fff7ed",border:"1px solid #fdba74",borderRadius:12}}><strong>{error}</strong><p><a href="/admin/staff">工作人員管理</a>（需管理員權限）</p><button onClick={()=>db&&void load(db,false)} disabled={refreshing}>重新檢查</button></div>:<>
 <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,margin:"18px 0"}}>{([["今日到期","今天要聯繫"],["已逾期","逾期未追蹤"],["未排定","尚未排定"]] as const).map(([k,label])=><button key={k} type="button" onClick={()=>setFilter(k)} style={{textAlign:"left",background:filter===k?"#ecfeff":"#f8fafc",border:filter===k?"2px solid #0891b2":"1px solid #cbd5e1",borderRadius:12,padding:12,cursor:"pointer"}}><strong style={{fontSize:30}}>{counts[k]}</strong><div style={{fontSize:13}}>{label}</div></button>)}</div>
 <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>{categories.map(k=><button type="button" key={k} onClick={()=>setFilter(k)} aria-pressed={filter===k} style={{padding:"10px 12px",borderRadius:9,border:"1px solid #cbd5e1",background:filter===k?"#164e63":"white",color:filter===k?"white":"#0f172a"}}>{k}（{counts[k]}）</button>)}</div>
 <label style={{display:"block",marginBottom:14}}>搜尋新朋友<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="輸入姓名" style={{display:"block",boxSizing:"border-box",width:"100%",padding:13,borderRadius:9,border:"1px solid #94a3b8",marginTop:6}}/></label>
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:12}}><span>顯示 {sorted.length} 筆待追蹤案件</span><button type="button" onClick={()=>db&&void load(db,false)} disabled={refreshing} style={{padding:"10px 14px",borderRadius:9,border:"1px solid #cbd5e1"}}>{refreshing?"更新中…":"重新整理"}</button></div>
 <div style={{display:"grid",gap:12}}>{sorted.map(l=><article key={l.id} style={{padding:16,border:"1px solid #cbd5e1",borderRadius:12,background:"white"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:8}}><strong style={{fontSize:19}}>{l.display_name||"未填姓名"}</strong><span style={{fontSize:13,fontWeight:700,color:category(l,today)==="已逾期"?"#b45309":"#0369a1"}}>{category(l,today)}</span></div><p style={{margin:"8px 0",fontSize:14}}>下次追蹤：{l.next_follow_up_date||"尚未設定"}<br/>最後聯繫：{l.last_contact_date||"尚無紀錄"}</p>{l.contact_result&&<p style={{fontSize:14,color:"#475569",whiteSpace:"pre-wrap"}}>上次結果：{l.contact_result}</p>}<a href={"/admin/leads?lead="+encodeURIComponent(l.id)} style={{display:"inline-block",padding:"12px 14px",borderRadius:9,background:"#164e63",color:"white",textDecoration:"none"}}>開啟檔案／記錄聯繫 →</a></article>)}{sorted.length===0&&<p style={{padding:18,background:"#f8fafc",borderRadius:10}}>目前沒有符合條件的待辦案件。</p>}</div>
 <p style={{fontSize:13,color:"#64748b",marginTop:18}}>僅顯示指派給你且尚未加入 VIP 的新朋友。資料檢視限制仍須搭配資料庫權限政策，不以此頁面篩選作為安全隔離。</p>
 {role==="admin"&&<p><a href="/admin/referrals">管理員：查看轉介紹總覽 →</a></p>}
 </>}</main>;
}

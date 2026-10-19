"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Staff={id:string;display_name:string;user_id:string|null;is_active:boolean;created_at:string};
const field={width:"100%",padding:12,border:"1px solid #cbd5e1",borderRadius:8,boxSizing:"border-box" as const};
export default function StaffAdmin(){
 const [ownUserId,setOwnUserId]=useState(""),[db,setDb]=useState<SupabaseClient|null>(null),[rows,setRows]=useState<Staff[]>([]),[role,setRole]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[newName,setNewName]=useState(""),[binding,setBinding]=useState<Record<string,string>>({});
 useEffect(()=>{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key){setNotice("Supabase 尚未設定");setLoading(false);return;}const client=createClient(url,key);setDb(client);let active=true;
 void(async()=>{try{const {data:{session}}=await client.auth.getSession();if(!session?.user){setNotice("請先登入");return;}if(active)setOwnUserId(session.user.id);
 const {data:profile}=await client.from("vip_profiles").select("role").eq("user_id",session.user.id).maybeSingle();if(!["admin","staff"].includes(profile?.role||"")){setNotice("僅限 TSC 工作人員");return;}if(!active)return;setRole(profile?.role||"");
 const {data,error}=await client.from("tsc_staff_directory").select("id,display_name,user_id,is_active,created_at").order("display_name");if(error){setNotice("請先執行工作人員名錄 SQL："+error.message);return;}setRows(data||[]);setBinding(Object.fromEntries((data||[]).map(x=>[x.id,x.user_id||""])));
 }catch{if(active)setNotice("連線失敗");}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[]);
 async function add(e:React.FormEvent){e.preventDefault();if(!db||role!=="admin"||busy||!newName.trim())return;setBusy(true);setNotice("");
 const {data,error}=await db.from("tsc_staff_directory").insert({display_name:newName.trim()}).select("*").single();
 if(error)setNotice("新增失敗："+error.message);else if(data){setRows(old=>[...old,data].sort((a,b)=>a.display_name.localeCompare(b.display_name)));setNewName("");setNotice("已新增工作人員，尚未綁定登入帳號");}setBusy(false);}
 async function toggle(staff:Staff){if(!db||role!=="admin"||busy)return;setBusy(true);setNotice("");
 const {data,error}=await db.from("tsc_staff_directory").update({is_active:!staff.is_active,updated_at:new Date().toISOString()}).eq("id",staff.id).select("*").single();
 if(error)setNotice("更新失敗："+error.message);else if(data){setRows(old=>old.map(x=>x.id===staff.id?data:x));setNotice(data.is_active?"已重新啟用":"已停用名錄項目。注意：此操作不會撤銷 Supabase 登入權限，也不會自動移轉待辦。");}setBusy(false);}
 async function bind(staff:Staff){if(!db||role!=="admin"||busy)return;const id=(binding[staff.id]||"").trim();if(id&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)){setNotice("請輸入有效的 Authentication UUID");return;}
 setBusy(true);setNotice("");
 if(id){const {data:profile,error}=await db.from("vip_profiles").select("role").eq("user_id",id).maybeSingle();if(error||!["admin","staff"].includes(profile?.role||"")){setNotice("找不到具有 admin 或 staff 角色的帳號，請先確認 Authentication UUID 與帳號角色。");setBusy(false);return;}}
 const {data,error}=await db.from("tsc_staff_directory").update({user_id:id||null,updated_at:new Date().toISOString()}).eq("id",staff.id).select("*").single();
 if(error)setNotice("綁定失敗："+error.message);else if(data){setRows(old=>old.map(x=>x.id===staff.id?data:x));setNotice(id?"已綁定帳號，工作台可依登入身分帶入負責人":"已解除帳號綁定");}setBusy(false);}
 return <main style={{maxWidth:850,margin:"24px auto",padding:20,fontFamily:"system-ui,sans-serif",color:"#0f172a"}}><a href="/admin/referrals">← 返回待辦工作台</a><h1>TSC 工作人員管理</h1><p>管理負責人名錄、帳號綁定與啟用狀態。只有管理員可修改；工作人員可檢視。</p>{ownUserId&&<section style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:10,padding:14,marginBottom:18}}><strong>目前登入帳號的 UUID</strong><p style={{overflowWrap:"anywhere",fontFamily:"monospace",margin:"8px 0"}}>{ownUserId}</p><button type="button" onClick={()=>void navigator.clipboard.writeText(ownUserId).then(()=>setNotice("已複製目前登入帳號 UUID")).catch(()=>setNotice("複製失敗，請手動選取 UUID"))} style={{padding:"9px 12px"}}>複製我的 UUID</button><p style={{fontSize:13,color:"#475569"}}>請由每位工作人員登入自己的帳號後，複製各自的 UUID 交給管理員綁定。不要將同一個帳號綁定給不同人。</p></section>}
 {loading?<p>載入中…</p>:role?<><p style={{padding:12,background:"#f0f9ff",borderRadius:8}}>提醒：停用此名錄不會撤銷帳號原有的管理權限；真正停權仍須另行調整 vip_profiles 角色或 Authentication。已存在的追蹤紀錄不會刪除。</p>
 {role==="admin"&&<form onSubmit={add} style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:22}}><input aria-label="新增工作人員姓名" placeholder="新增工作人員姓名" style={{...field,flex:"1 1 220px"}} value={newName} onChange={e=>setNewName(e.target.value)}/><button disabled={busy||!newName.trim()} style={{padding:12}}>新增人員</button></form>}
 <div style={{display:"grid",gap:14}}>{rows.map(staff=><section key={staff.id} style={{border:"1px solid #cbd5e1",borderRadius:12,padding:18}}>
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><h2 style={{margin:"0 0 10px"}}>{staff.display_name}</h2><strong style={{color:staff.is_active?"#047857":"#b45309"}}>{staff.is_active?"啟用中":"已停用"}</strong></div>
 <p style={{fontSize:14,color:"#475569"}}>登入帳號：{staff.user_id?"已綁定":"尚未綁定"}</p>
 {role==="admin"&&<><label style={{display:"block",marginBottom:12}}>Authentication User UUID<input style={{...field,marginTop:6}} placeholder="貼上已確認的帳號 UUID，留空可解除綁定" value={binding[staff.id]??staff.user_id??""} onChange={e=>setBinding(old=>({...old,[staff.id]:e.target.value}))}/></label>
 <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button disabled={busy} onClick={()=>void bind(staff)} style={{padding:"10px 14px"}}>儲存帳號綁定</button><button disabled={busy} onClick={()=>void toggle(staff)} style={{padding:"10px 14px"}}>{staff.is_active?"停用名錄":"重新啟用"}</button></div></>}
 </section>)}</div>{rows.length===0&&<p>目前尚無工作人員名錄。</p>}</>:null}
 {notice&&<p role="status" style={{padding:12,background:"#fff7ed",borderRadius:8}}>{notice}</p>}
 </main>;
}

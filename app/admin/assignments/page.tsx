"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Member={id:string;name:string;vip_number:string|null};
type Staff={user_id:string;display_name:string;role:string};
type Assignment={id:string;member_id:string;staff_user_id:string;assigned_at:string;ended_at:string|null};
export default function AssignmentsPage(){
 const [client,setClient]=useState<SupabaseClient|null>(null);
 const [role,setRole]=useState("");
 const [members,setMembers]=useState<Member[]>([]);
 const [staff,setStaff]=useState<Staff[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [selected,setSelected]=useState("");
 const [target,setTarget]=useState("");
 const [userId,setUserId]=useState("");
 useEffect(()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setNotice("登入服務未設定");setReady(true);return;}
  const sb=createClient(url,key);setClient(sb);let active=true;
  async function init(){
   try{
    const {data:{user}}=await sb.auth.getUser();
    if(!user){if(active)setNotice("請先登入");return;}
    if(active)setUserId(user.id);
    const {data:profile,error:profileError}=await sb.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
    if(profileError||!["admin","staff"].includes(profile?.role||"")){if(active)setNotice("此頁僅供 TSC 內部工作人員使用");return;}
    if(active)setRole(profile!.role);
    const [m,p,a]=await Promise.all([
     sb.from("vip_members").select("id,name,vip_number").order("vip_number"),
     sb.from("vip_profiles").select("user_id,display_name,role").in("role",["admin","staff"]),
     sb.from("vip_staff_assignments").select("id,member_id,staff_user_id,assigned_at,ended_at").order("assigned_at",{ascending:false})
    ]);
    if(active){if(m.error||p.error||a.error)setNotice(a.error?.code==="PGRST205"?"請先執行工作人員分派 SQL。":"讀取失敗："+(m.error?.code||p.error?.code||a.error?.code||"未知錯誤"));else{setMembers(m.data||[]);setStaff(p.data||[]);setAssignments(a.data||[]);}}
   }catch{if(active)setNotice("資料庫連線失敗");}
   finally{if(active)setReady(true);}
  }
  void init();return()=>{active=false;};
 },[]);
 const activeAssignments=assignments.filter(a=>!a.ended_at);
 const current=activeAssignments.find(a=>a.member_id===selected);
 const staffName=(id:string)=>staff.find(s=>s.user_id===id)?.display_name||staff.find(s=>s.user_id===id)?.user_id.slice(0,8)||"未知工作人員";
 async function assign(){
  if(!client||role!=="admin"||!selected||!target||busy)return;
  if(current?.staff_user_id===target){setNotice("此會員已由該人員負責");return;}
  setBusy(true);setNotice("");
  if(current){
   const {error}=await client.from("vip_staff_assignments").update({ended_at:new Date().toISOString()}).eq("id",current.id).is("ended_at",null);
   if(error){setNotice("結束原分派失敗："+(error.code||"權限錯誤"));setBusy(false);return;}
  }
  const {error}=await client.from("vip_staff_assignments").insert({member_id:selected,staff_user_id:target,assigned_by:userId});
  if(error)setNotice("新分派失敗："+(error.code||"權限錯誤")+"。請重新整理確認原分派狀態。");
  else{setNotice("分派已更新，歷史紀錄保留。");const {data}=await client.from("vip_staff_assignments").select("id,member_id,staff_user_id,assigned_at,ended_at").order("assigned_at",{ascending:false});if(data)setAssignments(data);}
  setBusy(false);
 }
 return <main style={{maxWidth:900,margin:"32px auto",padding:24,fontFamily:"system-ui,sans-serif"}}>
  <a href="/admin/coaching">← 返回陪跑管理</a><h1>VIP 工作人員分派</h1>
  <p>由管理員指派 VIP 服務負責人；工作人員可查看分派狀態，但不能修改。重新分派會保留歷史紀錄。</p>
  {!ready?<p>正在讀取資料…</p>:role?<><p>目前角色：{role==="admin"?"管理員":"工作人員"}</p>
   <div style={{display:"grid",gap:14,border:"1px solid #ddd",borderRadius:12,padding:20}}>
    <label>VIP 會員<select value={selected} onChange={e=>{setSelected(e.target.value);setTarget("");}} style={{display:"block",width:"100%",padding:10,color:"#0f172a"}}><option value="">請選擇</option>{members.map(m=><option key={m.id} value={m.id}>{m.vip_number||"未編號"}｜{m.name}</option>)}</select></label>
    {selected&&<p>目前負責人：<strong>{current?staffName(current.staff_user_id):"尚未分派"}</strong></p>}
    {role==="admin"&&<><label>指派給<select value={target} onChange={e=>setTarget(e.target.value)} style={{display:"block",width:"100%",padding:10,color:"#0f172a"}}><option value="">請選擇工作人員</option>{staff.map(s=><option key={s.user_id} value={s.user_id}>{s.display_name||s.user_id.slice(0,8)}（{s.role==="admin"?"管理員":"工作人員"}）</option>)}</select></label>
     <button disabled={!selected||!target||busy} onClick={()=>void assign()} style={{padding:12,background:"#164e63",color:"white",border:0,borderRadius:8}}>{busy?"儲存中…":"確認分派／重新分派"}</button></>}
   </div>
   <h2>目前負責人清單</h2>
   <div style={{display:"grid",gap:8}}>{members.map(m=><div key={m.id} style={{padding:12,borderBottom:"1px solid #ddd"}}>{m.vip_number||"未編號"}｜{m.name} → {activeAssignments.find(a=>a.member_id===m.id)?staffName(activeAssignments.find(a=>a.member_id===m.id)!.staff_user_id):"尚未分派"}</div>)}</div>
   {selected&&<><h2>該會員分派歷史</h2>{assignments.filter(a=>a.member_id===selected).map(a=><p key={a.id}>{staffName(a.staff_user_id)}｜{new Date(a.assigned_at).toLocaleDateString("zh-TW")} ～ {a.ended_at?new Date(a.ended_at).toLocaleDateString("zh-TW"):"目前"}</p>)}</>}
  </>:<p>無法載入工作人員分派資料。</p>}
  {notice&&<p role="status">{notice}</p>}
 </main>;
}

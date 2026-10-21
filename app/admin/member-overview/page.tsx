"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
type Member={id:string;name:string;vip_number:string|null;company:string;industry:string;contract_start:string|null;contract_end:string|null};
type Funnel={stage_number:number;title:string;description:string;goal:string;action_plan:string};
type Coaching={id:string;contact_date:string;contact_method:string;invitation_sent:boolean;member_replied:boolean;summary:string;next_action:string;follow_up_date:string|null};
type Consultation={id:string;subject:string;status:string;priority:string;follow_up_date:string|null};
type Assignment={staff_user_id:string;assigned_at:string};
type StaffProfile={user_id:string;display_name:string};
const labels=["陌生接觸","入門體驗","主要產品"];
export default function MemberOverview(){
 const [member,setMember]=useState<Member|null>(null);
 const [stages,setStages]=useState<Funnel[]>([]);
 const [records,setRecords]=useState<Coaching[]>([]);
 const [consultations,setConsultations]=useState<Consultation[]>([]);
 const [message,setMessage]=useState("正在確認帳號與載入會員資料…");
 const [warnings,setWarnings]=useState<string[]>([]);
 const [assignment,setAssignment]=useState<Assignment|null>(null);
 const [staffProfiles,setStaffProfiles]=useState<StaffProfile[]>([]);
 useEffect(()=>{let active=true;async function load(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setMessage("資料庫連線尚未設定。");return;}
  const id=new URLSearchParams(window.location.search).get("member");
  if(!id){setMessage("尚未指定 VIP 會員。請由會員名單選擇。");return;}
  const sb=createClient(url,key);
  const {data:{user}}=await sb.auth.getUser();
  if(!user){window.location.replace("/login");return;}
  const {data:profile,error:profileError}=await sb.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
  if(profileError||!["admin","staff"].includes(profile?.role||"")){setMessage("沒有內部會員資料查看權限。");return;}
  if(profile?.role==="staff"){const {data:staff}=await sb.from("tsc_staff_directory").select("is_active").eq("user_id",user.id).maybeSingle();if(!staff?.is_active){setMessage("工作人員帳號未綁定或已停用。");return;}}
  const [m,f,c,q]=await Promise.all([
   sb.from("vip_members").select("id,name,vip_number,company,industry,contract_start,contract_end").eq("id",id).maybeSingle(),
   sb.from("vip_funnel_stages").select("stage_number,title,description,goal,action_plan").eq("member_id",id).order("stage_number"),
   sb.from("vip_coaching_records").select("id,contact_date,contact_method,invitation_sent,member_replied,summary,next_action,follow_up_date").eq("member_id",id).order("contact_date",{ascending:false}).limit(30),
   sb.from("vip_consultations").select("id,subject,status,priority,follow_up_date").eq("member_id",id).order("created_at",{ascending:false}).limit(30)
  ]);
  if(!active)return;
  if(m.error||!m.data){setMessage("會員資料不存在或目前沒有權限查看。");return;}
  setMember(m.data);
  const issues:string[]=[];
  if(f.error)issues.push("銷售漏斗尚無法讀取");
  else setStages(f.data||[]);
  if(c.error)issues.push("陪跑紀錄尚無法讀取");
  else setRecords(c.data||[]);
  if(q.error)issues.push("諮詢紀錄尚無法讀取");
  else setConsultations(q.data||[]);
  const [assignmentResult,staffResult]=await Promise.all([sb.from("vip_staff_assignments").select("staff_user_id,assigned_at").eq("member_id",id).is("ended_at",null).order("assigned_at",{ascending:false}).limit(1),sb.from("vip_profiles").select("user_id,display_name").in("role",["admin","staff"])]);
  if(!active)return;if(assignmentResult.error)issues.push("陪跑負責人資料尚無法讀取");else setAssignment(assignmentResult.data?.[0]||null);if(!staffResult.error)setStaffProfiles(staffResult.data||[]);
  setWarnings(issues);setMessage("");
 }void load();return()=>{active=false;};},[]);
 const today=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Taipei"});
 const month=today.slice(0,7);
 const thisMonth=records.filter(r=>r.contact_date.startsWith(month));
 const invited=thisMonth.some(r=>r.invitation_sent);
 const replied=thisMonth.some(r=>r.member_replied);
 const pending=records.filter(r=>r.follow_up_date&&r.follow_up_date<=today&&r.next_action);
 const expiry=member?.contract_end?(member.contract_end<today?"已到期":member.contract_end<=new Date(Date.parse(today+"T12:00:00+08:00")+30*86400000).toLocaleDateString("en-CA",{timeZone:"Asia/Taipei"})?"30 天內到期":"有效"):"未設定到期日";
 const box={border:"1px solid #cbd5e1",borderRadius:12,padding:18,marginBottom:16} as const;
 return <main style={{maxWidth:850,margin:"24px auto",padding:"0 16px 40px",fontFamily:"system-ui,sans-serif",color:"#0f172a"}}>
  <a href="/admin/members">← 返回 VIP 會員名單</a>
  {message?<p role="status" style={{marginTop:20}}>{message}</p>:member&&<>
   <h1 style={{marginBottom:4}}>{member.name}｜VIP 個別管理</h1>
   <p style={{color:"#475569"}}>{member.vip_number||"未編號"}｜{member.company||"未填公司"}｜{member.industry||"未填產業"}</p>
   <section style={box}><h2 style={{marginTop:0}}>會員狀態</h2><p>陪跑負責人：<strong>{assignment?staffProfiles.find(x=>x.user_id===assignment.staff_user_id)?.display_name||"已指派工作人員":"尚未指派"}</strong>　<a href="/admin/assignments">管理分派 →</a></p><p>合約：{member.contract_start||"未設定"} ～ {member.contract_end||"未設定"}</p><p><strong>會籍：{expiry}</strong></p><p>本月邀約：<strong>{invited?"已邀約":"尚未邀約"}</strong>｜會員回覆：{replied?"已回覆":"尚未回覆"}</p>
    <a href={"/admin/coaching?member="+encodeURIComponent(member.id)}>開啟此會員陪跑紀錄 →</a></section>
   <section style={box}><h2 style={{marginTop:0}}>目前待追蹤事項（{pending.length}）</h2>{pending.length===0?<p>沒有已到期且有待辦內容的紀錄。</p>:pending.map(r=><article key={r.id} style={{borderTop:"1px solid #e2e8f0",padding:"10px 0"}}><strong>{r.follow_up_date}</strong><p style={{whiteSpace:"pre-wrap"}}>{r.next_action}</p></article>)}</section>
   <section style={box}><h2 style={{marginTop:0}}>專屬三階段銷售漏斗</h2>{[1,2,3].map(n=>{const stage=stages.find(x=>x.stage_number===n);return <article key={n} style={{borderTop:"1px solid #e2e8f0",padding:"12px 0"}}><strong>第 {n} 階段｜{stage?.title||labels[n-1]}</strong><p style={{whiteSpace:"pre-wrap"}}>{stage?.description||"尚未填寫內容"}</p>{stage?.goal&&<p>目標：{stage.goal}</p>}{stage?.action_plan&&<p>行動：{stage.action_plan}</p>}</article>;})}<a href="/admin/members">前往會員管理編輯銷售漏斗 →</a></section>
   <section style={box}><h2 style={{marginTop:0}}>最近陪跑紀錄（{records.length}）</h2>{records.length===0?<p>尚無陪跑紀錄。</p>:records.slice(0,8).map(r=><article key={r.id} style={{borderTop:"1px solid #e2e8f0",padding:"12px 0"}}><strong>{r.contact_date}｜{r.contact_method}</strong><p>邀約：{r.invitation_sent?"是":"否"}｜回覆：{r.member_replied?"是":"否"}</p>{r.summary&&<p style={{whiteSpace:"pre-wrap"}}>{r.summary}</p>}{r.next_action&&<p style={{whiteSpace:"pre-wrap"}}>待辦：{r.next_action}</p>}</article>)}</section>
   <section style={box}><h2 style={{marginTop:0}}>諮詢需求（{consultations.length}）</h2>{consultations.length===0?<p>尚無諮詢紀錄。</p>:consultations.map(c=><p key={c.id}>{c.subject}｜{c.status}｜{c.priority}{c.follow_up_date?"｜追蹤 "+c.follow_up_date:""}</p>)}<a href="/admin/consultations">前往諮詢管理 →</a></section>
   {warnings.length>0&&<p role="alert" style={{color:"#b45309"}}>{warnings.join("；")}。部分資訊可能不完整。</p>}
   <p style={{fontSize:13,color:"#64748b"}}>本頁為內部資料彙整；實際資料存取仍受 Supabase 權限政策約束。</p>
  </>}
 </main>;
}

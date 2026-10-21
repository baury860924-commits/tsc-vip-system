"use client";
import {useEffect,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Member={id:string;name:string;vip_number:string|null;company:string};
type RecordRow={id:string;member_id:string;contact_date:string;contact_method:string;invitation_sent:boolean;member_replied:boolean;summary:string;next_action:string;follow_up_date:string|null;created_at:string};
export default function CoachingPage(){
 const [client,setClient]=useState<SupabaseClient|null>(null);
 const [members,setMembers]=useState<Member[]>([]);
 const [selected,setSelected]=useState("");
 const [records,setRecords]=useState<RecordRow[]>([]);
 const [monthlyRecords,setMonthlyRecords]=useState<Pick<RecordRow,"member_id"|"contact_date"|"invitation_sent"|"member_replied">[]>([]);
 const [monthError,setMonthError]=useState("");
 const [memberSearch,setMemberSearch]=useState("");
 const [monthlyFilter,setMonthlyFilter]=useState("尚未邀約");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [authorized,setAuthorized]=useState(false);
 const [date,setDate]=useState(new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Taipei"}));
 const [method,setMethod]=useState("LINE");
 const [invited,setInvited]=useState(false);
 const [replied,setReplied]=useState(false);
 const [summary,setSummary]=useState("");
 const [nextAction,setNextAction]=useState("");
 const [followDate,setFollowDate]=useState("");
 useEffect(()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setNotice("登入服務未設定。");setLoading(false);return;}
  const sb=createClient(url,key);setClient(sb);let active=true;
  async function init(){
   try{
    const {data:{user}}=await sb.auth.getUser();
    if(!user){if(active)setNotice("請先登入正式帳號。");return;}
    const {data:profile,error:roleError}=await sb.from("vip_profiles").select("role").eq("user_id",user.id).maybeSingle();
    if(roleError||!["admin","staff"].includes(profile?.role||"")){if(active)setNotice("僅限管理員與工作人員使用。");return;}
    const {data,error}=await sb.from("vip_members").select("id,name,vip_number,company").order("vip_number",{ascending:true}).limit(200);
    if(active){setAuthorized(true);if(error)setNotice("無法讀取會員名單："+(error.code||"權限錯誤"));else setMembers(data||[]);}
    const currentMonth=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Taipei"}).slice(0,7);const first=currentMonth+"-01";const nextMonth=new Date(currentMonth+"-15T12:00:00+08:00");nextMonth.setMonth(nextMonth.getMonth()+1);const next=nextMonth.getFullYear()+"-"+String(nextMonth.getMonth()+1).padStart(2,"0")+"-01";
    const {data:monthly,error:monthlyError}=await sb.from("vip_coaching_records").select("member_id,contact_date,invitation_sent,member_replied").gte("contact_date",first).lt("contact_date",next).limit(5000);
    if(active){if(monthlyError)setMonthError("本月追蹤統計尚無法讀取，請確認陪跑資料表已建立。");else setMonthlyRecords(monthly||[]);}
   }catch{if(active)setNotice("連線失敗。");}
   finally{if(active)setLoading(false);}
  }
  void init();return()=>{active=false;};
 },[]);
 async function chooseMember(id:string){
  setSelected(id);setRecords([]);setNotice("");
  if(!client||!id)return;
  setBusy(true);
  const {data,error}=await client.from("vip_coaching_records").select("id,member_id,contact_date,contact_method,invitation_sent,member_replied,summary,next_action,follow_up_date,created_at").eq("member_id",id).order("contact_date",{ascending:false}).limit(100);
  if(error)setNotice(["42P01","PGRST205"].includes(error.code||"")?"尚未建立陪跑資料表，請先執行 SQL。":"讀取陪跑紀錄失敗："+(error.code||"權限錯誤"));
  else setRecords(data||[]);
  setBusy(false);
 }
 async function save(e:React.FormEvent){
  e.preventDefault();if(!client||!authorized||!selected)return;
  setBusy(true);setNotice("");
  const {data,error}=await client.from("vip_coaching_records").insert({member_id:selected,contact_date:date,contact_method:method,invitation_sent:invited,member_replied:replied,summary:summary.trim(),next_action:nextAction.trim(),follow_up_date:followDate||null}).select("id,member_id,contact_date,contact_method,invitation_sent,member_replied,summary,next_action,follow_up_date,created_at").single();
  if(error)setNotice("儲存失敗："+(["42P01","PGRST205"].includes(error.code||"")?"陪跑資料表尚未建立，請先執行 SQL 設定":error.code||"權限錯誤"));
  else if(data){setRecords(old=>[data,...old]);const month=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Taipei"}).slice(0,7);if(data.contact_date.startsWith(month))setMonthlyRecords(old=>[data,...old]);setSummary("");setNextAction("");setInvited(false);setReplied(false);setFollowDate("");setNotice("陪跑紀錄已安全儲存至雲端。");}
  setBusy(false);
 }
 const memberState=(id:string)=>monthlyRecords.some(r=>r.member_id===id&&r.invitation_sent)?(monthlyRecords.some(r=>r.member_id===id&&r.member_replied)?"已回覆":"已邀約待回覆"):"尚未邀約";
 const monthlyVisible=members.filter(m=>(monthlyFilter==="全部"||memberState(m.id)===monthlyFilter)&&(m.name+" "+(m.vip_number||"")+" "+m.company).toLocaleLowerCase().includes(memberSearch.trim().toLocaleLowerCase()));
 const inputStyle={width:"100%",boxSizing:"border-box" as const,padding:10,border:"1px solid #cbd5e1",borderRadius:8,marginTop:5};
 return <main style={{maxWidth:900,margin:"32px auto",padding:20,fontFamily:"system-ui,sans-serif"}}>
  <a href="/admin/members">← 返回會員管理</a>　<a href="/admin/assignments">工作人員分派 →</a><h1>VIP 陪跑管理｜內部後台</h1>
  <p style={{background:"#fff4d6",padding:14,borderRadius:8}}>訪談摘要及追蹤內容僅供管理員與工作人員查看，不會出現在 VIP 會員前台。請勿記錄不必要的敏感個資。</p>
  {loading?<p>正在驗證權限…</p>:authorized?<>
   <section style={{border:"1px solid #cbd5e1",padding:18,borderRadius:12,marginBottom:22}}><h2>本月主動邀約追蹤</h2>
    <p>會員總數：{members.length}｜已發邀約：{members.filter(m=>monthlyRecords.some(r=>r.member_id===m.id&&r.invitation_sent)).length}｜尚未邀約：{members.filter(m=>!monthlyRecords.some(r=>r.member_id===m.id&&r.invitation_sent)).length}｜已回覆：{members.filter(m=>monthlyRecords.some(r=>r.member_id===m.id&&r.member_replied)).length}</p>
    {monthError?<p role="alert">{monthError}</p>:<><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>{["尚未邀約","已邀約待回覆","已回覆","全部"].map(k=><button key={k} type="button" onClick={()=>setMonthlyFilter(k)} aria-pressed={monthlyFilter===k} style={{padding:"9px 12px",borderRadius:8,border:"1px solid #94a3b8",background:monthlyFilter===k?"#164e63":"white",color:monthlyFilter===k?"white":"#0f172a"}}>{k}（{members.filter(m=>k==="全部"||memberState(m.id)===k).length}）</button>)}</div><label>搜尋會員<input type="search" value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} placeholder="姓名、編號或公司" style={{...inputStyle,marginBottom:12}}/></label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{monthlyVisible.map(m=><button key={m.id} type="button" onClick={()=>void chooseMember(m.id)} style={{padding:"10px 12px",border:"1px solid #94a3b8",borderRadius:8,background:selected===m.id?"#ecfeff":"#fff",color:"#0f172a",fontSize:14,textAlign:"left",cursor:"pointer",minHeight:44}}>{m.vip_number||"未編號"}｜{m.name}（{memberState(m.id)}）</button>)}{monthlyVisible.length===0&&<p>目前沒有符合條件的會員。</p>}</div></>}
    <p style={{fontSize:13,color:"#475569"}}>統計以聯繫日期所屬月份計算，已發出邀約即完成本月義務，會員回覆另外計算。</p>
   </section>
   <label>選擇 VIP 會員<select style={inputStyle} value={selected} onChange={e=>void chooseMember(e.target.value)}><option value="">請選擇會員</option>{members.map(m=><option key={m.id} value={m.id}>{m.vip_number||"未編號"}｜{m.name}{m.company?"｜"+m.company:""}</option>)}</select></label>
   {selected&&<><section style={{border:"1px solid #ddd",padding:20,borderRadius:12,marginTop:20}}><h2>新增陪跑紀錄</h2>
    <form onSubmit={save} style={{display:"grid",gap:14}}>
     <label>聯繫日期<input required type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/></label>
     <label>聯繫方式<select style={inputStyle} value={method} onChange={e=>setMethod(e.target.value)}>{["LINE","電話","視訊","實體","其他"].map(x=><option key={x}>{x}</option>)}</select></label>
     <label style={{display:"inline-flex",alignItems:"center",justifyContent:"flex-start",gap:10,cursor:"pointer",maxWidth:360}}><input type="checkbox" style={{appearance:"auto",display:"inline-block",width:18,minWidth:18,maxWidth:18,height:18,margin:0,padding:0,flex:"0 0 18px"}} checked={invited} onChange={e=>setInvited(e.target.checked)}/><span>已發出本月主動邀約</span></label>
     <label style={{display:"inline-flex",alignItems:"center",justifyContent:"flex-start",gap:10,cursor:"pointer",maxWidth:360}}><input type="checkbox" style={{appearance:"auto",display:"inline-block",width:18,minWidth:18,maxWidth:18,height:18,margin:0,padding:0,flex:"0 0 18px"}} checked={replied} onChange={e=>setReplied(e.target.checked)}/><span>會員已回覆</span></label>
     <label>訪談／聯繫摘要<textarea style={inputStyle} rows={4} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
     <label>後續待辦<textarea style={inputStyle} rows={2} value={nextAction} onChange={e=>setNextAction(e.target.value)}/></label>
     <label>下次追蹤日期<input type="date" style={inputStyle} value={followDate} onChange={e=>setFollowDate(e.target.value)}/></label>
     <button disabled={busy} style={{padding:12,background:"#164e63",color:"white",border:0,borderRadius:8}}>{busy?"處理中…":"儲存陪跑紀錄"}</button>
    </form></section>
    <h2>歷史紀錄（{records.length} 筆）</h2>
    {records.length===0?<p>目前沒有可顯示的紀錄。</p>:records.map(r=><article key={r.id} style={{borderBottom:"1px solid #ddd",padding:"14px 0"}}>
     <strong>{r.contact_date}｜{r.contact_method}</strong>
     <p>已邀約：{r.invitation_sent?"是":"否"}｜已回覆：{r.member_replied?"是":"否"}</p>
     {r.summary&&<p style={{whiteSpace:"pre-wrap"}}>摘要：{r.summary}</p>}
     {r.next_action&&<p style={{whiteSpace:"pre-wrap"}}>待辦：{r.next_action}</p>}
     {r.follow_up_date&&<p>下次追蹤：{r.follow_up_date}</p>}
    </article>)}
   </>}
  </>:<p>尚未取得正式後台權限。</p>}
  {notice&&<p role="status">{notice}</p>}
 </main>;
}

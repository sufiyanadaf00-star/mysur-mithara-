(function(){
  "use strict";
  const cfg=window.MYSURU_MITHRA_CONFIG||{}, sb=window.supabase;
  const $=id=>document.getElementById(id);
  const db=sb&&cfg.url&&cfg.key?sb.createClient(cfg.url,cfg.key):null;
  const SQL_HINT="Run supabase_security_and_admin.sql in the Supabase SQL Editor to allow this.";
  const TRASH_ICON='<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>';
  let records=new Map(), allRows=[], pendingDelete=null, starFilter="all", sortBy="rating";

  function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
  const setStatus=(el,msg,isError)=>{el.textContent=msg;el.classList.toggle("is-error",!!isError)};
  const isNetworkError=err=>/fetch|network|timed? ?out|load failed/i.test(String((err&&(err.message||err.name))||err));
  const isAuthError=err=>!!err&&(err.code==="PGRST301"||err.status===401||/jwt|expired/i.test(err.message||""));
  const isPermissionError=err=>!!err&&(err.code==="42501"||/permission denied|row-level security/i.test(err.message||""));
  const actionError=(err,fallback)=>isNetworkError(err)?"Couldn't reach the server. Check your connection and try again.":isPermissionError(err)?`This account isn't allowed to do that yet. ${SQL_HINT}`:(err&&err.message)||fallback;

  if(!db){
    setStatus($("loginStatus"),sb?"The dashboard is not configured yet. Add the Supabase details in config.js.":"Couldn't load the login service. Check your connection and reload the page.",true);
    $("loginBtn").disabled=true;
    return;
  }

  const openDialog=d=>{if(typeof d.showModal==="function"){if(!d.open)d.showModal()}else d.setAttribute("open","")};
  const closeDialog=d=>{if(typeof d.close==="function"){if(d.open)d.close()}else d.removeAttribute("open")};
  document.querySelectorAll("dialog [data-close]").forEach(b=>b.addEventListener("click",()=>closeDialog(b.closest("dialog"))));

  function showLogin(msg){
    $("dash").classList.add("hidden");$("loginCard").classList.remove("hidden");
    if(msg)setStatus($("loginStatus"),msg,true);
  }
  async function handleSessionError(err){
    if(!isAuthError(err))return false;
    await db.auth.signOut().catch(()=>{});
    document.querySelectorAll("dialog").forEach(closeDialog);
    showLogin("Your session has expired. Please log in again.");
    return true;
  }

  function render(rows){
    allRows=rows;records=new Map(rows.map(x=>[String(x.id),x]));
    const av=rows.filter(x=>x.dish==="Mysuru Avalakki"), rm=rows.filter(x=>x.dish==="Rose Mithaas");
    $("stats").innerHTML=`<div class="stat">TOTAL<b>${rows.length}</b></div><div class="stat">AVALAKKI<b>${av.length}</b></div><div class="stat">ROSE MITHAAS<b>${rm.length}</b></div>`;
    renderTable();
  }
  // Star filter + sort: "Highest rated first" puts 5-star feedback on top (newest first within a rating).
  function renderTable(){
    document.querySelectorAll("#adminStarFilters [data-stars]").forEach(b=>{
      const v=b.dataset.stars, n=v==="all"?allRows.length:allRows.filter(x=>String(x.rating)===v).length;
      b.innerHTML=`${v==="all"?"All":`${v} ★`} <span class="chip-count">${n}</span>`;
      b.setAttribute("aria-pressed",String(v===starFilter));
    });
    const byDate=(a,b)=>new Date(b.created_at)-new Date(a.created_at);
    const rows=allRows.filter(x=>starFilter==="all"||String(x.rating)===starFilter)
      .sort(sortBy==="rating"?(a,b)=>Number(b.rating)-Number(a.rating)||byDate(a,b):byDate);
    const empty=allRows.length?`No ${starFilter}-star feedback yet.`:"No feedback yet.";
    $("rows").innerHTML=rows.map(x=>`<tr data-id="${esc(x.id)}"><td>${new Date(x.created_at).toLocaleDateString()}</td><td>${esc(x.name)}</td><td>${esc(x.dish)}</td><td aria-label="${Number(x.rating)} out of 5">${"★".repeat(Number(x.rating))}</td><td class="review-cell">${esc(x.review||"")}</td><td class="row-actions"><button class="row-delete" type="button" data-delete="${esc(x.id)}" aria-label="Delete feedback from ${esc(x.name)}">${TRASH_ICON}DELETE</button></td></tr>`).join("")||`<tr><td colspan="6">${esc(empty)}</td></tr>`;
  }
  $("adminStarFilters").addEventListener("click",e=>{const b=e.target.closest("[data-stars]");if(b){starFilter=b.dataset.stars;renderTable()}});
  $("adminSort").addEventListener("change",e=>{sortBy=e.target.value;renderTable()});

  // message: what to show once the list has reloaded (defaults to the update time).
  async function load(message){
    const btn=$("refreshBtn");btn.disabled=true;setStatus($("dashStatus"),"Loading feedback…");
    try{
      const {data,error}=await db.from("feedback").select("id,created_at,name,dish,rating,review").order("created_at",{ascending:false});
      if(error)throw error;
      render(data||[]);
      setStatus($("dashStatus"),message||`Updated ${new Date().toLocaleTimeString()}`);
    }catch(err){
      console.error(err);
      if(await handleSessionError(err))return;
      $("rows").innerHTML=`<tr><td colspan="6">${esc(isNetworkError(err)?"Couldn't reach the server. Check your connection and press Refresh.":(err.message||"Could not load feedback."))}</td></tr>`;
      setStatus($("dashStatus"),"Could not load feedback.",true);
    }finally{btn.disabled=false}
  }

  // Deleting needs supabase_security_and_admin.sql to have been run AND this account to be on its admin
  // list. Without either, the database quietly deletes 0 rows, so say which one is missing up front.
  async function checkAccess(email){
    const {data,error}=await db.rpc("is_team_admin");
    const msg=error?(error.code==="PGRST202"?`Deleting is switched off because the database's admin rules haven't been set up. ${SQL_HINT}`:"")
      :data===true?"":`${email} is not on the team admin list, so it can't see or delete feedback. Add it to is_team_admin() in supabase_security_and_admin.sql and run the file again.`;
    $("accessWarning").textContent=msg;$("accessWarning").classList.toggle("hidden",!msg);
  }

  async function show(){
    const {data}=await db.auth.getSession();
    if(data.session){$("loginCard").classList.add("hidden");$("dash").classList.remove("hidden");await Promise.all([load(),checkAccess(data.session.user.email)])}
  }

  // DELETE: confirm first, then check rows really went (row security turns a blocked delete into "0 rows").
  $("rows").addEventListener("click",e=>{
    const btn=e.target.closest("[data-delete]"); if(!btn)return;
    const rec=records.get(btn.dataset.delete); if(!rec)return;
    pendingDelete=rec;
    $("deleteSummary").innerHTML=`<strong>${esc(rec.name)}</strong> · ${esc(rec.dish)} · ${"★".repeat(Number(rec.rating))}<br>${rec.review?`“${esc(rec.review)}”`:"<em>No written review</em>"}`;
    setStatus($("deleteStatus"),"");$("deleteConfirm").disabled=false;
    openDialog($("deleteDialog"));
  });
  $("deleteConfirm").addEventListener("click",async()=>{
    if(!pendingDelete)return;
    const rec=pendingDelete, btn=$("deleteConfirm");
    btn.disabled=true;setStatus($("deleteStatus"),"Deleting…");
    try{
      const {data,error}=await db.from("feedback").delete().eq("id",rec.id).select("id");
      if(error)throw error;
      if(!data||!data.length){setStatus($("deleteStatus"),`Nothing was deleted. ${SQL_HINT}`,true);btn.disabled=false;return}
      pendingDelete=null;closeDialog($("deleteDialog"));
      await load(`Deleted the feedback from ${rec.name}.`);
    }catch(err){
      console.error(err);
      if(await handleSessionError(err))return;
      setStatus($("deleteStatus"),actionError(err,"Could not delete. Please try again."),true);btn.disabled=false;
    }
  });

  $("loginForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const email=$("email").value.trim(), password=$("password").value;
    if(!email||!password){setStatus($("loginStatus"),"Enter your team email and password.",true);(email?$("password"):$("email")).focus();return}
    const btn=$("loginBtn");btn.disabled=true;setStatus($("loginStatus"),"Signing in…");
    try{
      const {error}=await db.auth.signInWithPassword({email,password});
      if(error)throw error;
      setStatus($("loginStatus"),"Logged in!");$("password").value="";
      await show();
    }catch(err){
      setStatus($("loginStatus"),isNetworkError(err)?"Couldn't reach the server. Check your connection and try again.":(err.message||"Login failed."),true);
    }finally{btn.disabled=false}
  });
  $("refreshBtn").addEventListener("click",()=>load());
  $("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut().catch(()=>{});location.reload()});
  db.auth.onAuthStateChange(event=>{if(event==="SIGNED_OUT")showLogin()});
  show().catch(err=>{console.error(err);setStatus($("loginStatus"),"Couldn't check your session. Please log in.",true)});
})();

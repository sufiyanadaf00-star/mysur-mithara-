/* MYSURU MITHRA — CLEAN FINAL SCRIPT */
(function(){
  "use strict";
  const cfg=window.MYSURU_MITHRA_CONFIG||{};
  const sb=window.supabase;
  const configured=!!(sb && /^https?:\/\//.test(cfg.url||"") && cfg.key && !String(cfg.key).includes("PASTE_YOUR"));
  // The public pages always talk to Supabase as an anonymous visitor. Otherwise a team member who
  // logged in to admin.html in the same browser would rate and read as the admin account, which
  // the database's rules treat differently (ratings were rejected and reviews failed to load).
  const db=configured?sb.createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:"mm-public-visitor"}}):null;

  const $=id=>document.getElementById(id);
  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
  const scrollBehavior=()=>reduceMotion.matches?"auto":"smooth";
  // sessionStorage can throw in some private browsing modes; never let that break the page.
  const store={
    get(k){try{return sessionStorage.getItem(k)||""}catch(e){return ""}},
    set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}}
  };
  const isNetworkError=err=>/fetch|network|abort|timed? ?out|load failed/i.test(String((err&&(err.message||err.details||err.name))||err));
  const DISH_IMAGES={"Mysuru Avalakki":"avalaki.webp","Rose Mithaas":"rose.webp"};
  const RATING_WORDS=["","Poor","Could be better","Good","Very Good","Excellent!"];
  let currentDish="", selectedRating=0, openCount=0;

  // DIALOGS: native <dialog> + showModal() traps focus, closes on Esc and makes the page behind inert.
  const openDialog=d=>{if(!d)return;if(typeof d.showModal==="function"){if(!d.open)d.showModal()}else d.setAttribute("open","")};
  const closeDialog=d=>{if(!d)return;if(typeof d.close==="function"){if(d.open)d.close()}else d.removeAttribute("open")};
  // Light dismiss (tap the backdrop) for browsers without <dialog closedby="any">, e.g. Safari.
  if(!(window.HTMLDialogElement&&"closedBy" in HTMLDialogElement.prototype)){
    document.querySelectorAll("dialog[closedby='any']").forEach(d=>d.addEventListener("click",e=>{
      if(e.target!==d)return;
      const r=d.getBoundingClientRect();
      if(r.top<=e.clientY&&e.clientY<=r.bottom&&r.left<=e.clientX&&e.clientX<=r.right)return;
      closeDialog(d);
    }));
  }

  const setRatingStatus=(msg,type)=>{
    const el=$("ratingStatus"); if(!el)return;
    el.textContent=msg;
    el.classList.toggle("is-error",type==="error");
    el.classList.toggle("is-success",type==="success");
  };

  window.openRating=function(dish){
    currentDish=dish; selectedRating=0; openCount++;
    $("ratingDishName").textContent=dish;
    $("ratingDishImage").src=DISH_IMAGES[dish]||"avalaki.webp";
    $("ratingDishImage").alt=dish;
    $("selectedRating").textContent="Select your rating";
    setRatingStatus("");
    $("reviewText").value="";
    const nameInput=$("feedbackName");
    nameInput.value=store.get("mm_feedback_name");
    nameInput.removeAttribute("aria-invalid");
    document.querySelectorAll(".star-rating button").forEach(s=>{s.classList.remove("selected");s.setAttribute("aria-pressed","false")});
    $("submitRatingButton").disabled=false;
    openDialog($("ratingModal"));
    // Returning raters already have a saved name, so start them on the stars instead.
    (nameInput.value?document.querySelector(".star-rating button"):nameInput)?.focus();
  };
  window.closeRating=function(){ closeDialog($("ratingModal")); };
  window.selectStar=function(n){
    selectedRating=n;
    document.querySelectorAll(".star-rating button").forEach((s,i)=>{s.classList.toggle("selected",i<n);s.setAttribute("aria-pressed",String(i===n-1))});
    $("selectedRating").textContent=RATING_WORDS[n];
    if($("ratingStatus")?.classList.contains("is-error"))setRatingStatus("");
  };
  const saveErrorMessage=err=>{
    if(navigator.onLine===false)return "You're offline. Connect to the internet and try again.";
    if(isNetworkError(err))return "We couldn't reach the feedback service. Please check your connection and try again.";
    return "Could not save. Please try again.";
  };
  window.submitRating=async function(){
    const nameInput=$("feedbackName"), name=nameInput.value.trim(), review=$("reviewText").value.trim();
    if(!name){setRatingStatus("Please enter your name.","error");nameInput.setAttribute("aria-invalid","true");nameInput.focus();return}
    nameInput.removeAttribute("aria-invalid");
    if(!selectedRating){setRatingStatus("Please select a star rating.","error");document.querySelector(".star-rating button")?.focus();return}
    if(!db){setRatingStatus(sb?"Backend is not connected yet. Add your Supabase details in config.js.":"Couldn't load the feedback service. Check your connection and reload the page.","error");return}
    if(navigator.onLine===false){setRatingStatus(saveErrorMessage(),"error");return}
    const btn=$("submitRatingButton"), token=openCount;
    btn.disabled=true; btn.setAttribute("aria-busy","true"); setRatingStatus("Saving your feedback…");
    // Give up after 15 seconds on a stalled connection instead of spinning forever.
    const ctrl=typeof AbortController==="function"?new AbortController():null;
    const timer=ctrl?setTimeout(()=>ctrl.abort(),15000):0;
    let error=null;
    try{
      let query=db.from("feedback").insert({name,dish:currentDish,rating:selectedRating,review});
      if(ctrl&&typeof query.abortSignal==="function")query=query.abortSignal(ctrl.signal);
      ({error}=await query);
    }catch(err){error=err}
    clearTimeout(timer); btn.removeAttribute("aria-busy");
    if(error){console.error(error);setRatingStatus(saveErrorMessage(error),"error");btn.disabled=false;return}
    store.set("mm_feedback_name",name);
    setRatingStatus("Saved! Thank you ❤️","success");
    await loadSummary({quiet:true});
    setTimeout(()=>{if(token===openCount)window.closeRating();btn.disabled=false;},900);
  };
  $("ratingForm")?.addEventListener("submit",e=>{e.preventDefault();window.submitRating()});

  // LIVE RATING SUMMARY: loading, empty, error and success states all say what is really happening.
  const SUMMARY_CARDS=[["avalakki","Mysuru Avalakki"],["mithaas","Rose Mithaas"]];
  const setSummaryCard=(key,average,text,state)=>{
    const avg=$(key+"Average"), count=$(key+"Count"); if(!avg||!count)return;
    avg.textContent=average; avg.classList.toggle("is-empty",average==="–");
    count.textContent=text; count.dataset.state=state||"";
    // The gold stars fill to the real average instead of always showing five.
    const meter=avg.closest(".rating-card")?.querySelector(".star-meter");
    if(meter)meter.style.setProperty("--fill",`${average==="–"?0:Math.min(100,Number(average)/5*100)}%`);
  };
  async function loadSummary(opts){
    if(!$("avalakkiAverage"))return;
    const retry=$("ratingsRetry");
    if(!db){SUMMARY_CARDS.forEach(([k])=>setSummaryCard(k,"–","Live ratings unavailable","error"));return}
    if(!(opts&&opts.quiet))SUMMARY_CARDS.forEach(([k])=>setSummaryCard(k,"–","Loading ratings…","loading"));
    if(retry)retry.hidden=true;
    try{
      const {data,error}=await db.rpc("get_public_rating_summary");
      if(error)throw error;
      const rows=Array.isArray(data)?data:[];
      SUMMARY_CARDS.forEach(([k,dish])=>{
        const r=rows.find(x=>x.dish===dish), n=Number(r&&r.rating_count)||0;
        setSummaryCard(k,n?Number(r.average_rating).toFixed(1):"–",n?`${n} rating${n===1?"":"s"}`:"No ratings yet");
      });
    }catch(err){
      console.error(err);
      SUMMARY_CARDS.forEach(([k])=>setSummaryCard(k,"–",isNetworkError(err)?"Couldn't reach the server":"Ratings unavailable right now","error"));
      if(retry)retry.hidden=false;
    }
  }
  $("ratingsRetry")?.addEventListener("click",()=>loadSummary());

  // STICKERS: 20 WhatsApp-ready stickers (512x512 transparent WebP), an album saved in this browser, and sharing.
  const STICKERS=[["sticker1","Chill Kro Yaar"],["sticker2","Sorry"],["sticker3","Sweet Memories"],["sticker4","Mysuru Mithra"],["sticker5","Mithra Vibes"],["sticker6_heritage-seal","Heritage Seal"],["sticker7_sweet-heart","Sweet Heart"],["sticker8_royal-badge","Royal Badge"],["sticker9_foodie","Foodie"],["sticker10_rose-love","Rose Love"],["sticker11_avalakki-love","Avalakki Love"],["sticker12_mithra-friends","Mithra Friends"],["sticker13_namaste","Namaste"],["sticker14_gold-star","Gold Star"],["sticker15_festival","Festival"],["sticker16_classic","Classic"],["sticker17_garden","Garden"],["sticker18_royal-rose","Royal Rose"],["sticker19_heritage-love","Heritage Love"],["sticker20_finale","Finale"]].map(([id,name])=>({id,name,src:`stickers/whatsapp/${id}.webp`}));
  const stickerById=id=>STICKERS.find(s=>s.id===id);
  const album={
    get(){try{const v=JSON.parse(localStorage.getItem("mm_sticker_album")||"[]");return Array.isArray(v)?v.filter(stickerById):[]}catch(e){return []}},
    add(ids){const set=new Set(album.get());ids.forEach(id=>set.add(id));try{localStorage.setItem("mm_sticker_album",JSON.stringify([...set]))}catch(e){}return set}
  };
  // Files are fetched ahead of time so the share sheet opens inside the tap (browsers require that).
  const readyFiles=new Map(), pendingFiles=new Map();
  const prefetchSticker=s=>{
    if(!pendingFiles.has(s.id))pendingFiles.set(s.id,fetch(s.src).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.blob()}).then(b=>{const f=new File([b],`mysuru-mithra-${s.id}.webp`,{type:"image/webp"});readyFiles.set(s.id,f);return f}).catch(()=>{pendingFiles.delete(s.id);return null}));
    return pendingFiles.get(s.id);
  };
  const canShareFiles=(()=>{try{return !!(navigator.share&&navigator.canShare&&navigator.canShare({files:[new File([""],"check.webp",{type:"image/webp"})]}))}catch(e){return false}})();
  async function shareStickers(list,statusEl){
    try{
      const files=list.every(s=>readyFiles.has(s.id))?list.map(s=>readyFiles.get(s.id)):await Promise.all(list.map(prefetchSticker));
      if(files.some(f=>!f))throw new Error("Sticker download failed");
      await navigator.share({files,title:"Mysuru Mithra stickers"});
      if(statusEl)statusEl.textContent="";
    }catch(err){
      if(err&&err.name==="AbortError")return;
      console.error(err);
      if(statusEl)statusEl.textContent="Sharing didn't work on this device. Use Download, then send the file in WhatsApp.";
    }
  }
  const downloadSticker=s=>{const a=document.createElement("a");a.href=s.src;a.download=`mysuru-mithra-${s.id}.webp`;document.body.appendChild(a);a.click();a.remove()};

  const albumGrid=$("albumGrid");
  const renderAlbum=(fresh=[])=>{
    if(!albumGrid)return;
    const owned=new Set(album.get());
    $("albumCount").textContent=String(owned.size);
    $("albumBar").style.width=`${owned.size/STICKERS.length*100}%`;
    albumGrid.innerHTML=STICKERS.map(s=>owned.has(s.id)
      ?`<button type="button" class="album-slot is-owned${fresh.includes(s.id)?" is-fresh":""}" data-sticker="${s.id}" aria-label="${escapeHtml(s.name)} sticker: open to send on WhatsApp"><img src="${s.src}" alt="" width="512" height="512" loading="lazy"></button>`
      :`<span class="album-slot is-locked" role="img" aria-label="Locked sticker"><span aria-hidden="true">?</span></span>`).join("");
  };
  const viewer=$("stickerViewer"); let viewing=null;
  const openViewer=s=>{
    if(!viewer||!s)return;
    viewing=s;prefetchSticker(s);
    $("stickerViewerImg").src=s.src;$("stickerViewerImg").alt=`${s.name} sticker`;
    $("stickerViewerTitle").textContent=s.name;
    const dl=$("stickerViewerDownload");dl.href=s.src;dl.setAttribute("download",`mysuru-mithra-${s.id}.webp`);
    $("viewerShareStatus").textContent="";$("stickerViewerShare").hidden=!canShareFiles;
    openDialog(viewer);
  };
  albumGrid?.addEventListener("click",e=>{const b=e.target.closest("[data-sticker]");if(b)openViewer(stickerById(b.dataset.sticker))});
  viewer?.querySelector("[data-close-viewer]")?.addEventListener("click",()=>closeDialog(viewer));
  $("stickerViewerShare")?.addEventListener("click",()=>{if(viewing)shareStickers([viewing],$("viewerShareStatus"))});
  renderAlbum();

  // STUDENT REVIEWS: the public list from get_public_reviews() (first names only), highest stars first.
  const reviewsDialog=$("reviewsDialog");
  if(reviewsDialog){
    const RATING_STICKERS={5:"sticker14_gold-star",4:"sticker7_sweet-heart",3:"sticker13_namaste",2:"sticker2",1:"sticker2"};
    const grid=$("reviewsGrid"), countEl=$("reviewsCount"), summaryEl=$("reviewsSummary");
    let reviews=[], starFilter="all", dishFilter="all", loading=false;
    const dishKey=d=>d==="Rose Mithaas"?"rose":"avalakki";
    const reviewCard=(r,i)=>{
      const n=Math.max(1,Math.min(5,Math.round(Number(r.rating))||1)), name=r.first_name||"Student";
      return `<article class="review-card is-${dishKey(r.dish)}" style="--i:${Math.min(i,8)}">
        <img class="review-stamp" src="stickers/whatsapp/${RATING_STICKERS[n]}.webp" alt="" width="512" height="512" loading="lazy">
        <div class="review-head"><span class="review-avatar" aria-hidden="true">${escapeHtml(name.charAt(0).toUpperCase())}</span><div><h3 class="review-name">${escapeHtml(name)}</h3></div></div>
        <p class="review-stars" role="img" aria-label="${n} out of 5 stars"><span>${"★".repeat(n)}</span><span class="off">${"★".repeat(5-n)}</span></p>
        <p class="review-dish"><img src="${DISH_IMAGES[r.dish]||"avalaki.webp"}" alt="" width="28" height="28" loading="lazy">${escapeHtml(r.dish)}</p>
        ${r.review?`<blockquote class="review-text">${escapeHtml(r.review)}</blockquote>`:`<p class="review-text is-empty">Rated without a written review.</p>`}
      </article>`;
    };
    const emptyState=(sticker,title,text,extra)=>`<div class="reviews-empty"><img src="stickers/whatsapp/${sticker}.webp" alt="" width="512" height="512"><h3>${title}</h3><p>${text}</p>${extra||""}</div>`;
    const renderSummary=()=>{
      summaryEl.innerHTML=["Mysuru Avalakki","Rose Mithaas"].map(d=>{
        const rs=reviews.filter(r=>r.dish===d), avg=rs.length?(rs.reduce((a,r)=>a+Number(r.rating),0)/rs.length).toFixed(1):"–";
        return `<div class="summary-chip is-${dishKey(d)}"><img src="${DISH_IMAGES[d]}" alt="" width="44" height="44"><div><b>${avg}</b><span class="summary-star" aria-hidden="true">★</span><small>${d} · ${rs.length} review${rs.length===1?"":"s"}</small></div></div>`;
      }).join("");
    };
    const renderChips=()=>{
      document.querySelectorAll("#starFilters [data-stars]").forEach(b=>{
        const v=b.dataset.stars, n=v==="all"?reviews.length:reviews.filter(r=>String(r.rating)===v).length;
        b.innerHTML=`${v==="all"?"All":`${v} ★`} <span class="chip-count">${n}</span>`;
        b.setAttribute("aria-pressed",String(v===starFilter));
      });
      document.querySelectorAll("#dishFilters [data-dish]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.dish===dishFilter)));
    };
    const render=()=>{
      renderChips();renderSummary();
      // Highest stars first; newest first among equal ratings.
      const list=reviews.filter(r=>(starFilter==="all"||String(r.rating)===starFilter)&&(dishFilter==="all"||r.dish===dishFilter))
        .sort((a,b)=>Number(b.rating)-Number(a.rating)||new Date(b.created_at)-new Date(a.created_at));
      countEl.textContent=reviews.length?`Showing ${list.length} of ${reviews.length} review${reviews.length===1?"":"s"} · highest rated first`:"";
      if(!reviews.length){grid.innerHTML=emptyState("sticker1","No reviews yet","Be the first to rate a dish!",`<button type="button" class="hero-cta" data-rate-now>RATE A DISH <span aria-hidden="true">→</span></button>`);return}
      if(!list.length){grid.innerHTML=emptyState("sticker13_namaste","No reviews match","Try another star rating or dish.");return}
      grid.innerHTML=list.map(reviewCard).join("");
    };
    async function loadReviews(){
      if(loading)return;loading=true;
      grid.setAttribute("aria-busy","true");countEl.textContent="Loading reviews…";
      grid.innerHTML=Array.from({length:3},()=>`<div class="review-card is-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>`).join("");
      try{
        if(!db)throw new Error(sb?"Feedback service not configured":"Failed to fetch");
        const {data,error}=await db.rpc("get_public_reviews");
        let rows=error?null:(Array.isArray(data)?data:[]);
        // Until supabase_security_and_admin.sql has been run, the function does not exist yet.
        // Fall back to reading the table (only possible while it is still public) and show first names only.
        if(!rows||!rows.length){
          const direct=await db.from("feedback").select("name,dish,rating,review,created_at").order("rating",{ascending:false}).order("created_at",{ascending:false}).limit(300);
          if(!direct.error&&Array.isArray(direct.data))rows=direct.data.map(r=>({first_name:String(r.name||"").trim().split(/\s+/)[0],dish:r.dish,rating:r.rating,review:r.review||"",created_at:r.created_at}));
        }
        if(!rows)throw error;
        reviews=rows.filter(r=>r&&r.dish);
        render();
      }catch(err){
        console.error(err);reviews=[];renderChips();summaryEl.innerHTML="";countEl.textContent="";
        grid.innerHTML=emptyState("sticker2",isNetworkError(err)?"Couldn't reach the server":"Reviews aren't available right now","Please try again in a moment.",`<button type="button" class="ratings-retry is-light" data-retry-reviews>TRY AGAIN</button>`);
      }finally{loading=false;grid.removeAttribute("aria-busy")}
    }
    $("starFilters").addEventListener("click",e=>{const b=e.target.closest("[data-stars]");if(b){starFilter=b.dataset.stars;render()}});
    $("dishFilters").addEventListener("click",e=>{const b=e.target.closest("[data-dish]");if(b){dishFilter=b.dataset.dish;render()}});
    grid.addEventListener("click",e=>{
      if(e.target.closest("[data-retry-reviews]"))loadReviews();
      if(e.target.closest("[data-rate-now]")){closeDialog(reviewsDialog);$("dishes")?.scrollIntoView({behavior:scrollBehavior()})}
    });
    window.openReviews=function(){openDialog(reviewsDialog);reviewsDialog.querySelector(".reviews-body").scrollTop=0;loadReviews()};
    window.closeReviews=function(){closeDialog(reviewsDialog)};
  }

  // TEAM SLIDER
  const slider=document.querySelector(".team-slider"), slides=document.querySelectorAll(".team-slide"), prev=$("teamPrev"), next=$("teamNext"), counter=$("teamCounter"), dotsBox=$("teamDots");
  if(slider&&slides.length&&prev&&next){
    let current=0, frame=0, dots=[];
    slides.forEach((s,i)=>{s.setAttribute("role","group");s.setAttribute("aria-roledescription","slide");s.setAttribute("aria-label",`${i+1} of ${slides.length}`)});
    const updateCounter=()=>{
      if(counter){counter.hidden=false;counter.textContent=`${current+1} / ${slides.length}`}
      dots.forEach((d,i)=>d.setAttribute("aria-current",String(i===current)));
    };
    if(dotsBox){
      dots=[...slides].map((s,i)=>{
        const d=document.createElement("button");
        d.type="button";d.className="team-dot";
        d.setAttribute("aria-label",`Show ${s.querySelector("h2")?.textContent||`member ${i+1}`} (${i+1} of ${slides.length})`);
        d.addEventListener("click",()=>show(i));
        dotsBox.appendChild(d);return d;
      });
    }
    const show=i=>{current=(i+slides.length)%slides.length;slider.scrollTo({left:slides[current].offsetLeft,behavior:scrollBehavior()});updateCounter()};
    prev.addEventListener("click",()=>show(current-1)); next.addEventListener("click",()=>show(current+1));
    slider.addEventListener("keydown",e=>{
      if(e.key==="ArrowLeft"){e.preventDefault();show(current-1)}
      else if(e.key==="ArrowRight"){e.preventDefault();show(current+1)}
    });
    slider.addEventListener("scroll",()=>{
      if(frame)return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        let best=0,dist=Infinity;slides.forEach((s,i)=>{const d=Math.abs(slider.scrollLeft-s.offsetLeft);if(d<dist){dist=d;best=i}});
        if(best!==current){current=best;updateCounter()}
      });
    },{passive:true});
    updateCounter();
  }

  // MYSTERY STICKER GAMES: Sweet Catch, Cup Shuffle, Mystery Match and Find the Odd One. Two chances per round.
  const gameArea=$("mysteryGameArea"), gameGrid=$("gameGrid"), gameStatus=$("gameStatus"), winBox=$("stickerWin"), winner=$("winnerStickers"), startButtons=[...document.querySelectorAll("[data-start-game]")];
  if(gameArea&&gameGrid&&gameStatus&&winBox){
    let player=store.get("mm_player_name"), chance=0, gameLocked=false, gameType=1, timers=[], cleanups=[], lastRewards=[];
    const GAME_HINTS={1:"Watch the cups carefully",2:"Memorise the stickers",3:"Spot the different tile",4:"Catch the sweets"};
    // Every timer goes through later(), and animation loops register a cleanup,
    // so switching games cancels the old round completely.
    const later=(fn,ms)=>{const id=setTimeout(fn,ms);timers.push(id);return id};
    const stopTimers=()=>{timers.forEach(clearTimeout);timers=[];cleanups.splice(0).forEach(fn=>fn());gameGrid.querySelector(".round-timer")?.classList.add("is-stopped")};
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
    const setStatus=(title,detail)=>{gameStatus.innerHTML=`<strong>${title}</strong>${detail?`<br><small>${detail}</small>`:""}`};
    const markLaunchers=()=>startButtons.forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.startGame)===gameType)));

    const showName=()=>{
      stopTimers(); gameArea.hidden=false; winBox.hidden=true; gameStatus.innerHTML="";
      gameGrid.innerHTML=`<form class="name-screen" id="nameForm" novalidate><h3>🎁 Ready to Play?</h3><p>Enter your full name once. You will get two chances.</p><label class="sr-only" for="playerNameInput">Your full name</label><input id="playerNameInput" type="text" maxlength="60" placeholder="Enter your full name" autocomplete="name" required><p class="name-error" id="nameError" role="alert"></p><button id="startMysteryButton" class="start-mystery-button" type="submit">START MYSTERY →</button></form>`;
      const input=$("playerNameInput"); input.value=player;
      input.addEventListener("input",()=>{input.removeAttribute("aria-invalid");$("nameError").textContent=""});
      $("nameForm").addEventListener("submit",e=>{
        e.preventDefault();
        const n=input.value.trim();
        if(!n){$("nameError").textContent="Please enter your full name.";input.setAttribute("aria-invalid","true");input.focus();return}
        player=n;store.set("mm_player_name",n);chance=0;startNextGame();
      });
      input.focus({preventScroll:true});
    };
    const startNextGame=()=>{
      stopTimers();
      if(chance>=2){finishNoWin();return}
      chance++;gameLocked=false;gameArea.hidden=false;winBox.hidden=true;gameGrid.innerHTML="";
      setStatus(`CHANCE ${chance} OF 2`,`${escapeHtml(player)} • ${GAME_HINTS[gameType]}`);
      later(GAMES[gameType]||cupGame,250);
    };
    const finishNoWin=()=>{
      stopTimers();gameArea.hidden=false;winBox.hidden=true;gameStatus.innerHTML="";
      gameGrid.innerHTML=`<div class="game-finished"><h3>Both chances used ❤️</h3><p>Thank you for playing, ${escapeHtml(player)}!</p><button class="play-mystery-again" id="restartGameSession" type="button">PLAY AGAIN</button></div>`;
      $("restartGameSession").onclick=()=>{chance=0;startNextGame()};
    };
    const won=detail=>{
      stopTimers();gameLocked=true;
      setStatus(`🎉 CONGRATULATIONS, ${escapeHtml(player)}!`,detail);
      // Stickers the player doesn't have yet come first, so every win grows the album until all 20 are collected.
      const owned=new Set(album.get());
      const rewards=[...shuffle(STICKERS.filter(s=>!owned.has(s.id))),...shuffle(STICKERS.filter(s=>owned.has(s.id)))].slice(0,3);
      const fresh=rewards.filter(s=>!owned.has(s.id)).map(s=>s.id);
      const total=album.add(rewards.map(s=>s.id)).size;
      lastRewards=rewards;rewards.forEach(prefetchSticker);
      winner.innerHTML=rewards.map((s,i)=>`<div class="winner-sticker" style="--i:${i}">${fresh.includes(s.id)?'<i class="sticker-new">NEW</i>':""}<button type="button" class="winner-open" data-sticker="${s.id}" aria-label="Open the ${escapeHtml(s.name)} sticker"><img src="${s.src}" alt="" width="512" height="512"></button><b class="winner-name">${escapeHtml(s.name)}</b><a href="${s.src}" download="mysuru-mithra-${s.id}.webp" aria-label="Download the ${escapeHtml(s.name)} sticker">DOWNLOAD</a></div>`).join("");
      $("shareAllStickers").hidden=!canShareFiles;
      $("winShareStatus").textContent=total===STICKERS.length?"🏆 Album complete! You've collected all 20 stickers.":`Album: ${total} of ${STICKERS.length} stickers collected.`;
      renderAlbum(fresh);
      winBox.hidden=false;winBox.scrollIntoView({behavior:scrollBehavior(),block:"center"});
      celebrate();
    };
    winner.addEventListener("click",e=>{const b=e.target.closest("[data-sticker]");if(b)openViewer(stickerById(b.dataset.sticker))});
    $("shareAllStickers")?.addEventListener("click",()=>shareStickers(lastRewards,$("winShareStatus")));
    $("downloadAllStickers")?.addEventListener("click",()=>lastRewards.forEach((s,i)=>setTimeout(()=>downloadSticker(s),i*300)));
    // A short confetti burst on a win; skipped entirely for reduced motion.
    const celebrate=()=>{
      if(reduceMotion.matches)return;
      winBox.querySelector(".confetti")?.remove();
      const burst=document.createElement("div"), colors=["#e6b940","#b33140","#587529","#f2bd32","#d98aa0","#713b20"];
      burst.className="confetti";burst.setAttribute("aria-hidden","true");
      for(let i=0;i<22;i++){
        const piece=document.createElement("span");
        piece.style.setProperty("--x",`${Math.round(Math.random()*100)}%`);
        piece.style.setProperty("--delay",`${(Math.random()*.5).toFixed(2)}s`);
        piece.style.setProperty("--spin",`${Math.round(360+Math.random()*540)}deg`);
        piece.style.setProperty("--drift",`${Math.round(Math.random()*80-40)}px`);
        piece.style.setProperty("--c",colors[i%colors.length]);
        burst.appendChild(piece);
      }
      winBox.appendChild(burst);
      setTimeout(()=>burst.remove(),2800);
    };
    const lose=title=>{
      stopTimers();gameLocked=true;
      setStatus(title,chance<2?"One chance used. Get ready for your second chance!":"That was your last chance.");
      later(startNextGame,1400);
    };
    const again=$("playMysteryAgain");
    if(again)again.onclick=()=>{chance=0;gameLocked=false;winBox.hidden=true;gameGrid.innerHTML="";startNextGame()};

    function cupGame(){
      gameGrid.innerHTML=`<div class="cup-game">
        <p class="cup-message"><strong>WATCH CAREFULLY!</strong><br>Remember which cup has the ⭐ STAR.</p>
        <div class="cups" id="cupRow">${[0,1,2].map(i=>`<button class="cup" data-cup="${i}" type="button" aria-label="Cup ${i+1} of 3" disabled><span class="cup-shell" aria-hidden="true"></span></button>`).join("")}</div>
        <p id="cupInstruction" class="cup-message">The ⭐ is under one cup. Watch it!</p>
      </div>`;

      const cups=[...gameGrid.querySelectorAll(".cup")], row=$("cupRow"), instruction=$("cupInstruction");
      // slotOf[cup] is where that cup currently stands. The star never leaves its cup.
      const slotOf=[0,1,2], starCup=Math.floor(Math.random()*3);
      let swaps=0;
      const place=()=>cups.forEach((c,id)=>c.style.setProperty("--shift",slotOf[id]-id));
      // A cup lifts to show what is underneath; the star only exists in the DOM while it is visible.
      const reveal=(c,withStar)=>{
        if(withStar&&!c.querySelector(".cup-prize")){const p=document.createElement("span");p.className="cup-prize";p.setAttribute("aria-hidden","true");p.textContent="⭐";c.prepend(p)}
        c.classList.add("is-lifted");
      };

      // FIRST SHOW THE TARGET: the star is clearly visible before the cups cover it.
      reveal(cups[starCup],true);
      setStatus("⭐ REMEMBER THE STAR",`${escapeHtml(player)} • Chance ${chance} of 2`);

      const step=()=>{
        const a=Math.floor(Math.random()*2), cupA=slotOf.indexOf(a), cupB=slotOf.indexOf(a+1);
        slotOf[cupA]=a+1; slotOf[cupB]=a; place(); swaps++;
        if(swaps<7){later(step,700);return}
        later(()=>{
          // Put the cups back in DOM order where they now stand, so Tab moves left to right.
          row.classList.add("is-settling");
          cups.slice().sort((x,y)=>slotOf[x.dataset.cup]-slotOf[y.dataset.cup]).forEach((c,i)=>{row.appendChild(c);c.style.setProperty("--shift",0);c.setAttribute("aria-label",`Cup ${i+1} of 3`);c.disabled=false});
          void row.offsetWidth; row.classList.remove("is-settling");
          instruction.innerHTML="<strong>Pick the cup that has the ⭐ STAR!</strong>";
          setStatus("⭐ YOUR TURN","Choose carefully.");
        },760);
      };
      // Give the player enough time to see the star.
      later(()=>{
        cups.forEach(c=>c.classList.remove("is-lifted"));
        instruction.textContent="Now watch carefully. The cups are shuffling…";
        setStatus("👀 FOLLOW THE STAR","The ⭐ is hidden now. Watch the cups.");
        later(()=>cups[starCup].querySelector(".cup-prize")?.remove(),450);
        later(step,700);
      },2400);

      cups.forEach(c=>c.addEventListener("click",()=>{
        if(gameLocked||c.disabled)return;
        cups.forEach(x=>x.disabled=true);
        if(Number(c.dataset.cup)===starCup){reveal(c,true);won("You found the hidden sticker!")}
        else{reveal(c,false);c.classList.add("is-empty");reveal(cups[starCup],true);lose("Not this one 😄")}
      }));
    }

    function memoryGame(){
      // The tiles are real stickers from the reward collection.
      const faces=shuffle([...STICKERS]).slice(0,6), deck=shuffle([...faces,...faces]);
      gameGrid.innerHTML=`<div class="memory-game">
        <p class="cup-message"><strong>MEMORISE THE STICKERS!</strong><br>Then find one matching pair in 3 tries.</p>
        <div class="memory-grid">${deck.map((s,i)=>`<button class="memory-tile revealed" type="button" data-face="${s.id}" data-name="${escapeHtml(s.name)}" aria-label="Tile ${i+1}: ${escapeHtml(s.name)}" disabled><span class="tile-inner"><span class="tile-face tile-back" aria-hidden="true">✦</span><span class="tile-face tile-front" aria-hidden="true"><img src="${s.src}" alt="" width="512" height="512"></span></span></button>`).join("")}</div>
        <p class="cup-message" id="memoryInfo">Tries left: 3</p>
      </div>`;
      const tiles=[...gameGrid.querySelectorAll(".memory-tile")], info=$("memoryInfo");
      let tries=3, first=null, busy=false;
      const flip=(t,up)=>{t.classList.toggle("revealed",up);t.setAttribute("aria-label",`Tile ${tiles.indexOf(t)+1}: ${up?t.dataset.name:"face down"}`)};
      setStatus("🧠 MEMORISE THE STICKERS",`${escapeHtml(player)} • Chance ${chance} of 2`);
      later(()=>{
        tiles.forEach(t=>{flip(t,false);t.disabled=false});
        setStatus("🃏 FIND A MATCHING PAIR",`Chance ${chance} of 2 • Flip two tiles. You have 3 tries.`);
      },3000);
      tiles.forEach(t=>t.addEventListener("click",()=>{
        if(gameLocked||busy||t.classList.contains("revealed"))return;
        flip(t,true);
        if(!first){first=t;return}
        const a=first,b=t;first=null;
        if(a.dataset.face===b.dataset.face){
          a.classList.add("matched");b.classList.add("matched");tiles.forEach(x=>x.disabled=true);
          won("You found a matching pair!");return;
        }
        tries--;info.textContent=`Tries left: ${tries}`;busy=true;
        a.classList.add("wrong");b.classList.add("wrong");
        if(!tries){tiles.forEach(x=>x.disabled=true);lose("No match this time 😄");later(()=>tiles.forEach(x=>flip(x,true)),600);return}
        later(()=>{a.classList.remove("wrong");b.classList.remove("wrong");flip(a,false);flip(b,false);busy=false},850);
      }));
    }

    function oddGame(){
      const sets=[["⭐","🌟"],["😀","😃"],["🙂","🙃"],["🌼","🌻"],["🌸","🌺"]];
      const [base,odd]=shuffle([...sets[Math.floor(Math.random()*sets.length)]]);
      const count=12, oddIndex=Math.floor(Math.random()*count), seconds=10;
      gameGrid.innerHTML=`<div class="odd-game">
        <p class="cup-message"><strong>SPOT THE ODD ONE!</strong><br>One tile is different. You get one tap.</p>
        <div class="round-timer" role="timer" aria-live="off"><span class="round-timer-track"><span class="round-timer-bar" style="--time:${seconds}s"></span></span><b id="oddTimeLeft">${seconds}s</b></div>
        <div class="odd-grid">${Array.from({length:count},(_,i)=>`<button class="odd-tile" type="button" data-index="${i}">${i===oddIndex?odd:base}</button>`).join("")}</div>
      </div>`;
      const tiles=[...gameGrid.querySelectorAll(".odd-tile")], left=$("oddTimeLeft");
      let remaining=seconds;
      setStatus("🔎 FIND THE ODD ONE",`${escapeHtml(player)} • Chance ${chance} of 2 • ${seconds} seconds`);
      const tick=()=>{
        remaining--;left.textContent=`${remaining}s`;
        if(remaining>0){later(tick,1000);return}
        tiles.forEach(t=>t.disabled=true);tiles[oddIndex].classList.add("correct");
        lose("Time's up ⏰");
      };
      later(tick,1000);
      tiles.forEach(t=>t.addEventListener("click",()=>{
        if(gameLocked)return;
        tiles.forEach(x=>x.disabled=true);tiles[oddIndex].classList.add("correct");
        if(Number(t.dataset.index)===oddIndex)won("You spotted the odd one out!");
        else{t.classList.add("wrong");lose("Not this one 😄")}
      }));
    }

    function catchGame(){
      const GOAL=10, LIVES=3, SECONDS=30, SWEETS=["avalaki.webp","rose.webp"];
      gameGrid.innerHTML=`<div class="catch-game">
        <p class="cup-message"><strong>CATCH ${GOAL} SWEETS IN ${SECONDS} SECONDS!</strong><br>Drag, or use ← → keys, to move the plate. Dodge the chillies 🌶️</p>
        <div class="catch-hud">
          <span class="hud-chip" id="catchScore">🍬 0 / ${GOAL}</span>
          <span class="hud-chip" id="catchLives" aria-label="${LIVES} lives left">${"❤️".repeat(LIVES)}</span>
          <span class="hud-chip" id="catchTime">⏱ ${SECONDS}s</span>
        </div>
        <div class="catch-stage" id="catchStage" tabindex="0" role="application" aria-label="Sweet Catch. Use the left and right arrow keys to move the plate.">
          <div class="catch-plate" id="catchPlate" aria-hidden="true"></div>
          <p class="catch-countdown" id="catchCountdown" aria-hidden="true">3</p>
        </div>
      </div>`;
      const stage=$("catchStage"), plate=$("catchPlate"), scoreEl=$("catchScore"), livesEl=$("catchLives"), timeEl=$("catchTime"), countdown=$("catchCountdown");
      let items=[], score=0, lives=LIVES, elapsed=0, spawnIn=.3, last=0, raf=0, running=false, dir=0, shownSec=SECONDS;
      const plateW=()=>plate.offsetWidth||90;
      const clampX=x=>{const half=plateW()/2;return Math.max(half,Math.min(stage.clientWidth-half,x))};
      let px=stage.clientWidth/2, target=px;
      const aim=e=>{const r=stage.getBoundingClientRect();target=clampX(e.clientX-r.left)};
      stage.addEventListener("pointerdown",e=>{aim(e);stage.setPointerCapture?.(e.pointerId)});
      stage.addEventListener("pointermove",aim);
      const onKey=e=>{if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;e.preventDefault();dir=e.type==="keyup"?0:(e.key==="ArrowLeft"?-1:1)};
      stage.addEventListener("keydown",onKey);stage.addEventListener("keyup",onKey);
      const bump=(el,cls)=>{el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls)};
      const pop=(x,y,text,cls)=>{const s=document.createElement("span");s.className=`catch-pop ${cls}`;s.textContent=text;s.style.left=`${x}px`;s.style.top=`${y}px`;stage.appendChild(s);setTimeout(()=>s.remove(),700)};
      const spawn=()=>{
        const chilli=Math.random()<.27, size=chilli?40:50, el=document.createElement("span");
        el.className=`catch-item${chilli?" is-chilli":""}`;el.setAttribute("aria-hidden","true");
        if(chilli)el.textContent="🌶️";
        else{const img=document.createElement("img");img.src=SWEETS[Math.random()<.5?0:1];img.alt="";el.appendChild(img)}
        stage.appendChild(el);
        items.push({el,size,chilli,x:size/2+Math.random()*(stage.clientWidth-size),y:-size,v:150+elapsed*5+Math.random()*70,rot:0,spin:(Math.random()-.5)*160});
      };
      const finish=(win,msg)=>{running=false;cancelAnimationFrame(raf);if(win)won(msg);else lose(msg)};
      const tick=t=>{
        if(!running)return;
        const dt=Math.min(.05,last?(t-last)/1000:0);last=t;elapsed+=dt;
        const H=stage.clientHeight, plateTop=H-34;
        if(dir)target=clampX(target+dir*460*dt);
        px+=(target-px)*Math.min(1,dt*14);
        plate.style.transform=`translateX(${px-plateW()/2}px)`;
        spawnIn-=dt;if(spawnIn<=0){spawn();spawnIn=Math.max(.42,.8-elapsed*.012)}
        for(let i=items.length-1;i>=0;i--){
          const it=items[i];it.y+=it.v*dt;it.rot+=it.spin*dt;
          it.el.style.transform=`translate(${it.x-it.size/2}px,${it.y}px) rotate(${it.rot}deg)`;
          if(it.y+it.size>=plateTop&&it.y<plateTop+16&&Math.abs(it.x-px)<plateW()/2+it.size*.2){
            it.el.remove();items.splice(i,1);
            if(it.chilli){
              lives--;livesEl.textContent="❤️".repeat(lives)+"🤍".repeat(LIVES-lives);livesEl.setAttribute("aria-label",`${lives} lives left`);
              bump(stage,"is-hit");pop(it.x,plateTop-34,"−1 ❤️","is-bad");
              if(lives<=0){finish(false,"Too spicy! 🌶️");return}
            }else{
              score++;scoreEl.textContent=`🍬 ${score} / ${GOAL}`;
              bump(plate,"is-catch");pop(it.x,plateTop-34,"+1","is-good");
              if(score>=GOAL){finish(true,"You caught all the sweets!");return}
            }
          }else if(it.y>H){it.el.remove();items.splice(i,1)}
        }
        const left=Math.max(0,Math.ceil(SECONDS-elapsed));
        if(left!==shownSec){shownSec=left;timeEl.textContent=`⏱ ${left}s`}
        if(elapsed>=SECONDS){finish(false,"Time's up ⏰");return}
        raf=requestAnimationFrame(tick);
      };
      cleanups.push(()=>{running=false;cancelAnimationFrame(raf)});
      plate.style.transform=`translateX(${px-plateW()/2}px)`;
      setStatus("🍽️ SWEET CATCH",`${escapeHtml(player)} • Chance ${chance} of 2`);
      let count=3;
      const countDown=()=>{
        if(count>0){countdown.textContent=String(count);bump(countdown,"is-tick");count--;later(countDown,650);return}
        countdown.remove();running=true;last=0;stage.focus({preventScroll:true});raf=requestAnimationFrame(tick);
      };
      countDown();
    }

    const GAMES={1:cupGame,2:memoryGame,3:oddGame,4:catchGame};
    // Each launcher starts its own game as a fresh round, like PLAY AGAIN does.
    startButtons.forEach(b=>b.addEventListener("click",()=>{
      gameType=Number(b.dataset.startGame)||1;markLaunchers();chance=0;
      if(!player)showName();else startNextGame();
      gameArea.scrollIntoView({behavior:scrollBehavior(),block:"nearest"});
    }));
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
  loadSummary();
})();

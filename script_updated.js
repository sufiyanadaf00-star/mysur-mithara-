/* MYSURU MITHRA — CLEAN FINAL SCRIPT */
(function(){
  "use strict";
  const cfg=window.MYSURU_MITHRA_CONFIG||{};
  const sb=window.supabase;
  const configured=!!(sb && /^https?:\/\//.test(cfg.url||"") && cfg.key && !String(cfg.key).includes("PASTE_YOUR"));
  const db=configured?sb.createClient(cfg.url,cfg.key):null;

  const $=id=>document.getElementById(id);
  let currentDish="", selectedRating=0;

  window.openRating=function(dish){
    currentDish=dish; selectedRating=0;
    $("ratingDishName").textContent=dish;
    $("ratingDishImage").src=dish==="Mysuru Avalakki"?"avalaki.png":"rose.png";
    $("ratingDishImage").alt=dish;
    $("selectedRating").textContent="Select your rating";
    $("ratingStatus").textContent="";
    $("reviewText").value="";
    const saved=sessionStorage.getItem("mm_feedback_name")||"";
    $("feedbackName").value=saved;
    document.querySelectorAll(".star-rating button").forEach(s=>s.classList.remove("selected"));
    $("ratingModal").classList.add("active");
    setTimeout(()=>$("feedbackName").focus(),80);
  };
  window.closeRating=function(){ $("ratingModal")?.classList.remove("active"); };
  window.selectStar=function(n){
    selectedRating=n;
    document.querySelectorAll(".star-rating button").forEach((s,i)=>s.classList.toggle("selected",i<n));
    $("selectedRating").textContent=["","Poor","Could be better","Good","Very Good","Excellent!"][n];
  };
  window.submitRating=async function(){
    const name=$("feedbackName").value.trim(), review=$("reviewText").value.trim();
    if(!name){$("ratingStatus").textContent="Please enter your name.";return}
    if(!selectedRating){$("ratingStatus").textContent="Please select a star rating.";return}
    if(!db){$("ratingStatus").textContent="Backend is not connected yet. Add your Supabase details in config.js.";return}
    const btn=$("submitRatingButton"); btn.disabled=true; $("ratingStatus").textContent="Saving your feedback…";
    const {error}=await db.from("feedback").insert({name,dish:currentDish,rating:selectedRating,review});
    if(error){console.error(error);$("ratingStatus").textContent="Could not save. Please try again.";btn.disabled=false;return}
    sessionStorage.setItem("mm_feedback_name",name);
    $("ratingStatus").textContent="Saved! Thank you ❤️";
    await loadSummary();
    setTimeout(()=>{window.closeRating();btn.disabled=false;},700);
  };

  async function loadSummary(){
    if(!db)return;
    const {data,error}=await db.rpc("get_public_rating_summary");
    if(error){console.error(error);return}
    (data||[]).forEach(r=>{
      const key=r.dish==="Mysuru Avalakki"?"avalakki":"mithaas";
      $(key+"Average").textContent=r.rating_count?Number(r.average_rating).toFixed(1):"—";
      $(key+"Count").textContent=r.rating_count?`${r.rating_count} rating${Number(r.rating_count)===1?"":"s"}`:"No ratings yet";
    });
  }
  window.openDashboardInfo=function(){$("dashboardInfoModal")?.classList.add("active")};
  window.closeDashboardInfo=function(){$("dashboardInfoModal")?.classList.remove("active")};
  document.addEventListener("click",e=>{if(e.target.classList.contains("rating-modal")){e.target.classList.remove("active")}});

  // TEAM SLIDER
  const slider=document.querySelector(".team-slider"), slides=document.querySelectorAll(".team-slide"), prev=$("teamPrev"), next=$("teamNext");
  if(slider&&slides.length&&prev&&next){
    let current=0;
    const show=i=>{current=(i+slides.length)%slides.length;slider.scrollTo({left:slides[current].offsetLeft,behavior:"smooth"})};
    prev.addEventListener("click",()=>show(current-1)); next.addEventListener("click",()=>show(current+1));
    slider.addEventListener("scroll",()=>{let best=0,dist=Infinity;slides.forEach((s,i)=>{const d=Math.abs(slider.scrollLeft-s.offsetLeft);if(d<dist){dist=d;best=i}});current=best},{passive:true});
  }

  // MYSTERY STICKER GAME — 3-cup medium side-to-side shuffle, two chances.
  const gameArea=$("mysteryGameArea"), gameGrid=$("gameGrid"), gameStatus=$("gameStatus"), winBox=$("stickerWin"), winner=$("winnerStickers"), startButtons=document.querySelectorAll("[data-start-game]");
  if(gameArea&&gameGrid&&gameStatus&&winBox){
    let player=sessionStorage.getItem("mm_player_name")||"", chance=0, gameLocked=false;
    const stickerPool=["stickers/sticker1.jpg","stickers/sticker2.jpg","stickers/sticker3.svg","stickers/sticker4.svg","stickers/sticker5.svg","stickers/sticker6_heritage-seal.svg","stickers/sticker7_sweet-heart.svg","stickers/sticker8_royal-badge.svg","stickers/sticker9_foodie.svg","stickers/sticker10_rose-love.svg","stickers/sticker11_avalakki-love.svg","stickers/sticker12_mithra-friends.svg","stickers/sticker13_namaste.svg","stickers/sticker14_gold-star.svg","stickers/sticker15_festival.svg","stickers/sticker16_classic.svg","stickers/sticker17_garden.svg","stickers/sticker18_royal-rose.svg","stickers/sticker19_heritage-love.svg","stickers/sticker20_finale.svg"];
    const showName=()=>{
      gameArea.hidden=false; winBox.hidden=true;
      gameGrid.innerHTML=`<div class="name-screen"><h3>🎁 Ready to Play?</h3><p>Enter your full name once. You will get two chances.</p><input id="playerNameInput" type="text" maxlength="60" placeholder="Enter your full name"><button id="startMysteryButton" class="start-mystery-button" type="button">START MYSTERY →</button></div>`;
      const input=$("playerNameInput"); input.value=player;
      $("startMysteryButton").onclick=()=>{const n=input.value.trim();if(!n){alert("Please enter your full name.");return}player=n;sessionStorage.setItem("mm_player_name",n);chance=0;startNextGame()};
    };
    const startNextGame=()=>{
      if(chance>=2){finishNoWin();return}
      chance++;gameLocked=false;gameArea.hidden=false;winBox.hidden=true;gameGrid.innerHTML="";
      gameStatus.innerHTML=`<strong>CHANCE ${chance} OF 2</strong><br><small>${escapeHtml(player)} • Watch the cups carefully</small>`;
      setTimeout(cupGame,250);
    };
    const finishNoWin=()=>{
      gameArea.hidden=false;winBox.hidden=true;
      gameGrid.innerHTML=`<div class="game-finished"><h3>Both chances used ❤️</h3><p>Thank you for playing, ${escapeHtml(player)}!</p><button class="play-mystery-again" id="restartGameSession" type="button">PLAY AGAIN</button></div>`;
      $("restartGameSession").onclick=()=>{chance=0;startNextGame()};
    };
    const won=()=>{
      gameLocked=true;
      gameStatus.innerHTML=`<strong>🎉 CONGRATULATIONS, ${escapeHtml(player)}!</strong><br><small>You found the hidden sticker!</small>`;
      const rewards=[...stickerPool].sort(()=>Math.random()-.5).slice(0,3); winner.innerHTML=rewards.map((f,i)=>{const ext=f.split(".").pop();return `<div class="winner-sticker"><img src="${f}" alt="Mysuru Mithra sticker ${i+1}"><a href="${f}" download="mysuru-mithra-sticker-${i+1}.${ext}">DOWNLOAD STICKER ${i+1}</a></div>`}).join("");
      winBox.hidden=false;winBox.scrollIntoView({behavior:"smooth",block:"center"});
      const again=$("playMysteryAgain");
      if(again)again.onclick=()=>{chance=0;gameLocked=false;winBox.hidden=true;gameGrid.innerHTML="";startNextGame()};
    };
    function cupGame(){
      gameGrid.innerHTML=`<div class="cup-game">
        <p class="cup-message"><strong>WATCH CAREFULLY!</strong><br>Remember which cup has the ⭐ STAR.</p>
        <div class="cups" id="cupRow">
          <button class="cup" data-cup="0" type="button">🥤</button>
          <button class="cup" data-cup="1" type="button">🥤</button>
          <button class="cup" data-cup="2" type="button">🥤</button>
        </div>
        <p id="cupInstruction" class="cup-message">The ⭐ is under one cup. Watch it!</p>
      </div>`;

      const cups=[...document.querySelectorAll(".cup")];
      let positions=[0,1,2], winnerIndex=Math.floor(Math.random()*3), swaps=0;

      // FIRST SHOW THE TARGET: the star is clearly visible before the cups cover it.
      cups[winnerIndex].textContent="⭐";
      cups.forEach(c=>c.disabled=true);
      gameStatus.innerHTML=`<strong>⭐ REMEMBER THE STAR</strong><br><small>${escapeHtml(player)} • You have 2 chances.</small>`;

      const render=()=>cups.forEach(c=>{
        const p=positions.indexOf(Number(c.dataset.cup));
        c.style.transform=`translateX(${(p-Number(c.dataset.cup))*72}px)`;
      });

      // Give the player enough time to see the star.
      setTimeout(()=>{
        cups.forEach(c=>c.textContent="🥤");
        $("cupInstruction").innerHTML="Now watch carefully — the cups are shuffling…";
        gameStatus.innerHTML=`<strong>👀 FOLLOW THE STAR</strong><br><small>The ⭐ is hidden now. Watch the cups.</small>`;

        const timer=setInterval(()=>{
          const a=Math.floor(Math.random()*2),b=a+1;
          [positions[a],positions[b]]=[positions[b],positions[a]];
          render();
          swaps++;

          if(swaps>=7){
            clearInterval(timer);
            setTimeout(()=>{
              cups.forEach(c=>{c.style.transform="";c.disabled=false;});
              $("cupInstruction").innerHTML="<strong>Pick the cup that has the ⭐ STAR!</strong>";
              gameStatus.innerHTML=`<strong>⭐ YOUR TURN</strong><br><small>Choose carefully.</small>`;

              cups.forEach(c=>c.onclick=()=>{
                if(gameLocked)return;
                gameLocked=true;
                const chosen=positions[Number(c.dataset.cup)];
                if(chosen===winnerIndex){
                  c.textContent="⭐";
                  won();
                } else {
                  c.textContent="❌";
                  gameStatus.innerHTML="<strong>Not this one 😄</strong><br><small>One chance used. Get ready for your second chance!</small>";
                  setTimeout(startNextGame,900);
                }
              });
            },650);
          }
        },700);
      },2400);
    }
    startButtons.forEach(b=>b.addEventListener("click",()=>{if(!player)showName();else startNextGame()}));
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
  loadSummary();
})();

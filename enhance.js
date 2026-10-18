/* MYSURU MITHRA: ENHANCEMENTS (splash screen, scroll reveals, 3D tilt) */
(function(){
  "use strict";
  const root=document.documentElement;
  const reduceMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer=window.matchMedia("(hover: hover) and (pointer: fine)");

  // SPLASH: shown once per browser session for a fixed SPLASH_MS (counted from the start of
  // navigation), then it fades out while any remaining images keep loading behind it.
  const splash=document.getElementById("splash");
  if(splash&&root.classList.contains("splash-on")){
    const SPLASH_MS=1500;
    let finished=false;
    const finish=()=>{if(finished)return;finished=true;root.classList.remove("splash-on");splash.remove()};
    try{sessionStorage.setItem("mm_splash_seen","1")}catch(e){}
    setTimeout(()=>{
      splash.classList.add("is-leaving");
      document.dispatchEvent(new Event("mm:splash-leaving")); // motion.js starts the hero entrance here
      splash.addEventListener("animationend",e=>{if(e.target===splash)finish()});
      setTimeout(finish,800);
    },Math.max(0,SPLASH_MS-performance.now()));
  }

  // Scroll reveals live in motion.js (GSAP, with a no-GSAP fallback).

  // 3D TILT: mouse and trackpad only. Touch keeps its normal press feedback.
  document.querySelectorAll("[data-tilt]").forEach(card=>{
    const max=Number(card.dataset.tilt)||7;
    let frame=0, px=0, py=0;
    const apply=()=>{
      frame=0;
      card.style.setProperty("--rx",`${(-py*max).toFixed(2)}deg`);
      card.style.setProperty("--ry",`${(px*max).toFixed(2)}deg`);
      card.style.setProperty("--px",px.toFixed(3));
      card.style.setProperty("--py",py.toFixed(3));
      card.style.setProperty("--mx",`${((px+1)*50).toFixed(1)}%`);
      card.style.setProperty("--my",`${((py+1)*50).toFixed(1)}%`);
    };
    card.addEventListener("pointermove",e=>{
      if(e.pointerType!=="mouse"||!finePointer.matches||reduceMotion.matches)return;
      const r=card.getBoundingClientRect();
      px=Math.max(-1,Math.min(1,((e.clientX-r.left)/r.width)*2-1));
      py=Math.max(-1,Math.min(1,((e.clientY-r.top)/r.height)*2-1));
      card.classList.add("is-tilting");
      if(!frame)frame=requestAnimationFrame(apply);
    });
    card.addEventListener("pointerleave",()=>{
      if(frame){cancelAnimationFrame(frame);frame=0}
      card.classList.remove("is-tilting");
      ["--rx","--ry","--px","--py"].forEach(p=>card.style.removeProperty(p));
    });
  });

  // TOUCH PRESS: phones have no hover, so pressing a dish card pops it instead.
  document.querySelectorAll(".dish-card").forEach(card=>{
    let timer=0;
    const release=()=>{clearTimeout(timer);timer=setTimeout(()=>card.classList.remove("is-pressed"),220)};
    card.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse")return;clearTimeout(timer);card.classList.add("is-pressed")});
    ["pointerup","pointercancel","pointerleave"].forEach(type=>card.addEventListener(type,release));
  });
})();

/* MYSURU MITHRA: GSAP MOTION
   Hero entrance, scroll reveals, word-by-word headings, scrubbed parallax, the team
   carousel's 3D coverflow, launcher/album pops and rating count-ups.
   GSAP (with ScrollTrigger and SplitText) owns scroll-linked motion when it loads. If the CDN
   is blocked, a small IntersectionObserver fallback reveals content instead, so nothing is ever
   left hidden. Everything here is skipped for prefers-reduced-motion. */
(function(){
  "use strict";
  const root=document.documentElement;
  const gsap=window.gsap, ScrollTrigger=window.ScrollTrigger, SplitText=window.SplitText;
  const revealEls=[...document.querySelectorAll("[data-reveal]")];
  const inView=el=>{const r=el.getBoundingClientRect();return r.top<window.innerHeight&&r.bottom>0};

  // FALLBACK without GSAP: the CSS reveal in enhance.css, driven by IntersectionObserver.
  if(!gsap||!ScrollTrigger){
    if(!revealEls.length||!("IntersectionObserver" in window))return;
    const io=new IntersectionObserver(entries=>{
      let i=0;
      entries.forEach(en=>{
        if(!en.isIntersecting)return;
        en.target.style.setProperty("--reveal-index",String(Math.min(i++,4)));
        en.target.classList.add("is-revealed");io.unobserve(en.target);
      });
    },{rootMargin:"0px 0px -8% 0px",threshold:.12});
    revealEls.forEach(el=>{if(inView(el))el.classList.add("is-shown");else io.observe(el)});
    root.classList.add("reveal-ready");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if(SplitText)gsap.registerPlugin(SplitText);
  root.classList.add("gsap-on"); // enhance.css hands its scroll-driven CSS animations over to GSAP
  gsap.defaults({ease:"power3.out",duration:.9});

  const mm=gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)",()=>{

    // 1. HERO ENTRANCE (home page): the title builds letter by letter as the splash fades.
    //    Only when the splash covers the page, so visible content never blinks out and back.
    const hero=document.querySelector(".hero");
    if(hero&&root.classList.contains("splash-on")){
      const tl=gsap.timeline({paused:true});
      // The logo is the largest image on screen, so only its transform animates, never its opacity.
      tl.from(hero.querySelector(".logo"),{scale:.84,rotationY:-28,y:24,transformPerspective:900,duration:1.3,ease:"expo.out",clearProps:"transform"},0);
      if(SplitText){
        const title=SplitText.create(hero.querySelectorAll(".hero-kicker,.hero-brand"),{type:"words,chars",mask:"words"});
        tl.from(title.chars,{yPercent:115,rotationX:-75,transformOrigin:"50% 100%",stagger:.028,duration:.9,ease:"back.out(1.7)"},.12)
          .add(()=>title.revert());
      }
      tl.from(hero.querySelectorAll(".team-label,.tagline,.decorative-line,.intro-text,.hero-cta"),{y:26,opacity:0,stagger:.09,duration:.8,clearProps:"transform,opacity"},.35);
      const play=()=>tl.play();
      if(!document.getElementById("splash")||document.querySelector(".splash.is-leaving"))play();
      else document.addEventListener("mm:splash-leaving",play,{once:true});
    }

    // 2. SCROLL REVEALS: below-the-fold blocks rise (data-reveal) or slide in from a side
    //    (data-reveal="left" / "right") with a slight 3D turn, in staggered batches.
    //    Anything already on screen is left alone. clearProps hands transforms back to CSS
    //    afterwards, so hover tilt and press effects keep working.
    const SLIDE={left:{x:-90,rotationY:16},right:{x:90,rotationY:-16}};
    const startState=dir=>({opacity:0,transformPerspective:1000,transformOrigin:"50% 100%",...(SLIDE[dir]||{y:56,rotationX:12})});
    const settle={opacity:1,x:0,y:0,rotationX:0,rotationY:0,duration:1.05,ease:"power3.out",overwrite:true,clearProps:"transform,opacity"};
    const below=revealEls.filter(el=>!inView(el));
    if(below.length){
      below.forEach(el=>gsap.set(el,startState(el.dataset.reveal)));
      ScrollTrigger.batch(below,{start:"top 92%",once:true,onEnter:batch=>gsap.to(batch,{...settle,stagger:.14})});
    }
    // Cards that slide in from alternating sides: the two live-rating cards, and the game
    // launchers when they stack in a single column on phones.
    const slideIn=(selector,stagger)=>{
      const els=[...document.querySelectorAll(selector)].filter(el=>!inView(el));
      if(!els.length)return;
      els.forEach((el,i)=>gsap.set(el,startState(i%2?"right":"left")));
      ScrollTrigger.batch(els,{start:"top 94%",once:true,onEnter:batch=>gsap.to(batch,{...settle,stagger})});
    };
    slideIn(".rating-card",.15);

    // 3. TEXT: headings rise word by word, supporting paragraphs rise line by line, each through
    //    a mask so the text appears to slide up out of its own line. Lines are measured after the
    //    web fonts load, and the split is undone afterwards so the text reflows normally.
    if(SplitText){
      document.querySelectorAll(".section-heading h2,.rating-heading h2,.thank-you h2,.sticker-game h2,.journey-ending h2").forEach(h=>{
        if(inView(h))return;
        const words=SplitText.create(h,{type:"words",mask:"words"});
        gsap.from(words.words,{yPercent:110,opacity:0,stagger:.07,duration:.8,scrollTrigger:{trigger:h,start:"top 92%",once:true},onComplete:()=>words.revert()});
      });
      const fontsReady=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();
      fontsReady.then(()=>{
        document.querySelectorAll(".section-heading > p:last-child,.rating-heading span,.game-subtitle,.journey-ending p,.album-note,.journey-header p").forEach(p=>{
          if(inView(p))return;
          const lines=SplitText.create(p,{type:"lines",mask:"lines"});
          gsap.from(lines.lines,{yPercent:105,opacity:0,stagger:.1,duration:.85,ease:"power3.out",delay:.15,scrollTrigger:{trigger:p,start:"top 94%",once:true},onComplete:()=>lines.revert()});
        });
        ScrollTrigger.refresh();
      });
    }

    // 4. PARALLAX (scrubbed to scroll): background dishes drift and turn, the logo eases back.
    const page=document.querySelector(".page");
    if(page){
      const drift={trigger:page,start:"top top",end:"+=1400",scrub:1};
      gsap.to(".background-left",{y:240,rotation:-20,ease:"none",scrollTrigger:drift});
      gsap.to(".background-right",{y:320,rotation:18,ease:"none",scrollTrigger:{...drift}});
      gsap.to(".hero .logo-wrap",{y:70,scale:.92,opacity:.6,ease:"none",scrollTrigger:{trigger:".hero",start:"top top",end:"bottom top",scrub:.6}});
    }

    // 5. TEAM CAROUSEL: 3D coverflow tied to the horizontal swipe (works on every browser).
    const slider=document.querySelector(".team-slider");
    if(slider){
      slider.querySelectorAll(".team-slide").forEach(slide=>{
        const photo=slide.querySelector(".slide-photo"), intro=slide.querySelector(".slide-intro");
        gsap.timeline({defaults:{ease:"none",duration:1},scrollTrigger:{trigger:slide,scroller:slider,horizontal:true,start:"left right",end:"right left",scrub:true}})
          .fromTo(photo,{rotationY:-38,scale:.82,opacity:.35,transformPerspective:900},{rotationY:0,scale:1,opacity:1})
          .to(photo,{rotationY:38,scale:.82,opacity:.35})
          .fromTo(intro,{x:48,opacity:0},{x:0,opacity:1},0)
          .to(intro,{x:-48,opacity:0},1);
      });
    }

    // 6. GAME LAUNCHERS AND STICKER ALBUM: cards flip up, stickers pop in.
    const pop=(selector,from,stagger)=>{
      const els=[...document.querySelectorAll(selector)].filter(el=>!inView(el));
      if(!els.length)return;
      gsap.set(els,{opacity:0,...from});
      ScrollTrigger.batch(els,{start:"top 94%",once:true,onEnter:batch=>gsap.to(batch,{opacity:1,y:0,scale:1,rotationX:0,stagger,duration:.7,ease:"back.out(1.6)",overwrite:true,clearProps:"transform,opacity"})});
    };
    if(window.matchMedia("(max-width: 599px)").matches)slideIn(".game-launcher",.12); // stacked list: alternate sides
    else pop(".game-launcher",{y:40,rotationX:-20,transformPerspective:800},.1);        // grid: flip up
    pop(".album-slot",{scale:.5},.025);

    // 7. LIVE RATINGS: the averages count up and the star meters refill when the section arrives.
    const live=document.querySelector(".live-rating-section");
    if(live){
      ScrollTrigger.create({trigger:live,start:"top 85%",once:true,onEnter:()=>{
        live.querySelectorAll(".rating-score strong").forEach(el=>{
          const value=parseFloat(el.textContent);
          if(!isFinite(value))return;
          const n={v:0};
          gsap.to(n,{v:value,duration:1.4,ease:"power2.out",onUpdate:()=>{el.textContent=n.v.toFixed(1)},onComplete:()=>{el.textContent=value.toFixed(1)}});
        });
        live.querySelectorAll(".star-meter-fill").forEach(f=>gsap.from(f,{width:0,duration:1.4,ease:"power2.out",clearProps:"width"}));
      }});
    }
  });

  // Images and late content change heights; re-measure trigger positions once everything is in.
  window.addEventListener("load",()=>ScrollTrigger.refresh());
})();

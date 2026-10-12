/* The Dale · site.js
   Smooth scroll (Lenis) + GSAP ScrollTrigger, modelled on white-desert.com:
   - hero photo is pinned while two fog banks rise over it faster than the page, and the title blurs
   - big statements darken line by line as they are read
   - the valley film starts fogged in and the fog lifts away
   Everything degrades to a static page under prefers-reduced-motion or without GSAP. */
(() => {
  "use strict";
  document.documentElement.classList.add("js");

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let lenis = null;

  /* ---------- smooth scroll ---------- */
  if (!reduce && hasGsap && typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, syncTouch: false });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  function scrollToEl(el) {
    if (!el) return;
    const offset = el.id === "enquire" ? -90 : 0;
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }

  /* ---------- films ----------
     The hero film plays straight away; the valley film loads when it's about to come on screen
     and pauses when it leaves. Small screens get the 720p files. Under reduced motion the
     poster frame stays and nothing plays. */
  const small = matchMedia("(max-width: 820px)").matches;
  function loadFilm(v) {
    if (!v || v.dataset.loaded) return;
    v.src = small ? v.dataset.srcSm : v.dataset.srcLg;
    v.dataset.loaded = "1";
  }
  const play = (v) => { const p = v.play(); if (p) p.catch(() => {}); };
  const heroFilm = $("video[data-hero-img]");
  const valleyFilm = $("video[data-peaks-img]");
  if (!reduce) {
    if (heroFilm) { loadFilm(heroFilm); play(heroFilm); }
    if (valleyFilm && "IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { loadFilm(valleyFilm); play(valleyFilm); } else if (valleyFilm.dataset.loaded) valleyFilm.pause();
      }, { rootMargin: "600px 0px" }).observe(valleyFilm);
    }
  }

  /* ---------- anchors + mobile sheet ---------- */
  const sheet = $("[data-sheet]");
  const menuBtn = $("[data-menu]");
  function setSheet(open) {
    if (!sheet || !menuBtn) return;
    sheet.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? "Close" : "Menu";
    $("[data-nav]").classList.toggle("is-light", open || navLight);
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  menuBtn && menuBtn.addEventListener("click", () => setSheet(sheet.hidden));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sheet && !sheet.hidden) { setSheet(false); menuBtn.focus(); } });

  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) { if (id === "#") return; }
    const target = id === "#top" ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    if (sheet && !sheet.hidden) setSheet(false);
    if (id === "#top" && lenis) lenis.scrollTo(0, { duration: 1.6 });
    else scrollToEl(target);
    if (id === "#enquire") setTimeout(() => $("#f-name").focus({ preventScroll: true }), lenis ? 1700 : 0);
  }));

  /* ---------- nav colour: white over the hero photo, deodar once the fog has covered it ---------- */
  const nav = $("[data-nav]");
  let navLight = false;
  function setNav(light) { navLight = light; nav.classList.toggle("is-light", light || (sheet && !sheet.hidden)); }

  /* ---------- rooms accordion ---------- */
  const rooms = $$("[data-room]");
  function openRoom(room) {
    rooms.forEach((r) => {
      const on = r === room;
      r.classList.toggle("is-open", on);
      r.querySelector(".room__hit").setAttribute("aria-expanded", String(on));
    });
  }
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  rooms.forEach((room) => {
    room.querySelector(".room__hit").addEventListener("click", () => openRoom(room));
    if (finePointer) {
      let t;
      room.addEventListener("mouseenter", () => { t = setTimeout(() => openRoom(room), 140); });
      room.addEventListener("mouseleave", () => clearTimeout(t));
    }
  });

  /* ---------- room photos: previous / next when a room has more than one ---------- */
  rooms.forEach((room) => {
    const imgs = $$(".room__media img", room);
    if (imgs.length < 2) return;
    let cur = 0;
    room.classList.add("has-gallery");
    imgs[0].classList.add("is-current");
    const ctr = document.createElement("div");
    ctr.className = "room__nav";
    ctr.innerHTML = '<button type="button" aria-label="Previous photo"><i class="ph-light ph-arrow-left" aria-hidden="true"></i></button>' +
      '<span class="room__count" aria-live="polite"></span>' +
      '<button type="button" aria-label="Next photo"><i class="ph-light ph-arrow-right" aria-hidden="true"></i></button>';
    const count = $(".room__count", ctr);
    const show = (i) => {
      cur = (i + imgs.length) % imgs.length;
      imgs.forEach((img, j) => img.classList.toggle("is-current", j === cur));
      count.textContent = `${cur + 1} / ${imgs.length}`;
    };
    const [prev, next] = $$("button", ctr);
    prev.addEventListener("click", () => show(cur - 1));
    next.addEventListener("click", () => show(cur + 1));
    $(".room__body", room).appendChild(ctr);
    show(0);
  });

  /* ---------- seasons: swap the sticky photo ---------- */
  const seasonImgs = $$("[data-season-img]");
  const seasons = $$("[data-season]");
  function setSeason(i) {
    seasonImgs.forEach((img, j) => img.classList.toggle("is-on", i === j));
    seasons.forEach((s, j) => s.classList.toggle("is-on", i === j));
  }

  /* ---------- a day: swap the sticky photo with the hour ---------- */
  const dayImgs = $$("[data-swap-img]");
  const hours = $$("[data-swap-step]");
  function setHour(i) {
    const k = +hours[i].dataset.swapStep;
    dayImgs.forEach((img, j) => img.classList.toggle("is-on", j === k));
    hours.forEach((h, j) => h.classList.toggle("is-on", j === i));
  }

  /* ---------- reveals ---------- */
  const reveals = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -12% 0px" });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add("is-in"));

  /* ---------- scroll choreography ---------- */
  if (hasGsap && !reduce) {
    const mm = gsap.matchMedia();

    // Hero: fog rises over the pinned photo. Scroll distance = the hero's extra 100svh.
    const hero = $("[data-hero]");
    const heroRange = { trigger: hero, start: "top top", end: "bottom bottom", scrub: true };
    $$("[data-fog]", hero).forEach((fog) => {
      const k = parseFloat(fog.dataset.fog);
      gsap.to(fog, { y: () => -k * innerHeight, ease: "none", scrollTrigger: { ...heroRange, invalidateOnRefresh: true } });
    });
    gsap.to("[data-hero-title]", { filter: "blur(10px)", yPercent: -18, ease: "none", scrollTrigger: heroRange });
    gsap.to("[data-hero-img]", { scale: 1.08, ease: "none", scrollTrigger: heroRange });
    gsap.to("[data-hero-in]", { autoAlpha: 0, y: -24, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "35% top", scrub: true } });

    // Hero entrance
    gsap.from("[data-hero-title]", { yPercent: 14, autoAlpha: 0, duration: 1.8, ease: "expo.out", delay: .15 });
    gsap.from("[data-hero-in], .nav", { autoAlpha: 0, y: 12, duration: 1.4, ease: "expo.out", delay: .5, stagger: .08 });

    // the fog reaches the top of the screen at ~70% of the hero scroll
    ScrollTrigger.create({ trigger: hero, start: () => `top+=${innerHeight * 0.7} top`, invalidateOnRefresh: true, onEnter: () => setNav(true), onLeaveBack: () => setNav(false) });

    // Statements darken as they come up the screen, and are fully dark by the time the
    // last line is 80% of the way down, so a statement is never half-grey while you read it
    $$("[data-fade]").forEach((el) => {
      gsap.fromTo(el, { "--p": "-30%" }, { "--p": "112%", ease: "none", scrollTrigger: { trigger: el, start: "top 98%", end: "bottom 80%", scrub: true } });
    });

    // Ridges: slow drift inside a fixed frame
    gsap.fromTo("[data-ridges] img", { yPercent: -12 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: "[data-ridges]", start: "top bottom", end: "bottom top", scrub: true } });

    // Collage: each photo drifts at its own rate
    $$("[data-drift]").forEach((el) => {
      const d = parseFloat(el.dataset.drift);
      gsap.fromTo(el.querySelector("img"), { yPercent: d }, { yPercent: -d, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // Peaks: the fog lifts, the photo settles, the name arrives
    const peaks = $("[data-peaks]");
    const peaksRange = { trigger: peaks, start: "top top", end: "bottom bottom", scrub: true };
    gsap.to("[data-peaks-fog]", { y: () => -1.7 * innerHeight, ease: "none", scrollTrigger: { ...peaksRange, end: "75% bottom", invalidateOnRefresh: true } });
    gsap.fromTo("[data-peaks-img]", { scale: 1.16 }, { scale: 1, ease: "none", scrollTrigger: peaksRange });
    gsap.fromTo("[data-peaks-copy]", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, ease: "none", scrollTrigger: { trigger: peaks, start: "35% top", end: "70% bottom", scrub: true } });

    // The hours of the day work the same way as the seasons below.
    mm.add("(min-width: 821px)", () => {
      hours.forEach((h, i) => ScrollTrigger.create({
        trigger: h, start: () => `top ${nav.offsetHeight + innerHeight * 0.35}px`, end: () => `bottom ${nav.offsetHeight + innerHeight * 0.35}px`,
        invalidateOnRefresh: true,
        onToggle: (st) => st.isActive && setHour(i),
      }));
    });

    // Seasons only scroll-sync on the two-column layout. A season takes over as its text
    // rises into the top part of the screen (just under the photo's top edge), and the
    // blocks touch, so exactly one season is active at a time.
    mm.add("(min-width: 821px)", () => {
      const line = () => `top ${nav.offsetHeight + innerHeight * 0.22}px`;
      seasons.forEach((s, i) => ScrollTrigger.create({
        trigger: s, start: line, end: () => `bottom ${nav.offsetHeight + innerHeight * 0.22}px`,
        invalidateOnRefresh: true,
        onToggle: (st) => st.isActive && setSeason(i),
      }));
    });

    addEventListener("load", () => ScrollTrigger.refresh());
  } else {
    // Static fallback: nav turns light once the hero leaves
    const hero = $("[data-hero]");
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => setNav(!e.isIntersecting), { threshold: 0.15 }).observe(hero);
    seasons.forEach((s) => s.classList.add("is-on"));
    hours.forEach((h) => h.classList.add("is-on"));
  }
  setSeason(0);
  if (hours.length && hasGsap && !reduce) setHour(0);

  /* ---------- enquiry form ---------- */
  const form = $("[data-form]");
  $$("[data-plan]").forEach((a) => a.addEventListener("click", () => {
    const r = form && form.querySelector(`input[name="kind"][value="${a.dataset.plan}"]`);
    if (r) r.checked = true;
  }));
  if (form) {
    const status = $(".form__status", form);
    const label = $("[data-form-label]", form);
    const date = $("#f-date", form);
    date.min = new Date().toISOString().split("T")[0];
    const rules = [
      ["#f-name", (v) => v.trim().length > 1],
      ["#f-phone", (v) => v.replace(/[^\d]/g, "").length >= 10],
      ["#f-date", (v) => !!v],
    ];
    const check = (sel, ok) => {
      const input = $(sel, form);
      const err = $("#" + input.getAttribute("aria-describedby"), form);
      const valid = ok(input.value);
      input.setAttribute("aria-invalid", String(!valid));
      err.hidden = valid;
      return valid;
    };
    rules.forEach(([sel, ok]) => $(sel, form).addEventListener("blur", (e) => { if (e.target.value) check(sel, ok); }));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const bad = rules.filter(([sel, ok]) => !check(sel, ok));
      if (bad.length) { $(bad[0][0], form).focus(); status.textContent = ""; return; }
      // TODO: connect to the real enquiry endpoint (email service or booking inbox).
      label.textContent = "Sending…";
      setTimeout(() => {
        const first = $("#f-name", form).value.trim().split(" ")[0];
        status.textContent = `Thank you, ${first}. We will write back within a day.`;
        label.textContent = "Send enquiry";
        form.reset();
        rules.forEach(([sel]) => $(sel, form).removeAttribute("aria-invalid"));
      }, 700);
    });
  }
})();

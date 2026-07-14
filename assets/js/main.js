import { animate, inView, scroll, stagger, hover } from "motion";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = [0.16, 0.8, 0.24, 1];

/* ---------- Footer year ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- Nav: scroll background (always visible, never hides) ---------- */
const nav = document.getElementById("siteNav");
function onScroll() {
  nav.classList.toggle("is-scrolled", window.scrollY > 40);
}
document.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Mobile nav toggle ---------- */
const burger = document.getElementById("navBurger");
const navLinks = document.getElementById("navLinks");
const navScrim = document.getElementById("navScrim");
function setMobileNavOpen(open) {
  navLinks.classList.toggle("is-open", open);
  burger.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", open ? "true" : "false");
  if (navScrim) navScrim.classList.toggle("is-open", open);
  // lock body scroll while the menu is open so the page underneath can't
  // scroll/repaint behind it
  document.body.classList.toggle("no-scroll", open);
}
burger.addEventListener("click", () => {
  setMobileNavOpen(!navLinks.classList.contains("is-open"));
});
navLinks.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => setMobileNavOpen(false));
});
if (navScrim) navScrim.addEventListener("click", () => setMobileNavOpen(false));

/* ---------- Smooth anchor scroll (accounts for fixed nav height) ---------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const navH = nav.offsetHeight;
    const top = target.getBoundingClientRect().top + window.pageYOffset - navH - 12;
    window.scrollTo({ top, behavior: "smooth" });
    history.pushState(null, "", id);
  });
});

/* ---------- Active nav link tracking ---------- */
const navLinkMap = new Map();
navLinks.querySelectorAll("a[href^='#']").forEach((a) => navLinkMap.set(a.getAttribute("href").slice(1), a));
document.querySelectorAll("main section[id]").forEach((section) => {
  inView(
    section,
    () => {
      navLinkMap.forEach((a) => a.classList.remove("is-active"));
      const link = navLinkMap.get(section.id);
      if (link) link.classList.add("is-active");
    },
    { margin: "-45% 0px -50% 0px" }
  );
});

/* ---------- Reveal helpers (skip entirely if reduced motion — content stays visible) ---------- */
function revealSingle(el, { y = 20, duration = 0.6, delay = 0 } = {}) {
  if (!el || prefersReducedMotion) return;
  el.style.opacity = 0;
  inView(
    el,
    () => animate(el, { opacity: [0, 1], y: [y, 0] }, { duration, delay, easing: EASE }),
    { amount: 0.2, margin: "0px 0px -80px 0px" }
  );
}

function revealGroup(container, childSelector, { y = 24, duration = 0.6, staggerBy = 0.08 } = {}) {
  if (!container || prefersReducedMotion) return;
  const children = container.querySelectorAll(childSelector);
  if (!children.length) return;
  children.forEach((c) => (c.style.opacity = 0));
  inView(
    container,
    () => animate(children, { opacity: [0, 1], y: [y, 0] }, { duration, delay: stagger(staggerBy), easing: EASE }),
    { amount: 0.15, margin: "0px 0px -60px 0px" }
  );
}

["section__head", "about__text", "contact__form", "contact__details", "proceso__visual", "showcase__center"].forEach((cls) => {
  document.querySelectorAll(`.${cls}.reveal`).forEach((el) => revealSingle(el));
});

document.querySelectorAll(".showcase__col").forEach((col, i) => {
  revealGroup(col, ".showcase__card", { staggerBy: 0.12, y: i % 2 ? -24 : 24 });
});

revealGroup(document.querySelector("[data-works-grid]"), ".works__card", { staggerBy: 0.1, y: 20 });
revealGroup(document.querySelector(".industries__list"), ".industries__row", { staggerBy: 0.1, y: 20 });

/* ---------- Cursor-follow pill: reused for the works grid and the industries list ---------- */
function initHoverCursor(listSelector, cursorSelector) {
  const list = document.querySelector(listSelector);
  const cursor = document.querySelector(cursorSelector);
  if (!list || !cursor || prefersReducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  list.addEventListener("mouseenter", () => cursor.classList.add("is-active"));
  list.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
  list.addEventListener("mousemove", (e) => {
    animate(cursor, { x: e.clientX + 20, y: e.clientY - 18 }, { type: "spring", stiffness: 300, damping: 30, mass: 0.4 });
  });
}
initHoverCursor("[data-works-grid]", "[data-works-cursor]");
initHoverCursor("[data-industries-list]", "[data-industries-cursor]");

revealGroup(document.querySelector(".grow__inner"), ".reveal", { staggerBy: 0.1 });

revealGroup(document.querySelector(".pillars"), ".pillar", { staggerBy: 0.08 });
revealGroup(document.querySelector(".mv__grid"), ".mv__card", { staggerBy: 0.12 });
revealGroup(document.querySelector(".team"), ".team__card", { staggerBy: 0.1 });
revealGroup(document.querySelector(".timeline"), ".timeline__item", { staggerBy: 0.1, y: 16 });
revealGroup(document.querySelector(".flowchart__nodes"), ".flowchart__card", { staggerBy: 0.12, y: -20 });
revealSingle(document.querySelector(".flowchart__business"), { y: 16, delay: 0.3 });

/* ---------- Flowchart: measured connectors + per-card light pulses ---------- */
/* Connector positions are measured from real element positions (not hardcoded
   percentages) so cards, lines and the business node always line up and stay
   centered regardless of container width. Draw-in and pulses use native CSS
   transitions (not Motion's animate) because WAAPI/Motion does not reliably
   animate SVG stroke-dashoffset across browsers. */
(function initFlowchart() {
  const root = document.querySelector("[data-flowchart]");
  if (!root) return;
  const svg = root.querySelector("[data-svg]");
  const cards = Array.from(root.querySelectorAll("[data-card]"));
  const business = root.querySelector("[data-business]");
  const SVG_NS = "http://www.w3.org/2000/svg";

  let branchGlows = [];
  let dropGlow = null;
  let built = false;

  function clearSvg() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    branchGlows = [];
    dropGlow = null;
    built = false;
  }

  function makePath(cls) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("class", cls);
    svg.appendChild(p);
    return p;
  }

  function build() {
    clearSvg();
    const rootRect = root.getBoundingClientRect();
    const w = rootRect.width;
    const h = rootRect.height;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);

    const businessRect = business.getBoundingClientRect();
    const businessX = businessRect.left + businessRect.width / 2 - rootRect.left;
    const businessTop = businessRect.top - rootRect.top;
    const trunkY = businessTop - 90;

    const drawPaths = [];
    cards.forEach((card) => {
      const r = card.getBoundingClientRect();
      const cx = r.left + r.width / 2 - rootRect.left;
      const cy = r.bottom - rootRect.top;
      const bendY = cy + (trunkY - cy) * 0.6;
      const mergeX = cx + (businessX - cx) * 0.25;
      const d = `M${cx},${cy} L${cx},${bendY} L${mergeX},${trunkY} L${businessX},${trunkY}`;
      const line = makePath("flowchart__line");
      line.setAttribute("d", d);
      line.setAttribute("data-draw", "");
      drawPaths.push(line);

      const glow = makePath("flowchart__glow");
      glow.setAttribute("d", d);
      branchGlows.push(glow);
    });

    const dropD = `M${businessX},${trunkY} L${businessX},${businessTop}`;
    const dropLine = makePath("flowchart__line");
    dropLine.setAttribute("d", dropD);
    dropLine.setAttribute("data-draw", "");
    drawPaths.push(dropLine);

    dropGlow = makePath("flowchart__glow");
    dropGlow.setAttribute("d", dropD);

    requestAnimationFrame(() => {
      drawPaths.forEach((path, i) => {
        const length = path.getTotalLength();
        path.style.strokeDasharray = String(length);
        path.style.strokeDashoffset = String(length);
        if (!prefersReducedMotion) {
          path.style.transition = `stroke-dashoffset 1s cubic-bezier(0.16,0.8,0.24,1) ${(0.15 + i * 0.12).toFixed(2)}s`;
        }
      });
      const drawIn = () => drawPaths.forEach((path) => (path.style.strokeDashoffset = "0"));
      if (prefersReducedMotion) {
        drawIn();
      } else {
        inView(root, drawIn, { amount: 0.2, margin: "0px 0px -60px 0px" });
      }
    });

    built = true;
  }

  build();
  window.addEventListener("resize", () => {
    clearTimeout(window.__flowchartResizeT);
    window.__flowchartResizeT = setTimeout(build, 200);
  });
  /* Re-measure once webfonts finish loading: text set in the fallback font
     has different metrics, so the business pill's width (and therefore its
     center point) can shift after the swap, leaving the drawn lines stale. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => build());
  }
  window.setTimeout(build, 600);

  /* One-shot traveling light pulse along a connector path */
  function firePulse(path) {
    if (!path || !built) return 0;
    const len = path.getTotalLength();
    const dash = 42;
    const duration = Math.min(1.1, Math.max(0.4, len / 700));
    path.style.transition = "none";
    path.style.strokeDasharray = `${dash} 9999`;
    path.style.strokeDashoffset = String(dash);
    path.style.opacity = "1";
    void path.getBoundingClientRect();
    path.style.transition = `stroke-dashoffset ${duration}s linear`;
    path.style.strokeDashoffset = String(-len);
    window.setTimeout(() => {
      path.style.opacity = "0";
    }, duration * 1000 + 60);
    return duration;
  }

  /* Badge cycle: hidden -> loading -> done (fires the pulse) -> hidden -> repeat.
     Cards are driven by a single sequential loop (not one independent timer per
     card) so they always activate strictly left to right, in order, instead of
     drifting out of sync from per-card random durations. */
  if (!prefersReducedMotion) {
    const badges = cards.map((card) => card.querySelector("[data-badge]"));
    const LOAD_DURATION = 1150;
    const DONE_HOLD = 700;
    const NEXT_CARD_GAP = 350;
    const CYCLE_PAUSE = 1400;
    let i = 0;

    function runCard() {
      const badge = badges[i];
      if (badge) badge.className = "flowchart__badge is-loading";
      window.setTimeout(() => {
        if (badge) badge.className = "flowchart__badge is-done";
        const branchDuration = firePulse(branchGlows[i]);
        window.setTimeout(() => firePulse(dropGlow), branchDuration * 1000 * 0.85);
        window.setTimeout(() => {
          if (badge) badge.className = "flowchart__badge";
          const isLast = i === cards.length - 1;
          i = (i + 1) % cards.length;
          window.setTimeout(runCard, isLast ? CYCLE_PAUSE : NEXT_CARD_GAP);
        }, DONE_HOLD);
      }, LOAD_DURATION);
    }

    window.setTimeout(runCard, 600);
  }
})();

/* ---------- Hero entrance (plays on load, not on scroll) ---------- */
const heroReveals = document.querySelectorAll(".hero .reveal");
if (!prefersReducedMotion && heroReveals.length) {
  animate(
    heroReveals,
    { opacity: [0, 1], y: [26, 0] },
    { duration: 0.8, delay: stagger(0.1, { startDelay: 0.15 }), easing: EASE }
  );
}

/* ---------- Hero isotipo: assembles from scattered pieces ---------- */
const assembleEl = document.querySelector("[data-assemble]");
if (assembleEl) {
  if (prefersReducedMotion) {
    assembleEl.style.backgroundImage = 'url("assets/img/isotipo-white.png")';
    assembleEl.style.backgroundSize = "100% 100%";
    assembleEl.style.backgroundRepeat = "no-repeat";
  } else {
    const cols = 4;
    const rows = 4;
    const centerR = (rows - 1) / 2;
    const centerC = (cols - 1) / 2;
    const pieces = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const piece = document.createElement("div");
        piece.className = "hero__isotipo-piece";
        const top = (r / rows) * 100;
        const bottom = 100 - ((r + 1) / rows) * 100;
        const left = (c / cols) * 100;
        const right = 100 - ((c + 1) / cols) * 100;
        piece.style.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
        assembleEl.appendChild(piece);
        pieces.push({ el: piece, r, c });
      }
    }
    pieces.forEach(({ el, r, c }) => {
      const dist = Math.hypot(r - centerR, c - centerC);
      const angle = Math.random() * Math.PI * 2;
      const throwDist = 160 + Math.random() * 220;
      const fromX = Math.cos(angle) * throwDist;
      const fromY = Math.sin(angle) * throwDist;
      const fromRotate = (Math.random() - 0.5) * 160;
      animate(
        el,
        { opacity: [0, 1], x: [fromX, 0], y: [fromY, 0], rotate: [fromRotate, 0], scale: [0.4, 1] },
        { duration: 0.9, delay: 0.5 + dist * 0.05, type: "spring", stiffness: 120, damping: 14, mass: 0.6 }
      );
    });
  }
}

/* ---------- Hero flower: scroll-scrubbed image sequence ---------- */
/* A real timelapse (flower blooming) recolored to brand lime and keyed to
   transparent, played back frame-by-frame tied to scroll position through
   the hero — same technique as premium sites like dialedweb.com, built with
   our own footage instead of theirs. */
(function initFlowerSequence() {
  const canvas = document.querySelector("[data-flower-sequence]");
  if (!canvas) return;
  const FRAME_COUNT = 80;
  const framePath = (i) => `/flower-sequence/frame_${String(i).padStart(3, "0")}.webp`;
  const ctx = canvas.getContext("2d");
  const images = [];
  let loadedCount = 0;

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || !img.naturalWidth) return;
    if (canvas.width !== img.naturalWidth) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }

  for (let i = 1; i <= FRAME_COUNT; i++) {
    const img = new Image();
    img.src = framePath(i);
    img.onload = () => {
      loadedCount++;
      if (i === 1 && !prefersReducedMotion) drawFrame(0);
      if (prefersReducedMotion && i === FRAME_COUNT) drawFrame(FRAME_COUNT - 1);
    };
    images.push(img);
  }

  if (!prefersReducedMotion) {
    const growSection = document.getElementById("crece");
    scroll(
      (progress) => {
        // fully open by the halfway point of the section's scroll range, then hold
        const bloomProgress = Math.min(1, progress / 0.5);
        const idx = Math.min(FRAME_COUNT - 1, Math.max(0, Math.floor(bloomProgress * FRAME_COUNT)));
        drawFrame(idx);
      },
      { target: growSection, offset: ["start end", "end start"] }
    );
  }
})();

/* ---------- Marquee: pause on hover ---------- */
const marquee = document.querySelector(".marquee");
if (marquee) {
  const track = marquee.querySelector(".marquee__track");
  marquee.addEventListener("mouseenter", () => (track.style.animationPlayState = "paused"));
  marquee.addEventListener("mouseleave", () => (track.style.animationPlayState = "running"));
}

/* ---------- Magnetic buttons ---------- */
function magnetic(el, strength = 0.35) {
  if (prefersReducedMotion) return;
  hover(el, () => {
    function move(e) {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      animate(el, { x: relX * strength, y: relY * strength }, { type: "spring", stiffness: 300, damping: 20, mass: 0.5 });
    }
    el.addEventListener("mousemove", move);
    return () => {
      el.removeEventListener("mousemove", move);
      animate(el, { x: 0, y: 0 }, { type: "spring", stiffness: 300, damping: 20 });
    };
  });
}
document.querySelectorAll("[data-magnetic]").forEach((el) => magnetic(el));

/* ---------- 3D tilt on cards ---------- */
function tilt(el, max = 8) {
  if (prefersReducedMotion) return;
  hover(el, () => {
    function move(e) {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      animate(
        el,
        { rotateY: px * max * 2, rotateX: py * -max * 2, y: -6 },
        { type: "spring", stiffness: 260, damping: 22 }
      );
    }
    el.addEventListener("mousemove", move);
    return () => {
      el.removeEventListener("mousemove", move);
      animate(el, { rotateX: 0, rotateY: 0, y: 0 }, { type: "spring", stiffness: 260, damping: 22 });
    };
  });
}
document.querySelectorAll("[data-tilt]").forEach((el) => tilt(el));

/* ---------- Scroll-linked parallax ---------- */
document.querySelectorAll("[data-parallax]").forEach((el) => {
  if (prefersReducedMotion) return;
  const strength = Number(el.dataset.parallax) || 40;
  const container = el.closest(".showcase") || el.closest("section") || el.parentElement;
  scroll(animate(el, { y: [0, -strength] }, { easing: "linear" }), {
    target: container,
    offset: ["start end", "end start"],
  });
});

/* ---------- Scroll-linked "grow wider" reveal: box widens as it scrolls into place ---------- */
document.querySelectorAll("[data-grow-width]").forEach((el) => {
  if (prefersReducedMotion) return;
  const row = el.closest(".industries__row") || el.parentElement;
  scroll(animate(el, { maxWidth: ["280px", "620px"] }, { easing: "linear" }), {
    target: row,
    offset: ["start 90%", "start 35%"],
  });
});

/* ---------- Timeline: scroll-drawn progress line ---------- */
const timelineWrap = document.querySelector("[data-timeline]");
const timelineProgress = document.querySelector("[data-timeline-progress]");
if (timelineWrap && timelineProgress) {
  if (prefersReducedMotion) {
    timelineProgress.style.transform = "scaleY(1)";
  } else {
    scroll(animate(timelineProgress, { scaleY: [0, 1] }, { easing: "linear" }), {
      target: timelineWrap,
      offset: ["start 75%", "end 60%"],
    });
  }
}

/* ---------- Pricing: count-up + panel crossfade ---------- */
function formatCOP(n) {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

function countUp(el, { duration = 1.1 } = {}) {
  const target = Number(el.dataset.value || 0);
  if (prefersReducedMotion) {
    el.textContent = formatCOP(target);
    return;
  }
  animate(0, target, {
    duration,
    easing: EASE,
    onUpdate: (v) => (el.textContent = formatCOP(v)),
  });
}

function runPanelReveal(panel) {
  panel.querySelectorAll(".js-count").forEach((c) => countUp(c));
  if (prefersReducedMotion) return;
  const items = panel.querySelectorAll(".pricing__list li, .pricing__grand");
  items.forEach((it) => (it.style.opacity = 0));
  animate(items, { opacity: [0, 1], y: [12, 0] }, { duration: 0.5, delay: stagger(0.05), easing: EASE });
}

const pricingBlock = document.querySelector(".pricing");
if (pricingBlock) {
  if (prefersReducedMotion) {
    const activePanel = pricingBlock.querySelector(".pricing__panel.is-active");
    if (activePanel) runPanelReveal(activePanel);
  } else {
    pricingBlock.style.opacity = 0;
    inView(
      pricingBlock,
      () => {
        animate(pricingBlock, { opacity: [0, 1], y: [24, 0] }, { duration: 0.6, easing: EASE });
        const activePanel = pricingBlock.querySelector(".pricing__panel.is-active");
        if (activePanel) runPanelReveal(activePanel);
      },
      { amount: 0.2, margin: "0px 0px -60px 0px" }
    );
  }
}

const tabs = document.querySelectorAll(".pricing__tab");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.classList.contains("is-active")) return;
    const plan = tab.dataset.plan;
    tabs.forEach((t) => {
      t.classList.toggle("is-active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    const current = document.querySelector(".pricing__panel.is-active");
    const next = document.querySelector(`.pricing__panel[data-panel="${plan}"]`);
    if (!next || current === next) return;

    if (prefersReducedMotion) {
      current.classList.remove("is-active");
      next.classList.add("is-active");
      runPanelReveal(next);
      return;
    }

    animate(current, { opacity: [1, 0], y: [0, -10] }, { duration: 0.25, easing: EASE }).then(() => {
      current.classList.remove("is-active");
      next.classList.add("is-active");
      next.style.opacity = 0;
      animate(next, { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, easing: EASE });
      runPanelReveal(next);
    });
  });
});

/* ---------- Case study: fade block + stagger the list ---------- */
const caseBlock = document.querySelector(".case");
if (caseBlock) {
  if (prefersReducedMotion) {
    // stays visible, no motion
  } else {
    const listItems = caseBlock.querySelectorAll(".case__list li");
    caseBlock.style.opacity = 0;
    listItems.forEach((li) => (li.style.opacity = 0));
    inView(
      caseBlock,
      () => {
        animate(caseBlock, { opacity: [0, 1], y: [24, 0] }, { duration: 0.6, easing: EASE });
        animate(listItems, { opacity: [0, 1], x: [-12, 0] }, {
          duration: 0.5,
          delay: stagger(0.08, { startDelay: 0.2 }),
          easing: EASE,
        });
      },
      { amount: 0.2, margin: "0px 0px -60px 0px" }
    );
  }
}

/* ---------- Contact form -> WhatsApp deep link ---------- */
const form = document.getElementById("contactForm");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = document.getElementById("fNombre").value.trim();
    const negocio = document.getElementById("fNegocio").value.trim();
    const mensaje = document.getElementById("fMensaje").value.trim();
    const text = "Hola Ind3finido, soy " + nombre + (negocio ? " de " + negocio : "") + ". " + mensaje;
    const url = "https://wa.me/573143854788?text=" + encodeURIComponent(text);

    const btn = form.querySelector("button[type=submit]");
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Abriendo WhatsApp…";
    if (!prefersReducedMotion) {
      animate(btn, { scale: [1, 0.97, 1] }, { duration: 0.35, easing: EASE });
    }
    window.setTimeout(() => {
      window.open(url, "_blank", "noopener");
      btn.disabled = false;
      btn.textContent = originalLabel;
    }, 380);
  });
}

/* ---------- Custom cursor (desktop only, spring-smoothed via CSS transition) ---------- */
const cursorDot = document.getElementById("cursorDot");
if (cursorDot && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.addEventListener("mousemove", (e) => {
    cursorDot.style.setProperty("--x", e.clientX + "px");
    cursorDot.style.setProperty("--y", e.clientY + "px");
  });
  document
    .querySelectorAll("a, button, input, textarea, .team__card, .pillar, [data-magnetic], [data-tilt]")
    .forEach((el) => {
      el.addEventListener("mouseenter", () => cursorDot.classList.add("is-active"));
      el.addEventListener("mouseleave", () => cursorDot.classList.remove("is-active"));
    });
}

import { animate, inView, scroll, stagger, hover } from "motion";
import { autoInitSmoothScrollHero } from "./smooth-scroll-hero.js";
import { autoInitCarousel3D } from "./carousel-3d.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const perfLite = document.documentElement.classList.contains("perf-lite");
const EASE = [0.16, 0.8, 0.24, 1];

/* ---------- Atmosphere: cursor-driven --atmos-x/y on <html> ----------
   The aurora ::before layers on dark sections read these CSS variables and
   drift toward the pointer. rAF-throttled so mousemove never queues > 1 write
   per frame. Disabled on touch, reduced-motion, and perf-lite devices. */
(function initAtmosphere() {
  if (prefersReducedMotion || perfLite) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const root = document.documentElement;
  let nx = 50, ny = 30, tx = 50, ty = 30, raf = 0;
  function tick() {
    // ease toward target for buttery lag (not literal pointer position)
    nx += (tx - nx) * 0.06;
    ny += (ty - ny) * 0.06;
    root.style.setProperty("--atmos-x", nx.toFixed(2) + "%");
    root.style.setProperty("--atmos-y", ny.toFixed(2) + "%");
    if (Math.abs(tx - nx) > 0.05 || Math.abs(ty - ny) > 0.05) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
    }
  }
  document.addEventListener("mousemove", (e) => {
    tx = (e.clientX / window.innerWidth) * 100;
    ty = (e.clientY / window.innerHeight) * 100;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
})();

/* ---------- Top scroll-progress bar ----------
   A 2px lime line at the very top of the viewport that fills as you scroll the page.
   Purely CSS transform driven by Motion's `scroll()`. */
(function initScrollProgress() {
  if (prefersReducedMotion) return;
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);
  scroll(animate(bar, { scaleX: [0, 1] }, { easing: "linear" }));
})();

/* ---------- Smooth scroll-hero: auto-wire any [data-smooth-scroll-hero] ---------- */
autoInitSmoothScrollHero();

/* ---------- 3D photo carousel: auto-wire any [data-carousel-3d] ---------- */
autoInitCarousel3D();

/* ---------- Footer year ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- Nav: scroll background (always visible, never hides) ---------- */
const nav = document.getElementById("siteNav");
const heroHint = document.querySelector(".hero__scroll-hint");
function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle("is-scrolled", y > 40);
  if (heroHint) heroHint.classList.toggle("is-hidden", y > 100);
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

/* Section-head H1s (used as page titles on quienessomos/portafolio) get the
   same word-by-word blur reveal as the hero H1 — but triggered when they
   enter the viewport, not on load. */
if (!prefersReducedMotion) {
  document.querySelectorAll(".section__head h1").forEach((h1) => {
    const words = splitIntoWords(h1);
    if (!words.length) return;
    words.forEach((w) => (w.style.opacity = 0));
    const filterProps = perfLite ? {} : { filter: ["blur(10px)", "blur(0px)"] };
    inView(
      h1,
      () => animate(
        words,
        { opacity: [0, 1], y: [22, 0], ...filterProps },
        { duration: 0.7, delay: stagger(0.045), easing: EASE }
      ),
      { amount: 0.3, margin: "0px 0px -60px 0px" }
    );
  });
}

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
  let busGlows = [];
  let dropGlow = null;
  let built = false;

  function clearSvg() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    branchGlows = [];
    busGlows = [];
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
    // trunkY sits partway between the cards' bottom edge and the business pill —
    // proportional to the actual gap (not a fixed px offset), so it still lands
    // in the right place when that gap is small (e.g. the tighter mobile layout)
    // instead of ending up above the cards.
    const cardsBottom = Math.max(...cards.map((card) => card.getBoundingClientRect().bottom - rootRect.top));
    const trunkY = cardsBottom + (businessTop - cardsBottom) * 0.45;

    const drawPaths = [];
    const cardXs = [];
    cards.forEach((card) => {
      const r = card.getBoundingClientRect();
      const cx = r.left + r.width / 2 - rootRect.left;
      const cy = r.bottom - rootRect.top;
      cardXs.push(cx);
      // straight drop from each card down to the shared trunk line — no diagonal bend
      const d = `M${cx},${cy} L${cx},${trunkY}`;
      const line = makePath("flowchart__line");
      line.setAttribute("d", d);
      line.setAttribute("data-draw", "");
      drawPaths.push(line);

      const glow = makePath("flowchart__glow");
      glow.setAttribute("d", d);
      branchGlows.push(glow);

      // this card's own horizontal leg along the bus, from its vertical drop
      // to the business pill's x — lets the pulse actually travel sideways
      // instead of jumping straight from the vertical to the center drop.
      const busGlow = makePath("flowchart__glow");
      busGlow.setAttribute("d", `M${cx},${trunkY} L${businessX},${trunkY}`);
      busGlows.push(busGlow);
    });

    // one shared horizontal bus line joining all the drops at trunkY
    const busD = `M${Math.min(...cardXs)},${trunkY} L${Math.max(...cardXs)},${trunkY}`;
    const busLine = makePath("flowchart__line");
    busLine.setAttribute("d", busD);
    busLine.setAttribute("data-draw", "");
    drawPaths.push(busLine);

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
        window.setTimeout(() => {
          const busDuration = firePulse(busGlows[i]);
          window.setTimeout(() => firePulse(dropGlow), busDuration * 1000 * 0.85);
        }, branchDuration * 1000 * 0.85);
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

/* ---------- Hero entrance (plays on load, not on scroll) ----------
   The hero H1 gets a word-by-word blur+slide reveal for premium feel; other
   hero reveals (eyebrow, lead paragraph, CTAs, proof line) use the original
   line-level reveal. Blur is skipped under perf-lite because filter: blur()
   is expensive on low-end GPUs. */
function splitIntoWords(el) {
  const words = [];
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
        else {
          const w = document.createElement("span");
          w.className = "word";
          w.textContent = part;
          frag.appendChild(w);
          words.push(w);
        }
      });
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains("word")) {
      Array.from(node.childNodes).forEach(walk);
    }
  };
  Array.from(el.childNodes).forEach(walk);
  return words;
}

const titleLines = document.querySelectorAll(".hero__title > .reveal");
const otherHeroReveals = document.querySelectorAll(".hero .reveal:not(.hero__title > .reveal)");

if (!prefersReducedMotion) {
  const allWords = [];
  titleLines.forEach((line) => {
    const words = splitIntoWords(line);
    words.forEach((w) => (w.style.opacity = 0));
    allWords.push(...words);
  });
  if (allWords.length) {
    const filterProps = perfLite ? {} : { filter: ["blur(10px)", "blur(0px)"] };
    animate(
      allWords,
      { opacity: [0, 1], y: [22, 0], ...filterProps },
      { duration: 0.7, delay: stagger(0.045, { startDelay: 0.15 }), easing: EASE }
    );
  }
  if (otherHeroReveals.length) {
    animate(
      otherHeroReveals,
      { opacity: [0, 1], y: [26, 0] },
      { duration: 0.8, delay: stagger(0.1, { startDelay: 0.15 + allWords.length * 0.045 * 0.6 }), easing: EASE }
    );
  }
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

/* ---------- Crece: SVG bloom driven by scroll ----------
   Replaces the 80-frame webp sequence with a single inline SVG whose parts
   (stem, leaves, petals, center) animate off a shared --bloom CSS variable
   (0 → 1). Zero image requests; every element renders crisp at any size and
   respects the perf-lite / reduced-motion tiers automatically via CSS. */
(function initFlowerBloom() {
  const svg = document.querySelector("[data-flower-bloom]");
  if (!svg) return;
  const wrap = document.querySelector("[data-grow-scale]");
  const section = document.getElementById("crece");
  if (!section || !wrap) return;

  if (prefersReducedMotion) {
    wrap.style.setProperty("--bloom", "1");
    return;
  }

  // scroll() from motion — same helper the flowchart / timeline use. Progress
  // 0..1 maps across the section's viewport range; bloom completes at the
  // halfway mark, then holds so the finished flower stays on screen while
  // the reader keeps scrolling through the copy.
  scroll(
    (info) => {
      const p = typeof info === "number" ? info : (info && info.y && info.y.progress) || 0;
      const bloom = Math.min(1, Math.max(0, p / 0.5));
      wrap.style.setProperty("--bloom", bloom.toFixed(3));
      const scale = 0.4 + 0.6 * bloom;
      wrap.style.transform = `translateY(-50%) scale(${scale})`;
    },
    { target: section, offset: ["start end", "end start"] }
  );
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

/* ---------- Ambient watchman: cursor-tracking isotipo in the contact section.
   Reads pointer position relative to the section's center, translates the big
   corner isotipo up to 24px toward the cursor and rotates it up to ±2.5deg.
   rAF-eased so motion feels heavy and deliberate rather than jumpy. */
(function initWatchman() {
  const el = document.querySelector("[data-cursor-track]");
  if (!el || prefersReducedMotion || perfLite) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const section = el.closest("section");
  if (!section) return;
  let nx = 0, ny = 0, tx = 0, ty = 0, raf = 0;
  function tick() {
    raf = 0;
    nx += (tx - nx) * 0.08;
    ny += (ty - ny) * 0.08;
    el.style.transform = `translate(${nx.toFixed(2)}px, ${ny.toFixed(2)}px) rotate(${(nx * 0.11).toFixed(2)}deg)`;
    if (Math.abs(tx - nx) > 0.15 || Math.abs(ty - ny) > 0.15) raf = requestAnimationFrame(tick);
  }
  section.addEventListener("mousemove", (e) => {
    const r = section.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5 → 0.5
    const py = (e.clientY - r.top)  / r.height - 0.5;
    tx = px * 48;   // max ±24px lateral
    ty = py * 32;   // max ±16px vertical
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
  section.addEventListener("mouseleave", () => {
    tx = 0; ty = 0;
    if (!raf) raf = requestAnimationFrame(tick);
  });
})();

/* ---------- Spotlight: cursor-follow radial glow on cards ----------
   Sets --mx/--my as percentages of the card's own bounding box; the CSS
   ::after pseudo picks them up. Desktop-only, skipped under perf-lite. */
(function initSpotlight() {
  if (prefersReducedMotion || perfLite) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const cards = document.querySelectorAll(
    ".pillar, .team__card, .mv__card, .contact__row, .showcase__card, .flowchart__card, .contact__form"
  );
  cards.forEach((card) => {
    card.addEventListener(
      "pointermove",
      (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      },
      { passive: true }
    );
  });
})();

/* ---------- Scroll-linked parallax ---------- */
/* Desktop-only: on narrow/reflowed mobile layouts the vertical spacing this
   relies on doesn't hold, and the translate can overshoot into content
   above it (e.g. the showcase columns overlapping the case-study text). */
document.querySelectorAll("[data-parallax]").forEach((el) => {
  if (prefersReducedMotion) return;
  if (!window.matchMedia("(min-width: 981px)").matches) return;
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

/* Pricing tabs: sliding pill indicator that tracks the active tab.
   Positioned via inline transform+width so it works in both the desktop
   row layout and the stacked mobile layout without extra media queries. */
const tabsBar = document.querySelector(".pricing__tabs");
let tabIndicator = null;
if (tabsBar) {
  tabIndicator = document.createElement("span");
  tabIndicator.className = "pricing__tab-indicator";
  tabIndicator.setAttribute("aria-hidden", "true");
  tabsBar.prepend(tabIndicator);
}
function positionTabIndicator(instant = false) {
  if (!tabsBar || !tabIndicator) return;
  const active = tabsBar.querySelector(".pricing__tab.is-active");
  if (!active) return;
  const parentRect = tabsBar.getBoundingClientRect();
  const r = active.getBoundingClientRect();
  const x = r.left - parentRect.left;
  const y = r.top - parentRect.top;
  if (instant) {
    const prev = tabIndicator.style.transition;
    tabIndicator.style.transition = "none";
    tabIndicator.style.transform = `translate(${x}px, ${y}px)`;
    tabIndicator.style.width = r.width + "px";
    tabIndicator.style.height = r.height + "px";
    // force reflow, then restore
    void tabIndicator.offsetWidth;
    tabIndicator.style.transition = prev;
  } else {
    tabIndicator.style.transform = `translate(${x}px, ${y}px)`;
    tabIndicator.style.width = r.width + "px";
    tabIndicator.style.height = r.height + "px";
  }
  tabIndicator.classList.add("is-ready");
}
// initial placement — wait for webfonts so the tab widths are accurate
requestAnimationFrame(() => positionTabIndicator(true));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => positionTabIndicator(true));
window.addEventListener("resize", () => positionTabIndicator(true), { passive: true });

const tabs = document.querySelectorAll(".pricing__tab");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.classList.contains("is-active")) return;
    const plan = tab.dataset.plan;
    tabs.forEach((t) => {
      t.classList.toggle("is-active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    positionTabIndicator();
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

/* ---------- Contact: live WhatsApp message preview ----------
   Renders the exact string that will be sent to WhatsApp, updating on every
   keystroke. Hidden until the user has typed at least one character in any
   field. Placeholders (…) fill blanks so the sentence still reads. */
(function initMessagePreview() {
  const preview = document.querySelector("[data-preview]");
  const previewText = document.querySelector("[data-preview-text]");
  const nombreEl = document.getElementById("fNombre");
  const negocioEl = document.getElementById("fNegocio");
  const mensajeEl = document.getElementById("fMensaje");
  if (!preview || !previewText || !nombreEl || !negocioEl || !mensajeEl) return;
  function update() {
    const n = nombreEl.value.trim();
    const b = negocioEl.value.trim();
    const m = mensajeEl.value.trim();
    if (!n && !b && !m) { preview.classList.remove("is-visible"); return; }
    previewText.textContent =
      "Hola Ind3finido, soy " + (n || "…") +
      (b ? " de " + b : "") + ". " +
      (m || "…");
    preview.classList.add("is-visible");
  }
  [nombreEl, negocioEl, mensajeEl].forEach((el) => el.addEventListener("input", update));
})();

/* ---------- Contact: textarea autosize ----------
   Grows the mensaje field with the content so users see their full message
   without an inner scrollbar. */
(function initTextareaAutosize() {
  const ta = document.getElementById("fMensaje");
  if (!ta) return;
  function fit() {
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }
  ta.addEventListener("input", fit);
  // fit once in case of pre-filled or restored values
  setTimeout(fit, 0);
})();

/* ---------- Submit button: cursor spotlight ----------
   Same --mx/--my pattern as the card spotlights, contained by the button's
   own rounded rect via .btn--spotlight::before. Desktop-only. */
(function initSubmitSpotlight() {
  if (prefersReducedMotion || perfLite) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.querySelectorAll(".btn--spotlight").forEach((btn) => {
    btn.addEventListener(
      "pointermove",
      (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        btn.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      },
      { passive: true }
    );
  });
})();

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

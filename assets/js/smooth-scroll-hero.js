/* Smooth scroll-hero — vanilla JS port of the React component.
   As the user scrolls through the section, an inset rectangular clip-path
   expands from a small centered window (initial 25%→75%) to full viewport
   (0%→100%), revealing the background photo. Meanwhile the photo's
   background-size shrinks from 170% to 100% for a subtle zoom-out parallax.

   Any element with [data-smooth-scroll-hero] auto-initializes. Data-attrs:
     data-scroll-height        (px, default 1500)   how much scroll to fully reveal
     data-initial-clip         (%,  default 25)     starting inset corner
     data-final-clip           (%,  default 75)     starting opposite corner
     data-desktop              (url)                bg for ≥768px
     data-mobile               (url)                bg for <768px

   Uses element-relative scroll offset (getBoundingClientRect().top) so it
   works no matter where in the page it's placed — the original React
   component tied the effect to window scrollY:0 which only made sense
   as the very first section. */
export function initSmoothScrollHero(root, opts = {}) {
  const scrollHeight = Number(opts.scrollHeight ?? root.dataset.scrollHeight ?? 1500);
  const startPct    = Number(opts.initialClipPercentage ?? root.dataset.initialClip ?? 25);
  const endPct      = Number(opts.finalClipPercentage   ?? root.dataset.finalClip   ?? 75);
  const desktop     = opts.desktopImage ?? root.dataset.desktop ?? "";
  const mobile      = opts.mobileImage  ?? root.dataset.mobile  ?? desktop;
  // fit=cover (default): photo-style bg, zoom from 170% → 100%
  // fit=contain: transparent PNG/shape on black, grows from 55% → 75%
  const fit         = opts.fit ?? root.dataset.fit ?? "cover";
  if (fit === "contain") root.classList.add("ssh--contain");

  root.style.height = `calc(${scrollHeight}px + 100vh)`;

  const sticky   = root.querySelector(".ssh__sticky");
  const bgDesk   = root.querySelector(".ssh__bg--desktop");
  const bgMobile = root.querySelector(".ssh__bg--mobile");
  if (!sticky) return;

  if (desktop && bgDesk)   bgDesk.style.backgroundImage   = `url("${desktop}")`;
  if (mobile  && bgMobile) bgMobile.style.backgroundImage = `url("${mobile}")`;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lite    = document.documentElement.classList.contains("perf-lite");

  // Slow / reduced-motion / low-power → skip the reveal, show the photo statically.
  // The sticky container still occupies one viewport height so the layout is unchanged.
  if (reduced || lite) {
    sticky.style.clipPath = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
    sticky.style.setProperty("--ssh-bg-size", fit === "contain" ? "70%" : "100%");
    // don't need the extra scroll height when there's no scroll-driven effect
    root.style.height = "100vh";
    return;
  }

  let raf = 0;
  function apply() {
    raf = 0;
    const rect = root.getBoundingClientRect();
    const scrolled = -rect.top;
    const t   = Math.max(0, Math.min(1, scrolled / scrollHeight));
    const tBg = Math.max(0, Math.min(1, scrolled / (scrollHeight + 500)));
    const cs  = startPct * (1 - t);
    const ce  = endPct + (100 - endPct) * t;
    // cover: 170% → 100% (photo zooms out); contain: 55% → 75% (shape grows in)
    const bg  = fit === "contain" ? (55 + 20 * tBg) : (170 - 70 * tBg);
    sticky.style.clipPath = `polygon(${cs}% ${cs}%, ${ce}% ${cs}%, ${ce}% ${ce}%, ${cs}% ${ce}%)`;
    sticky.style.setProperty("--ssh-bg-size", bg.toFixed(2) + "%");
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(apply); }

  document.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  apply();
}

/* Auto-init: run once DOM is ready. */
export function autoInitSmoothScrollHero() {
  document.querySelectorAll("[data-smooth-scroll-hero]").forEach((el) => initSmoothScrollHero(el));
}

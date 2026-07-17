/* 3D photo carousel — vanilla port of the React ThreeDPhotoCarousel.
   Positions N cards in a cylindrical ring (rotateY + translateZ) around a
   central perspective. Pointer-drag rotates the whole ring; release applies
   spring momentum via Motion. Click a card to open a lightbox with a
   fade+scale transition. Reduced-motion / perf-lite: skips 3D, falls back to
   a horizontal scroll strip.

   Any element with [data-carousel-3d] auto-initializes on page load. It
   should contain a .c3d__stage > .c3d__track > .c3d__card... structure
   already populated in HTML (the card list is authored, not JS-generated,
   so images ship with the initial payload and progressive enhancement
   works without JS). */
import { animate } from "motion";

export function initCarousel3D(root) {
  const stage = root.querySelector(".c3d__stage");
  const track = root.querySelector(".c3d__track");
  const cards = Array.from(root.querySelectorAll(".c3d__card"));
  if (!stage || !track || !cards.length) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lite    = document.documentElement.classList.contains("perf-lite");
  if (reduced || lite) {
    root.classList.add("carousel3d--fallback");
    return;
  }

  const isSmall = matchMedia("(max-width: 640px)").matches;
  const cylinderWidth = isSmall ? 1100 : 1800;
  const N = cards.length;
  const faceWidth = cylinderWidth / N;
  const radius = cylinderWidth / (2 * Math.PI);

  track.style.width = cylinderWidth + "px";
  cards.forEach((card, i) => {
    const angle = (i * 360) / N;
    card.style.width = faceWidth + "px";
    // translateX(-50%) recenters the card on the track midline (its left is
    // at 50%); rotateY then translateZ project it out along the ring.
    card.style.transform = `translateX(-50%) rotateY(${angle}deg) translateZ(${radius}px)`;
  });

  let rotation = 0;
  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startRotation = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let releaseAnim = null;
  let downTargetCard = null;
  let downX = 0;
  let dragMovedFar = false;

  function apply() {
    track.style.transform = `rotate3d(0, 1, 0, ${rotation}deg)`;
  }
  apply();

  // We listen for pointermove/pointerup on window instead of using pointer
  // capture on root — capture makes the browser retarget the subsequent
  // click event onto the capturing element, which swallowed anchor-card
  // navigation. Window listeners work outside root (drag can leave the
  // carousel and still track) without hijacking click.
  root.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (releaseAnim) { releaseAnim.stop(); releaseAnim = null; }
    dragging = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startRotation = rotation;
    lastX = e.clientX;
    lastT = performance.now();
    velocity = 0;
    downTargetCard = e.target.closest(".c3d__card");
    downX = e.clientX;
    dragMovedFar = false;
  });

  function onMove(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    // drag 1px → 0.05deg (same coefficient as the source component)
    rotation = startRotation + (e.clientX - startX) * 0.05;
    if (Math.abs(e.clientX - startX) > 6) dragMovedFar = true;
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    velocity = (e.clientX - lastX) / dt; // px per ms
    lastX = e.clientX;
    lastT = now;
    apply();
  }
  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== pointerId)) return;
    dragging = false;
    pointerId = null;
    // spring release — velocity is px/ms; multiplied out to match the source's
    // deg-per-px response over one animation frame.
    const kickDeg = velocity * 16 * 0.05 * 12;
    const target = rotation + kickDeg;
    releaseAnim = animate(rotation, target, {
      type: "spring", stiffness: 100, damping: 30, mass: 0.1,
      onUpdate: (v) => { rotation = v; apply(); },
      onComplete: () => { releaseAnim = null; }
    });
  }
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  // Click handling — cards are <a> anchors, so the browser handles navigation.
  // We only preventDefault when the pointer actually moved during the drag,
  // so a genuine click still opens the site in a new tab.
  root.addEventListener("click", (e) => {
    if (!e.target.closest(".c3d__card")) return;
    if (dragMovedFar) e.preventDefault();
  });

  /* Idle auto-rotation. Runs a persistent rAF that increments rotation by
     SPIN_DEG_PER_FRAME each tick — unless one of the pause conditions is
     true. The rAF stays scheduled while paused (cheap early-return) so
     resume is instant when the condition clears. */
  const SPIN_DEG_PER_FRAME = 0.12; // ~7°/sec at 60fps → ~50s per full rotation
  let isHovered = false;
  let isVisible = true;
  function idleTick() {
    requestAnimationFrame(idleTick);
    if (dragging || releaseAnim || isHovered || !isVisible || document.hidden) return;
    rotation += SPIN_DEG_PER_FRAME;
    apply();
  }
  idleTick();
  // Hover-pause on desktop so a moving target isn't hard to click. On touch,
  // pointerenter fires on tap-and-hold — that's fine since a tap-hold on a
  // card is either a drag or a click; both already pause via other flags.
  root.addEventListener("pointerenter", () => { isHovered = true; });
  root.addEventListener("pointerleave", () => { isHovered = false; });
  // Off-screen: don't burn frames when the section isn't visible.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => { entries.forEach((e) => { isVisible = e.isIntersecting; }); },
      { threshold: 0.01 }
    ).observe(root);
  }
}

export function autoInitCarousel3D() {
  document.querySelectorAll("[data-carousel-3d]").forEach((el) => initCarousel3D(el));
}

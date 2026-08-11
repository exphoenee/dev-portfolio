/* ============================================================
   PROJECTS CAROUSEL, ported from the CV repo's index page.

   A 3D coverflow: one active slide in front, prev/next flanking
   it rotated, everything else hidden. Interactions (all from the
   CV original):
     - prev / next arrow buttons
     - dots (created per slide)
     - click a flanking slide to advance toward it
     - drag / swipe with pointer or touch — the coverflow follows the
       finger (--drag-x), release past the threshold pages, otherwise
       it snaps back
   Added here: arrow-key / Home / End keyboard support and focus
   management (only the active slide stays focusable).

   The stage is rebuilt whenever the grid re-renders (filter change,
   view switch), so initCarousel() is called from renderProjects()
   after each render — it wires everything onto the fresh nodes.

   Everything is looked up by class inside the root passed in, so the
   same code drives the projects coverflow and the skills one. The only
   per-carousel text is the dot label, taken from the dots container's
   data-label-key.
   ============================================================ */

import { $, $$, t } from '../dom.js';

/* Only the active slide participates in tab order; flanking slides are
   clickable for quick advance but not focusable, hidden ones neither.
   Original tabindex values (card tabs keep a roving 0/-1, the desc panel
   is a focusable tabindex="0") are remembered in data-tabindex so the
   active slide restores exactly what the markup declared. */
function setSlideFocus(slide, active) {
  slide.setAttribute('aria-hidden', active ? 'false' : 'true');
  $$('a, button, [tabindex]', slide).forEach((el) => {
    if (active) {
      const orig = el.dataset.tabindex;
      if (orig === undefined || orig === '') el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', orig);
    } else {
      if (el.dataset.tabindex === undefined) el.dataset.tabindex = el.getAttribute('tabindex') ?? '';
      el.setAttribute('tabindex', '-1');
    }
  });
}

export function initCarousel(root) {
  const stage = $('.carousel-stage', root);
  if (!stage) return;

  const slides = $$('.carousel-slide', stage);
  const dotsWrap = $('.carousel-dots', root);
  const prevBtn = $('.carousel-prev', root);
  const nextBtn = $('.carousel-next', root);
  const N = slides.length;
  if (!N || !dotsWrap || !prevBtn || !nextBtn) return;

  let current = 0;

  const mod = (n, m) => ((n % m) + m) % m;

  function goTo(idx) {
    current = mod(idx, N);
    const prev = mod(current - 1, N);
    const next = mod(current + 1, N);
    slides.forEach((slide, i) => {
      let state;
      if (i === current) state = 'active';
      else if (i === prev) state = 'prev';
      else if (i === next) state = 'next';
      else state = mod(i - current, N) <= Math.floor(N / 2) ? 'hidden-next' : 'hidden-prev';
      slide.dataset.state = state;
      setSlideFocus(slide, state === 'active');
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  const dotLabelKey = dotsWrap.dataset.labelKey || 'carousel.dotLabel';
  const dots = slides.map((_, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'carousel-dot';
    d.setAttribute('aria-label', `${t(dotLabelKey)} ${i + 1}`);
    d.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(d);
    return d;
  });

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  /* Click a flanking slide to advance. The active slide must keep its own
     buttons (tabs, zoom, links) working, so only prev/next are intercepted.
     stopPropagation keeps the grid-level tab / zoom delegation (wired once
     on #projects-grid) from also reacting to a flanking-slide click. */
  stage.addEventListener('click', (e) => {
    const slide = e.target.closest('.carousel-slide');
    if (!slide) return;
    const state = slide.dataset.state;
    if (state === 'prev' || state === 'next') {
      e.preventDefault();
      e.stopPropagation();
      goTo(current + (state === 'next' ? 1 : -1));
    }
  });

  /* Drag / swipe, unified by Pointer Events (touch + mouse). The whole
     coverflow shifts with the finger through --drag-x, and releasing past
     the threshold pages; a short drag snaps back. Vertical scrolling stays
     the browser's job — the stage and slides carry touch-action: pan-y, so
     a vertical gesture fires pointercancel and never drags the cards. */
  /* Real rendered width of one slide. The --slide-w custom property is
     NOT read here: getComputedStyle returns custom properties unresolved
     (e.g. "78vw" on phones, which parses to 78 instead of the ~300px the
     slide really is). offsetWidth is measured once per gesture so resize /
     media queries are picked up without a resize listener. */
  let slideW = 360;
  const measureSlide = () => { slideW = slides[0].offsetWidth || 360; };
  measureSlide();

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const drag = { active: false, startX: 0, startY: 0, moved: false, suppress: false };

  stage.addEventListener('pointerdown', (e) => {
    if (drag.active) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    measureSlide();
    drag.active = true;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.moved = false;
    drag.suppress = false;
    /* No setPointerCapture here, deliberately. While the stage holds the
       capture, the browser retargets the whole gesture onto it — including
       the click that ends it — so a plain tap on a card tab, link or the
       zoom button arrived at the stage and the button never fired. The
       capture is taken in pointermove instead, once the gesture is a real
       horizontal drag; a tap never reaches that point. */
  });

  stage.addEventListener('pointermove', (e) => {
    if (!drag.active) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical intent — let the browser scroll; it fires pointercancel.
        drag.active = false;
        return;
      }
      drag.moved = true;
      stage.classList.add('is-dragging');
      /* Now that this is a drag and not a tap, capture: the rest of the
         gesture keeps coming to the stage even if the finger leaves it, and
         the click it ends with is swallowed below (drag.suppress). */
      try { stage.setPointerCapture(e.pointerId); } catch { /* synthetic or unsupported pointers */ }
    }
    if (Math.abs(dx) > 8) drag.suppress = true;
    stage.style.setProperty('--drag-x', `${clamp(dx, -slideW * 0.5, slideW * 0.5)}px`);
  });

  function releaseDrag(dx) {
    if (!drag.active) return;
    drag.active = false;
    stage.classList.remove('is-dragging');
    if (!drag.moved) return;
    stage.style.setProperty('--drag-x', '0px');
    if (Math.abs(dx) >= Math.max(40, slideW * 0.18)) {
      goTo(dx < 0 ? current + 1 : current - 1);
    }
  }

  stage.addEventListener('pointerup', (e) => releaseDrag(e.clientX - drag.startX));
  stage.addEventListener('pointercancel', () => {
    if (!drag.active) return;
    drag.active = false;
    stage.classList.remove('is-dragging');
    stage.style.setProperty('--drag-x', '0px');
  });

  /* A real drag ends with a click on whatever was under the finger (a
     link, the media button, a flanking slide) — that would navigate, open
     the lightbox or advance twice. A capture-phase click swallows exactly
     that one click after a drag; a plain tap leaves suppress off and works
     normally (tabs, zoom, flanking advance). */
  stage.addEventListener('click', (e) => {
    if (drag.suppress) {
      e.preventDefault();
      e.stopPropagation();
      drag.suppress = false;
    }
  }, true);

  /* The native HTML5 drag (images, links) would fight the pointer drag. */
  stage.addEventListener('dragstart', (e) => e.preventDefault());

  /* Keyboard: arrows wrap, Home/End jump. The stage region carries
     tabindex="0" and the nav arrows are plain buttons, so after clicking an
     arrow the focus sits on that button — a following ArrowRight/Left must
     keep navigating instead of stalling. A focused card tab keeps its own
     roving arrow keys (the grid-level tab handler owns those), and a
     focused link/button inside the active card should not hijack the
     arrows either, so only stage and nav-button targets are handled here. */
  [stage, prevBtn, nextBtn].forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.target.closest('.card-tab')) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(current + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(current - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goTo(N - 1);
      }
    });
  });

  goTo(0);
}

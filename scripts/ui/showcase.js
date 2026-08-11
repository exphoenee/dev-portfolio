/* ============================================================
   HERO SHOWCASE, the second window under the zsh terminal.

   A deck of every project: the top card is flicked out of the
   frame, spins right round and slides back underneath the pile,
   then works its way up one place per deal until it is on top
   again.

   The motion is a CSS animation, but the keyframes are built here
   rather than written in portfolio.css. They cannot be static: the
   percentages depend on how many cards are in the deck (one slot
   each), so with the deck following the data — 22 projects today —
   a hand-written @keyframes block would silently drift out of sync
   the moment a project is added. Everything below is generated
   once, at render, and injected as a stylesheet; from there on the
   browser animates it like any other CSS.

   Layout (the window, the stage, the card box) stays in
   portfolio.css.
   ============================================================ */

import { $ } from '../dom.js';
import { PROJECTS } from '../../data/portfolio-data.js';
import { openImageModal } from '../modals/image.js';
import { cardTitle } from '../render/projects.js';

const SLOT_S = 2;        // seconds a card spends on top, i.e. one deal
const FAN = 6;           // cards visible in the pile; the rest are inside it
const ROT_PER_DEPTH = 2.6;    // deg, how far each card is turned under the one above
const SCALE_PER_DEPTH = 0.018;
const SHIFT_PER_DEPTH = 0.6;  // %

/* The pile is a fan: each card is rotated about its own centre a little
   further than the one above it, so its top-right corner clears the card
   covering it. The rotation is written as 360deg - n, not -n, so the whole
   cycle is one continuous clockwise turn: 0deg on top → 360deg tucked back
   under the deck → 360deg on top again. Interpolating through -13deg
   instead would spin the card the long way round while it is visible. */
function depth(d) {
  return {
    z: 30 - d,
    t: `translateY(${(d * SHIFT_PER_DEPTH).toFixed(2)}%) scale(${(1 - d * SCALE_PER_DEPTH).toFixed(3)}) rotate(${(360 - d * ROT_PER_DEPTH).toFixed(2)}deg)`
  };
}

/* A card inside the deck must not cast a shadow: the tucked cards all sit
   in the same spot under the top one, and fifteen stacked shadows would
   bleed out around it as a dark halo. It comes back with the card. */
const SHADOW = '0 18px 40px rgba(0, 0, 0, 0.45)';
const NO_SHADOW = '0 0 0 rgba(0, 0, 0, 0)';

/* The flight, in slot units (1 = one deal). It spins the whole way: out of
   the frame top-right, round the back, and in again from the bottom-right,
   finishing square and slightly smaller than the top card, so the tucked
   card is hidden by the pile itself — no fading needed. */
const FLIGHT = [
  [0, 40, 'translate(0, 0) scale(1) rotate(0deg)', SHADOW],
  [0.3, 40, 'translate(78%, -50%) scale(1.03) rotate(34deg)', SHADOW],
  [0.55, 40, 'translate(140%, -88%) scale(1) rotate(86deg)', SHADOW],
  // out of sight from here: this is where it drops to the bottom of the deck
  [0.65, 22, 'translate(128%, -30%) scale(0.97) rotate(150deg)', SHADOW],
  [0.85, 22, 'translate(86%, 52%) scale(0.93) rotate(246deg)', SHADOW],
  [1.05, 22, 'translate(30%, 26%) scale(0.9) rotate(316deg)', SHADOW],
  [1.25, 22, 'translate(0, 0) scale(0.88) rotate(360deg)', NO_SHADOW]
];

/* Cards step up together, in the first 0.32 of a slot — that shared jump is
   what reads as a deal rather than a slow drift. */
const STEP = 0.32;

function buildKeyframes(count, fan) {
  const pct = (slots) => `${((slots * 100) / count).toFixed(3)}%`;
  const frame = (at, z, t, shadow) =>
    `  ${pct(at)} { z-index: ${z}; transform: ${t}; box-shadow: ${shadow}; }`;
  const rows = FLIGHT.map((f) => frame(...f));

  // Parked under the pile until its place at the back of the fan frees up.
  const emerge = count - fan;
  const [, tuckZ, tuckT, tuckShadow] = FLIGHT[FLIGHT.length - 1];
  rows.push(frame(emerge, tuckZ, tuckT, tuckShadow));

  // Back of the fan, then one step up per slot until it is on top again.
  for (let k = 0; k < fan; k++) {
    const d = depth(fan - 1 - k);
    rows.push(frame(emerge + k + STEP, d.z, d.t, SHADOW));
    rows.push(frame(emerge + k + 1, d.z, d.t, SHADOW));
  }

  return `@keyframes showcase-deal {\n${rows.join('\n')}\n}`;
}

export function renderShowcase() {
  const stage = $('#showcase-stage');
  if (!stage) return;

  const projects = PROJECTS.filter((p) => p.image);
  const count = projects.length;
  if (!count) return;
  // Two cards are always mid-flight or tucked, so a very short deck needs a
  // shallower fan for the schedule to stay sane.
  const fan = Math.max(2, Math.min(FAN, count - 2));

  /* Only the first few cards are needed in the opening seconds; the rest are
     ~1.4MB of thumbnails that would otherwise all be fetched at once, in the
     hero, on first paint. They get their src once the page has loaded, long
     before their turn comes around (a card every 2s). */
  const eager = fan + 2;
  stage.innerHTML = projects
    .map((p, i) => {
      const src = p.image.replace('/large/', '/small/');
      const attr = i < eager ? `src="${src}"` : `data-src="${src}"`;
      // data-id, not a baked-in title: the lightbox caption is resolved on
      // click so it follows a language switch without re-rendering the deck.
      return `<img class="showcase-img" style="--i: ${i}" data-id="${p.id}" ${attr} alt="" loading="lazy" decoding="async">`;
    })
    .join('');

  const load = () => {
    stage.querySelectorAll('img[data-src]').forEach((img) => {
      img.src = img.dataset.src;
      delete img.dataset.src;
    });
  };
  if (document.readyState === 'complete') load();
  else window.addEventListener('load', load, { once: true });

  /* Clicking a card opens the same lightbox the project cards use, on the
     large/ image. Delegated to the stage, which survives re-renders, so it
     is wired once (the deck is decoration inside an aria-hidden column, so
     there is no keyboard path here on purpose — the same projects are
     reachable as real cards in the projects section). */
  if (!stage.dataset.wired) {
    stage.dataset.wired = '1';
    stage.addEventListener('click', (e) => {
      const card = e.target.closest('.showcase-img');
      if (!card) return;
      const project = PROJECTS.find((p) => p.id === card.dataset.id);
      if (!project) return;
      openImageModal(project.image, cardTitle(project));
    });
  }

  stage.style.setProperty('--showcase-cycle', `${count * SLOT_S}s`);
  stage.style.setProperty('--showcase-count', count);

  let sheet = $('#showcase-keyframes');
  if (!sheet) {
    sheet = document.createElement('style');
    sheet.id = 'showcase-keyframes';
    document.head.appendChild(sheet);
  }
  sheet.textContent = buildKeyframes(count, fan);
}

/* ============================================================
   RENDER TIMELINE
   ============================================================ */

import { $, $$, t, esc } from '../dom.js';
import { locale } from '../locale.js';
import { TIMELINE } from '../../data/portfolio-data.js';
import { state, setTimelineView } from '../state.js';

import { revealIn } from '../ui/reveal.js';

function timelineItem(item, index) {
  const period = item.period[locale.lang] || item.period.en;
  const title = item.title[locale.lang] || item.title.en;
  const desc = item.desc[locale.lang] || item.desc.en;
  const badge = item.current ? `<span class="timeline-badge">${esc(t('timeline.current'))}</span>` : '';
  /* The rail alternates sides, so each card comes in from its own side of
     the page and the two columns meet in the middle. */
  const from = index % 2 === 0 ? 'fade-right' : 'fade-left';
  return `
    <div class="timeline-item">
      <span class="timeline-dot" aria-hidden="true"></span>
      <div class="timeline-card" data-reveal="${from}">
        <div class="timeline-head">
          <span class="timeline-period">${esc(period)}</span>
          ${badge}
        </div>
        <h3 class="timeline-role">${esc(title)}</h3>
        <div class="timeline-company">${esc(item.company)}</div>
        <p class="timeline-desc">${esc(desc)}</p>
      </div>
    </div>`;
}

/* The compact view drops the description; the cards themselves are the same
   markup, so it is a class on the list and CSS does the hiding — no
   re-render, no lost reveal state when the visitor flips the switch. */
export function renderTimeline() {
  const list = $('#timeline-list');
  if (!list) return;
  list.classList.toggle('is-compact', state.timelineView === 'compact');
  list.innerHTML = TIMELINE.map(timelineItem).join('');
  revealIn(list);
}

export function initTimelineView() {
  const toolbar = $('.timeline-toolbar');
  const list = $('#timeline-list');
  if (!toolbar || !list) return;
  const buttons = $$('.view-toggle-btn', toolbar);
  const sync = () => {
    buttons.forEach((btn) => {
      const active = btn.dataset.detail === state.timelineView;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });
    list.classList.toggle('is-compact', state.timelineView === 'compact');
  };
  sync();
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setTimelineView(btn.dataset.detail);
      sync();
    });
  });
}

/* Language switch: same DOM, new text. The entries keep their order, so
   index maps card to data. */
export function updateTimelineText() {
  const list = $('#timeline-list');
  if (!list) return;
  $$('.timeline-card', list).forEach((card, i) => {
    const item = TIMELINE[i];
    if (!item) return;
    $('.timeline-period', card).textContent = item.period[locale.lang] || item.period.en;
    $('.timeline-role', card).textContent = item.title[locale.lang] || item.title.en;
    $('.timeline-desc', card).textContent = item.desc[locale.lang] || item.desc.en;
    const badge = $('.timeline-badge', card);
    if (badge) badge.textContent = t('timeline.current');
  });
}

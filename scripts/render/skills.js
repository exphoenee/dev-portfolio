/* ============================================================
   RENDER SKILLS

   Two views, like the projects section: the classic grid of chip
   groups, or the same coverflow carousel (scripts/ui/carousel.js)
   with one group per slide. state.skillsView is the source of truth
   and is persisted; it defaults to the grid on desktop and to the
   carousel on phones.
   ============================================================ */

import { $, $$, t, esc } from '../dom.js';
import { SKILLS } from '../../data/portfolio-data.js';
import { techIconSrc } from '../tech-icons.js';
import { revealIn } from '../ui/reveal.js';
import { wireImageLoaders } from '../ui/image-loader.js';
import { initCarousel } from '../ui/carousel.js';
import { state, setSkillsView } from '../state.js';

function skillChip(chip) {
  const icon = techIconSrc(chip.label);
  return `<span class="chip">${icon ? `<img src="${esc(icon)}" alt="" loading="lazy">` : ''}${esc(chip.label)}</span>`;
}

/* One group. `carousel` adds the slide class and drops the scroll reveal
   attributes — the carousel stage positions the slides itself and a reveal
   transform would fight the coverflow transforms. */
function skillGroup(group, index, carousel = false) {
  const slideClass = carousel ? ' carousel-slide' : '';
  const reveal = carousel ? '' : ` data-reveal="fade-up" data-reveal-delay="${(index % 3) * 60}"`;
  return `
    <div class="skill-group${slideClass}"${reveal}>
      <h3 class="skill-group-title">${esc(t(group.titleKey))}</h3>
      <div class="skill-chips">
        ${group.chips.map(skillChip).join('')}
      </div>
    </div>`;
}

/* Carousel shell: the stage plus the nav row, same structure the projects
   carousel uses (scripts/ui/carousel.js looks everything up by class). The
   dots are created by that module, from data-label-key. */
function carouselShell(groups) {
  return `
    <div class="projects-carousel skills-carousel">
      <div class="carousel-stage" role="region" aria-label="${esc(t('carousel.skillsStageAria'))}" tabindex="0">
        ${groups.map((g, i) => skillGroup(g, i, true)).join('')}
      </div>
      <div class="carousel-nav" role="group" aria-label="${esc(t('carousel.navAria'))}">
        <button type="button" class="carousel-arrow carousel-prev" aria-label="${esc(t('carousel.skillsPrevAria'))}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="carousel-dots" data-label-key="carousel.skillsDotLabel" role="group" aria-label="${esc(t('carousel.skillsDotsAria'))}"></div>
        <button type="button" class="carousel-arrow carousel-next" aria-label="${esc(t('carousel.skillsNextAria'))}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>
    </div>`;
}

export function renderSkills() {
  const wrap = $('#skills-groups');
  if (!wrap) return;
  const carousel = state.skillsView === 'carousel';
  wrap.classList.toggle('is-carousel', carousel);
  wrap.innerHTML = carousel
    ? carouselShell(SKILLS)
    : SKILLS.map((group, i) => skillGroup(group, i)).join('');

  revealIn(wrap);
  wireImageLoaders(wrap);
  if (carousel) initCarousel(wrap);
}

/* The toggle is wired once; the buttons live in the static markup, so only
   the section is re-rendered on a switch. */
export function initSkillsView() {
  const toolbar = $('.skills-toolbar');
  if (!toolbar) return;
  const buttons = $$('.view-toggle-btn', toolbar);
  const sync = () => {
    buttons.forEach((btn) => {
      const active = btn.dataset.view === state.skillsView;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });
  };
  sync();
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setSkillsView(btn.dataset.view);
      sync();
      renderSkills();
    });
  });
}

/* Only the group headings are translated, the chip labels are product
   names, identical in every language. The carousel chrome (stage, nav and
   dot labels) is baked at render time, so a language switch refreshes it
   here too. */
export function updateSkillsText() {
  const wrap = $('#skills-groups');
  if (!wrap) return;
  $$('.skill-group-title', wrap).forEach((el, i) => {
    if (SKILLS[i]) el.textContent = t(SKILLS[i].titleKey);
  });

  if (!wrap.classList.contains('is-carousel')) return;
  const stage = $('.carousel-stage', wrap);
  if (stage) stage.setAttribute('aria-label', t('carousel.skillsStageAria'));
  const nav = $('.carousel-nav', wrap);
  if (nav) nav.setAttribute('aria-label', t('carousel.navAria'));
  const dots = $('.carousel-dots', wrap);
  if (dots) dots.setAttribute('aria-label', t('carousel.skillsDotsAria'));
  const prev = $('.carousel-prev', wrap);
  if (prev) prev.setAttribute('aria-label', t('carousel.skillsPrevAria'));
  const next = $('.carousel-next', wrap);
  if (next) next.setAttribute('aria-label', t('carousel.skillsNextAria'));
  $$('.carousel-dot', wrap).forEach((dot, i) => {
    dot.setAttribute('aria-label', `${t('carousel.skillsDotLabel')} ${i + 1}`);
  });
}

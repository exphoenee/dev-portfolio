/* ============================================================
   RENDER PROJECTS, cards, category filter, view toggle and
   card interactions. The icon maps below are view-only
   decoration for the cards.
   ============================================================ */

import { $, $$, t, esc } from '../dom.js';
import { locale } from '../locale.js';
import { state, tabFor, setView } from '../state.js';
import { PROJECTS } from '../../data/portfolio-data.js';
import { techIconSrc } from '../tech-icons.js';
import { openImageModal } from '../modals/image.js';
import { revealIn } from '../ui/reveal.js';
import { wireImageLoaders } from '../ui/image-loader.js';
import { initCarousel } from '../ui/carousel.js';

const CATEGORY_ICONS = {
  library: '📦',
  game: '🎮',
  app: '🛠️',
  api: '🔌',
  website: '🌐'
};

const LINK_ICONS = {
  repo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
  demo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  npm: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.76 1.76h20.48v20.48H1.76z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6.24H5.52v11.52H12V9.6h2.88v8.16h2.88V6.24z"/></svg>'
};

function cardTitle(p) {
  return (p.nameL10n && p.nameL10n[locale.lang]) || p.name;
}

/* In the carousel the tags render icon-only (no labels): a row of text
   chips wraps at different widths and makes the slides unequal heights,
   while a single line of 15px icons fits everywhere. Tags without an icon
   are dropped entirely. The title keeps the name for hover / screen
   readers. The grid keeps the full chip (icon + label). */
function techTag(label, iconOnly = false) {
  const icon = techIconSrc(label);
  if (iconOnly) {
    if (!icon) return '';
    return `<span class="tech-tag" title="${esc(label)}"><img src="${esc(icon)}" alt="" loading="lazy"></span>`;
  }
  return `<span class="tech-tag">${icon ? `<img src="${esc(icon)}" alt="" loading="lazy">` : ''}${esc(label)}</span>`;
}

/* One project card. `carousel` adds the slide class and drops the scroll
   reveal attributes — the carousel stage positions the slides itself and
   a reveal transform would fight the coverflow transforms. */
function projectCard(p, index, carousel = false) {
  const d = p.desc[locale.lang];
  const title = cardTitle(p);
  const icons = CATEGORY_ICONS[p.category] || '📁';
  // The label sits in its own span so a language switch can patch the text
  // without touching the inline SVG next to it.
  const links = Object.entries(p.links).map(([type, url]) => {
    if (!url) return '';
    return `<a class="card-link ${type === 'demo' ? 'primary' : ''}" data-link-type="${type}" href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(title)}, ${esc(t('link.' + type))}">
      ${LINK_ICONS[type] || ''}<span class="card-link-label">${esc(t('link.' + type))}</span>
    </a>`;
  }).join('');

  const activeTab = tabFor(p.id);
  // Cards render the small/ thumbnail; the lightbox opens the large/ original.
  const smallImg = p.image.replace('/large/', '/small/');
  /* Stagger across a row rather than the whole grid: with 21 cards a plain
     index would put the last one a second behind, and a card scrolled into
     view on its own would just sit there waiting. */
  const delay = (index % 3) * 60;
  const slideClass = carousel ? ' carousel-slide' : '';
  const reveal = carousel ? '' : ` data-reveal="fade-up" data-reveal-delay="${delay}"`;
  return `
    <article class="project-card${slideClass}" data-category="${p.category}" data-id="${p.id}"${reveal}>
      <div class="card-media">
        <button type="button" class="card-media-btn" data-img-src="${esc(p.image)}" data-img-alt="${esc(title)}" aria-label="${esc(title)}, ${esc(t('image.zoomAria'))}">
          <img src="${esc(smallImg)}" alt="${esc(title)}" loading="lazy">
          <span class="card-category">${icons} <span class="card-category-label">${esc(t('filters.' + p.category))}</span></span>
          <span class="card-zoom" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/></svg>
          </span>
        </button>
      </div>
      <div class="card-body">
        <div class="card-head">
          <h3 class="card-title" id="title-${p.id}">${esc(title)}</h3>
        </div>
        <div class="card-tabs" role="tablist" aria-labelledby="title-${p.id}">
          <button class="card-tab ${activeTab === 'functional' ? 'active' : ''}" data-tab="functional" type="button" role="tab" id="tab-functional-${p.id}" aria-controls="desc-${p.id}" aria-selected="${activeTab === 'functional'}" tabindex="${activeTab === 'functional' ? 0 : -1}">${esc(t('tab.functional'))}</button>
          <button class="card-tab ${activeTab === 'technical' ? 'active' : ''}" data-tab="technical" type="button" role="tab" id="tab-technical-${p.id}" aria-controls="desc-${p.id}" aria-selected="${activeTab === 'technical'}" tabindex="${activeTab === 'technical' ? 0 : -1}">${esc(t('tab.technical'))}</button>
        </div>
        <p class="card-desc" id="desc-${p.id}" role="tabpanel" aria-labelledby="tab-${activeTab}-${p.id}" tabindex="0">${esc(d[activeTab])}</p>
        <div class="card-tech">${p.tech.map((label) => techTag(label, carousel)).join('')}</div>
        <div class="card-links">${links}</div>
      </div>
    </article>`;
}

/* Carousel shell: the coverflow stage plus the nav row. The dots are
   created by scripts/ui/carousel.js, which finds the stage, dots and
   arrows by class inside the root it is given (the skills section builds
   the same shell). The slides carry data-state (active / prev / next /
   hidden-*) which the CSS turns into the 3D positions, exactly like the CV
   repo's index page. */
function carouselShell(projects) {
  const slides = projects.map((p, i) => projectCard(p, i, true)).join('');
  return `
    <div class="projects-carousel">
      <div class="carousel-stage" role="region" aria-label="${esc(t('carousel.stageAria'))}" tabindex="0">
        ${slides}
      </div>
      <div class="carousel-nav" role="group" aria-label="${esc(t('carousel.navAria'))}">
        <button type="button" class="carousel-arrow carousel-prev" aria-label="${esc(t('carousel.prevAria'))}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="carousel-dots" data-label-key="carousel.dotLabel" role="group" aria-label="${esc(t('carousel.dotsAria'))}"></div>
        <button type="button" class="carousel-arrow carousel-next" aria-label="${esc(t('carousel.nextAria'))}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>
    </div>`;
}

export function renderProjects() {
  const grid = $('#projects-grid');
  if (!grid) return;
  const filtered = state.filter === 'all'
    ? PROJECTS
    : PROJECTS.filter((p) => p.category === state.filter);

  const carousel = state.view === 'carousel';
  grid.classList.toggle('is-carousel', carousel);
  grid.innerHTML = carousel
    ? carouselShell(filtered)
    : filtered.map((p, i) => projectCard(p, i)).join('');

  revealIn(grid);
  // New <img> nodes each render (filter change), so the loaders are wired
  // here; the load/error listeners installed by installImageLoaders settle
  // them. Language switches patch text in place and need no rewiring.
  wireImageLoaders(grid);
  if (carousel) initCarousel(grid);
}

/* Language switch: patch the text in place instead of rebuilding 21 cards.
   Keeps focus, scroll position, the reveal state and the loaded <img> nodes. */
export function updateProjectsText() {
  const grid = $('#projects-grid');
  if (!grid) return;
  $$('.project-card', grid).forEach((card) => {
    const p = PROJECTS.find((x) => x.id === card.dataset.id);
    if (!p) return;
    const title = cardTitle(p);
    const activeTab = tabFor(p.id);

    $('.card-title', card).textContent = title;
    $('.card-category-label', card).textContent = t('filters.' + p.category);
    $('.card-desc', card).textContent = p.desc[locale.lang][activeTab];

    $$('.card-tab', card).forEach((tab) => {
      tab.textContent = t('tab.' + tab.dataset.tab);
    });

    $$('.card-link', card).forEach((link) => {
      const type = link.dataset.linkType;
      $('.card-link-label', link).textContent = t('link.' + type);
      link.setAttribute('aria-label', `${title}, ${t('link.' + type)}`);
    });

    const media = $('.card-media-btn', card);
    media.dataset.imgAlt = title;
    media.setAttribute('aria-label', `${title}, ${t('image.zoomAria')}`);
    $('img', media).alt = title;
  });

  /* The carousel chrome (dots, stage, nav labels) is baked at render time,
     so a language switch must refresh it too, not just the card text. */
  if (grid.classList.contains('is-carousel')) {
    const stage = $('.carousel-stage', grid);
    if (stage) stage.setAttribute('aria-label', t('carousel.stageAria'));
    const nav = $('.carousel-nav', grid);
    if (nav) nav.setAttribute('aria-label', t('carousel.navAria'));
    $$('.carousel-dot', grid).forEach((dot, i) => {
      dot.setAttribute('aria-label', `${t('carousel.dotLabel')} ${i + 1}`);
    });
  }
}

export function applyFilter(filter) {
  state.filter = filter;
  $$('.filter-chip').forEach((c) => {
    const active = c.dataset.filter === filter;
    c.classList.toggle('active', active);
    c.setAttribute('aria-pressed', active);
  });
  renderProjects();
}

/* Select a tab within one card and swap the panel text. Shared by the
   pointer and the keyboard path so both keep the ARIA state in sync. */
function selectTab(tab) {
  const card = tab.closest('.project-card');
  const project = PROJECTS.find((p) => p.id === card.dataset.id);
  if (!project) return;
  state.tabs[project.id] = tab.dataset.tab;
  $$('.card-tab', card).forEach((b) => {
    const active = b === tab;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active);
    // Roving tabindex: only the selected tab is in the page tab order, so a
    // keyboard user passes 21 cards with 21 stops instead of 42, and moves
    // between the two tabs with the arrow keys.
    b.tabIndex = active ? 0 : -1;
  });
  const desc = $('.card-desc', card);
  desc.setAttribute('aria-labelledby', tab.id);
  desc.textContent = project.desc[locale.lang][tab.dataset.tab];
  desc.classList.remove('fade-in');
  void desc.offsetWidth; // restart animation
  desc.classList.add('fade-in');
}

/* Card tabs + image lightbox, wired once via event delegation so
   re-rendered cards (filter, language switch) keep working. */
export function initProjectCards() {
  const grid = $('#projects-grid');
  if (!grid) return;
  grid.addEventListener('click', (e) => {
    const zoom = e.target.closest('.card-media-btn');
    if (zoom) {
      openImageModal(zoom.dataset.imgSrc, zoom.dataset.imgAlt);
      return;
    }
    const tab = e.target.closest('.card-tab');
    if (tab) selectTab(tab);
  });

  /* WAI Tabs pattern: arrows wrap around, Home/End jump to the ends.
     Automatic activation (focus selects), the panel is a single
     paragraph already in the DOM, so there is nothing to defer. */
  grid.addEventListener('keydown', (e) => {
    const tab = e.target.closest('.card-tab');
    if (!tab) return;
    const tabs = $$('.card-tab', tab.closest('.card-tabs'));
    const i = tabs.indexOf(tab);
    let next;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') next = tabs[0];
    else if (e.key === 'End') next = tabs[tabs.length - 1];
    else return;
    e.preventDefault();
    next.focus();
    selectTab(next);
  });

  /* Carousel / grid view toggle. state.view is the source of truth (it is
     persisted, so the toggle's active state may differ from the initial
     aria-pressed in the markup on a returning visit). Scoped to this
     section's toolbar — the skills section has a toggle of its own. */
  // The skills toolbar reuses the .projects-toolbar layout class, so it has
  // to be excluded explicitly here.
  const viewButtons = $$('.view-toggle-btn', $('.projects-toolbar:not(.skills-toolbar)'));
  const syncViewToggle = () => {
    viewButtons.forEach((btn) => {
      const active = btn.dataset.view === state.view;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });
  };
  syncViewToggle();
  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setView(btn.dataset.view);
      syncViewToggle();
      renderProjects();
    });
  });

  $$('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => applyFilter(chip.dataset.filter));
  });
}

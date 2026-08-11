/* ============================================================
   VIEW STATE, the little mutable state the render modules share.
   The active language is NOT here: `locale` owns it (it detects,
   persists and falls back), so the render modules read locale.lang.
   ============================================================ */

import { THEME_DARK, VIEW_KEY, SKILLS_VIEW_KEY, TIMELINE_VIEW_KEY } from './config.js';

/* The projects and the skills sections can both be shown as a coverflow
   carousel (ported from the CV repo's index page) or as the classic grid,
   and each remembers its own choice, so the next visit opens in the view
   the visitor picked. Defaults differ: projects open as the carousel
   everywhere, skills as the grid on desktop but as the carousel on phones,
   where eight stacked chip groups are a long scroll. */
const VIEW_CAROUSEL = 'carousel';
const VIEW_GRID = 'grid';

/* Same breakpoint as the responsive CSS (the mobile nav / mobile layout). */
const isPhone = () => {
  try {
    return window.matchMedia('(max-width: 768px)').matches;
  } catch {
    return false;
  }
};

/* The timeline has the same shape of choice with different values: the
   detailed card (period, role, company, description) or the compact one
   (everything but the description). Compact is what phones showed before
   the switch existed, so it stays their default. */
const TIMELINE_DETAILED = 'detailed';
const TIMELINE_COMPACT = 'compact';

function readOneOf(key, allowed, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (allowed.includes(saved)) return saved;
  } catch {
    /* private mode etc., fall through to the default */
  }
  return fallback;
}

const readView = (key, fallback) => readOneOf(key, [VIEW_GRID, VIEW_CAROUSEL], fallback);

function writeView(key, view) {
  try {
    localStorage.setItem(key, view);
  } catch {
    /* private mode etc., the view just won't persist */
  }
}

export const state = {
  theme: THEME_DARK,
  view: readView(VIEW_KEY, VIEW_CAROUSEL),
  skillsView: readView(SKILLS_VIEW_KEY, isPhone() ? VIEW_CAROUSEL : VIEW_GRID),
  timelineView: readOneOf(
    TIMELINE_VIEW_KEY,
    [TIMELINE_DETAILED, TIMELINE_COMPACT],
    isPhone() ? TIMELINE_COMPACT : TIMELINE_DETAILED
  ),
  filter: 'all',
  tabs: {} // per-card tab memory: { [projectId]: 'functional' | 'technical' }
};

export function tabFor(id) {
  return state.tabs[id] || 'functional';
}

export function setView(view) {
  if (view !== VIEW_CAROUSEL && view !== VIEW_GRID) return;
  state.view = view;
  writeView(VIEW_KEY, view);
}

export function setSkillsView(view) {
  if (view !== VIEW_CAROUSEL && view !== VIEW_GRID) return;
  state.skillsView = view;
  writeView(SKILLS_VIEW_KEY, view);
}

export function setTimelineView(view) {
  if (view !== TIMELINE_DETAILED && view !== TIMELINE_COMPACT) return;
  state.timelineView = view;
  writeView(TIMELINE_VIEW_KEY, view);
}

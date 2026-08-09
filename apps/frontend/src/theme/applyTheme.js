import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_THEME, THEMES, THEME_STORAGE_KEY } from './presets';

const VALID = new Set(THEMES.map((t) => t.id));
const EVENT = 'bb:theme';

export function getTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return VALID.has(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(id, { persist = true } = {}) {
  const theme = VALID.has(id) ? id : DEFAULT_THEME;
  const root = document.documentElement;

  /* Default stays attribute-less so its cascade is byte-for-byte what it always was. */
  if (theme === DEFAULT_THEME) root.removeAttribute('data-bb-theme');
  else root.setAttribute('data-bb-theme', theme);

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* private mode — the theme still applies for this session */
    }
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg = getComputedStyle(root).getPropertyValue('--bb-body-bg').trim();
    if (bg) meta.setAttribute('content', bg);
  }

  window.dispatchEvent(new CustomEvent(EVENT, { detail: theme }));
  return theme;
}

export function bootTheme() {
  return applyTheme(getTheme(), { persist: false });
}

export function useTheme() {
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    const onChange = (e) => setTheme(e.detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return [theme, useCallback((id) => setTheme(applyTheme(id)), [])];
}

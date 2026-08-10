const THEME_KEY = "hiten.wo.theme.v1";

export type WoTheme = "light" | "dark";

export function getStoredWoTheme(): WoTheme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

export function setStoredWoTheme(theme: WoTheme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
}

export function applyWoTheme(theme: WoTheme) {
  document.documentElement.dataset.woTheme = theme;
  setStoredWoTheme(theme);
}

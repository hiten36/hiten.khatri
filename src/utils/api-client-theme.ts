import type { ApiTheme } from "../components/api-client/types";

const THEME_KEY = "hiten.api.theme.v1";

export function getStoredApiTheme(): ApiTheme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

export function setStoredApiTheme(theme: ApiTheme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
}

export function applyApiTheme(theme: ApiTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.apiTheme = theme;
}

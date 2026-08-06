const THEME_KEY = "hiten.md.theme.v1";

export type MdTheme = "light" | "dark";

export function getStoredMdTheme(): MdTheme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function setStoredMdTheme(theme: MdTheme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
}

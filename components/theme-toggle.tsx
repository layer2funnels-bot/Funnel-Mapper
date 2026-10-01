"use client";
import { Icon } from "./icon";

export function toggleTheme() {
  const r = document.documentElement;
  const dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  r.dataset.theme = dark ? "light" : "dark";
  try {
    localStorage.setItem("fm-theme", r.dataset.theme);
  } catch {}
  window.dispatchEvent(new Event("fm-theme"));
}

export function ThemeToggle({ className = "btn ghost w-full justify-start" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={toggleTheme}>
      <Icon name="moon" /> Light / dark
    </button>
  );
}

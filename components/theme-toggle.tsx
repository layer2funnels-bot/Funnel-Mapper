"use client";
import { Icon } from "./icon";

export function toggleTheme() {
  const r = document.documentElement;
  // dark-first: anything but an explicit "light" is the dark theme
  const dark = r.dataset.theme !== "light";
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

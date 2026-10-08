"use client";
import { useEffect, useSyncExternalStore } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "./icon";

export type Theme = "dark" | "light";
const YEAR = 60 * 60 * 24 * 365;

/** Reads the theme applied to the page (dark-first: anything but an explicit "light" is Dark). */
export const currentTheme = (): Theme => (typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? "light" : "dark");

/** Applies a theme instantly (no reload) and remembers it on this device: local storage plus a cookie the server reads before first paint. */
function applyLocal(t: Theme, at = Date.now()) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("fm-theme", t);
    localStorage.setItem("fm-theme-at", String(at));
  } catch {}
  document.cookie = `fm-theme=${t}; path=/; max-age=${YEAR}; samesite=lax`;
  window.dispatchEvent(new Event("fm-theme"));
}

/** Sets the theme and stores it on the person (Supabase user metadata), so it follows them to every device. */
export function setTheme(t: Theme) {
  const at = Date.now();
  applyLocal(t, at);
  // Best effort: share pages and signed-out screens have no user; the device choice above still applies.
  const sb = supabaseBrowser();
  sb.auth
    .getUser()
    .then(({ data }) => (data.user && data.user.user_metadata?.theme !== t ? sb.auth.updateUser({ data: { theme: t, theme_at: at } }) : null))
    .catch(() => {});
}

export function toggleTheme() {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
}

/**
 * Keeps this device in step with the theme saved on the person (signed-in pages only). The newer choice wins, so a
 * change made on another device arrives here, and a choice made on this device before it was saved is not undone.
 */
export function ThemeSync({ saved, at }: { saved: Theme | null; at: number }) {
  useEffect(() => {
    if (!saved || saved === currentTheme()) return;
    let localAt = 0;
    try {
      const t = localStorage.getItem("fm-theme");
      localAt = Number(localStorage.getItem("fm-theme-at")) || (t ? Date.now() : 0);
    } catch {}
    if (at > localAt) applyLocal(saved, at);
  }, [saved, at]);
  return null;
}

const subscribe = (cb: () => void) => {
  window.addEventListener("fm-theme", cb);
  return () => window.removeEventListener("fm-theme", cb);
};
export const useTheme = () => useSyncExternalStore(subscribe, currentTheme, () => "dark" as Theme);

export function ThemeToggle({ className = "btn ghost w-full justify-start" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={toggleTheme}>
      <Icon name="moon" /> Light / dark
    </button>
  );
}

/** Settings → Appearance: Dark (default) and Light side by side, each with a small preview. There is no third option. */
export function AppearancePicker() {
  const theme = useTheme();
  const opts: { id: Theme; label: string; help: string; c: { bg: string; panel: string; line: string; ink: string; muted: string } }[] = [
    { id: "dark", label: "Dark", help: "The standard Funnel Mapper look.", c: { bg: "#0B1220", panel: "#111827", line: "#334155", ink: "#E2E8F0", muted: "#94A3B8" } },
    { id: "light", label: "Light", help: "The same layout on a light surface.", c: { bg: "#F4F6FA", panel: "#FFFFFF", line: "#C4CEDB", ink: "#0F172A", muted: "#55657B" } },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-2">
      {opts.map((o) => {
        const on = theme === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(o.id)}
            className={`rounded-xl border p-3 text-left ${on ? "border-brand ring-2 ring-brand/40" : "border-line hover:border-brand"}`}
            data-testid={`theme-${o.id}`}
          >
            <svg viewBox="0 0 160 72" className="mb-2 block w-full rounded-lg" aria-hidden="true">
              <rect width="160" height="72" fill={o.c.bg} />
              <rect width="160" height="10" fill={o.c.panel} />
              <rect y="10" width="28" height="62" fill={o.c.panel} stroke={o.c.line} strokeWidth="0.5" />
              <rect x="44" y="26" width="34" height="22" rx="3" fill={o.c.panel} stroke={o.c.line} />
              <rect x="98" y="26" width="34" height="22" rx="3" fill={o.c.panel} stroke={o.c.line} />
              <path d="M78 37 H98" stroke="#10B981" strokeWidth="1.5" />
              <rect x="48" y="31" width="18" height="3" rx="1.5" fill={o.c.ink} />
              <rect x="48" y="38" width="12" height="3" rx="1.5" fill={o.c.muted} />
              <rect x="102" y="31" width="18" height="3" rx="1.5" fill={o.c.ink} />
              <rect x="102" y="38" width="12" height="3" rx="1.5" fill="#10B981" />
            </svg>
            <span className="flex items-center gap-2 font-bold">
              {on && <span aria-hidden="true">✓</span>}
              {o.label}
              {o.id === "dark" && <span className="rounded-full border border-line px-2 text-[11px] font-medium text-muted">Default</span>}
            </span>
            <span className="text-sm text-muted">{o.help}</span>
          </button>
        );
      })}
    </div>
  );
}

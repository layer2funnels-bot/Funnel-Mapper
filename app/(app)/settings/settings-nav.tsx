"use client";
import { useEffect, useState } from "react";

/**
 * Left section navigation of Settings (V2). Sections are anchors on the same page: the current one follows the scroll.
 * Below 1024px it becomes a select, as the responsive rules ask.
 */
export function SettingsNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [cur, setCur] = useState(sections[0]?.id ?? "");
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const v = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) setCur(v.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [sections]);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  return (
    <>
      <label className="mb-4 block lg:hidden">
        <span className="sr-only">Jump to a settings section</span>
        <select className="input" value={cur} onChange={(e) => go(e.target.value)}>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <nav aria-label="Settings sections" className="sticky top-[84px] hidden self-start lg:block">
        <ul className="m-0 grid list-none gap-0.5 p-0">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={cur === s.id ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  go(s.id);
                }}
                className={`block rounded-lg px-3 py-1.5 text-[13.5px] font-medium no-underline ${cur === s.id ? "bg-brand-soft text-ink shadow-[inset_2px_0_0_var(--brand)]" : "text-muted hover:bg-brand-soft hover:text-ink"}`}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

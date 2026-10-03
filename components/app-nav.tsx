"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark, Icon } from "./icon";
import { toggleTheme } from "./theme-toggle";
import type { UiIconName } from "@/lib/icons";

const NAV: { href: string; label: string; icon: UiIconName }[] = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/clients", label: "Clients", icon: "users" },
  { href: "/templates", label: "Templates", icon: "layers" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function AppNav({ agency, user, logo, team }: { agency: string; user: string; logo?: string | null; team: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  const nav = (
    <nav aria-label="Main" className="flex h-full flex-col gap-1 px-3 py-4">
      <Link href="/" className="mb-5 flex items-center gap-2.5 px-2 font-display text-[19px] font-extrabold tracking-tight text-side-ink no-underline" onClick={() => setOpen(false)}>
        <BrandMark /> Funnel Mapper Pro
      </Link>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          aria-current={active(n.href) ? "page" : undefined}
          className={`flex min-h-[42px] items-center gap-3 rounded-[10px] px-3 text-[14.5px] font-medium no-underline ${active(n.href) ? "bg-side-item text-side-ink shadow-[inset_3px_0_0_var(--brand)]" : "text-side-muted hover:bg-side-item hover:text-side-ink"}`}
        >
          <Icon name={n.icon} /> {n.label}
        </Link>
      ))}
      <div className="mt-auto border-t border-side-line pt-3">
        <div className="mb-2 flex items-center gap-2.5 px-2">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-8 w-8 rounded-lg bg-white object-contain" />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-side-item text-sm font-bold text-side-ink">{agency.slice(0, 1).toUpperCase()}</span>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-side-ink">{agency}</div>
            <div className="truncate text-xs text-side-muted" data-testid="workspace-kind">
              {team ? "Team workspace" : "Private workspace"} · {user}
            </div>
          </div>
        </div>
        <button type="button" onClick={toggleTheme} className="flex min-h-[40px] w-full items-center gap-3 rounded-[10px] px-3 text-sm text-side-muted hover:bg-side-item hover:text-side-ink">
          <Icon name="moon" /> Light / dark
        </button>
        <form action="/auth/signout" method="post">
          <button className="flex min-h-[40px] w-full items-center gap-3 rounded-[10px] px-3 text-sm text-side-muted hover:bg-side-item hover:text-side-ink">
            <Icon name="logout" /> Sign out
          </button>
        </form>
      </div>
    </nav>
  );
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 overflow-y-auto bg-side lg:block">{nav}</aside>
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-line bg-panel px-3 py-2 lg:hidden">
        <button className="btn icon" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <Icon name="menu" />
        </button>
        <Link href="/" className="flex items-center gap-2 font-display text-[17px] font-extrabold text-ink no-underline">
          <BrandMark size={26} /> Funnel Mapper Pro
        </Link>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[270px] overflow-y-auto bg-side">{nav}</aside>
        </div>
      )}
    </>
  );
}

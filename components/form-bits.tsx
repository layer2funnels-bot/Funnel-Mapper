"use client";
import { useFormStatus } from "react-dom";

export function Submit({ children, className = "btn primary w-full" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state?: { error?: string; message?: string } }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: "color-mix(in srgb, var(--bad) 10%, transparent)", color: "var(--bad)" }}>
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="mb-3 rounded-lg bg-brand-soft px-3 py-2 text-sm">
        {state.message}
      </p>
    );
  return null;
}

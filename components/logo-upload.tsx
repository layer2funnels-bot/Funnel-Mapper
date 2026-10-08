"use client";
import { useRef, useState } from "react";
import { Icon } from "./icon";
import { useSignedUrl } from "./signed-image";

/**
 * Uploads an image to Storage. `logos` is public (logos appear on client share links) and hands back a public URL;
 * `screenshots` is private to the team and hands back the file path, previewed through a signed URL.
 */
export function LogoUpload({ url, name, onChange, label = "Logo", bucket = "logos" }: { url: string | null; name: string; onChange: (url: string | null) => Promise<void>; label?: string; bucket?: "logos" | "screenshots" }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isPrivate = bucket === "screenshots";
  const signed = useSignedUrl("screenshots", isPrivate ? url : null);
  const preview = isPrivate ? signed : url;
  const [done, setDone] = useState("");
  async function pick(f: File) {
    setErr("");
    setDone("");
    if (f.size > 25 * 1024 * 1024) return setErr(`${label} must be under 25 MB`);
    if (!(bucket === "logos" ? /^image\/(png|jpe?g|webp|svg\+xml|gif)$/ : /^image\/(png|jpe?g|webp)$/).test(f.type)) return setErr(bucket === "logos" ? "Use a PNG, JPG, WebP, SVG or GIF" : "Use a PNG, JPG or WebP");
    setBusy(true);
    try {
      // V2 F7: the server optimises every image to under 100 KB (WebP) before storing it
      const fd = new FormData();
      fd.set("file", f);
      fd.set("target", isPrivate ? "shot" : "logo");
      fd.set("name", name.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 80) || "image");
      const res = await fetch("/api/image", { method: "POST", body: fd });
      const out = (await res.json().catch(() => ({}))) as { path?: string; url?: string | null; line?: string; message?: string };
      if (!res.ok || !out.path) throw new Error(out.message || "Upload failed");
      await onChange(isPrivate ? out.path : out.url!);
      setDone(out.line ?? "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-bg">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${label}`} className="h-full w-full object-contain" />
        ) : (
          <Icon name="upload" className="text-muted" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Optimising…" : url ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        </button>
        {url && (
          <button type="button" className="btn sm danger" onClick={() => onChange(null)} disabled={busy}>
            Remove
          </button>
        )}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" hidden aria-label={`Upload ${label}`} onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        {done && !err && (
          <p role="status" className="w-full text-sm text-muted">
            {done}
          </p>
        )}
        {err && (
          <p role="alert" className="w-full text-sm text-bad">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

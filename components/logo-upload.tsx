"use client";
import { useRef, useState } from "react";
import { Icon } from "./icon";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Uploads an image to a public Storage bucket under <uid>/ and hands back its public URL. */
export function LogoUpload({ url, name, onChange, label = "Logo", bucket = "logos" }: { url: string | null; name: string; onChange: (url: string | null) => Promise<void>; label?: string; bucket?: "logos" | "screenshots" }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function pick(f: File) {
    setErr("");
    if (f.size > (bucket === "logos" ? 2 : 5) * 1024 * 1024) return setErr(`${label} must be under ${bucket === "logos" ? 2 : 5} MB`);
    if (!(bucket === "logos" ? /^image\/(png|jpe?g|webp|svg\+xml|gif)$/ : /^image\/(png|jpe?g|webp)$/).test(f.type)) return setErr(bucket === "logos" ? "Use a PNG, JPG, WebP, SVG or GIF" : "Use a PNG, JPG or WebP");
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const ext = f.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/${name}-${Date.now()}.${ext}`;
      const { error } = await sb.storage.from(bucket).upload(path, f, { upsert: true, contentType: f.type, cacheControl: "3600" });
      if (error) throw error;
      await onChange(sb.storage.from(bucket).getPublicUrl(path).data.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-bg">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${label}`} className="h-full w-full object-contain" />
        ) : (
          <Icon name="upload" className="text-muted" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : url ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        </button>
        {url && (
          <button type="button" className="btn sm danger" onClick={() => onChange(null)} disabled={busy}>
            Remove
          </button>
        )}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" hidden aria-label={`Upload ${label}`} onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        {err && (
          <p role="alert" className="w-full text-sm text-bad">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

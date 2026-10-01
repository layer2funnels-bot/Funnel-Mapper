"use client";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { fmtDate } from "@/lib/format";
import type { ShareLinkRow } from "@/lib/schemas";
import { supabaseBrowser } from "@/lib/supabase/client";

export const ShareDialog = forwardRef<HTMLDialogElement, { funnelId: string; open: boolean }>(function ShareDialog({ funnelId, open }, ref) {
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [hide, setHide] = useState(false);
  const [comments, setComments] = useState(true);
  const [expires, setExpires] = useState("0");
  const [copied, setCopied] = useState("");
  const [err, setErr] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from("share_links").select("*").eq("funnel_id", funnelId).order("created_at", { ascending: false });
    setLinks(data ?? []);
  }, [funnelId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading external data
    if (open) load();
  }, [open, load]);
  const create = async () => {
    setErr("");
    const days = Number(expires);
    const { error } = await supabaseBrowser()
      .from("share_links")
      .insert({ funnel_id: funnelId, can_edit: canEdit, hide_numbers: hide, allow_comments: comments, expires_at: days ? new Date(Date.now() + days * 86400000).toISOString() : null });
    if (error) return setErr(error.message);
    load();
  };
  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${origin}/s/${token}`);
      setCopied(token);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setErr("Couldn’t copy. Select the link and copy it by hand.");
    }
  };
  return (
    <dialog ref={ref} className="modal" style={{ maxWidth: 640 }} aria-labelledby="share-title">
      <h3 id="share-title">Share with your client</h3>
      <p className="mb-4 text-sm text-muted">Anyone with the link can open it. They see your agency name and the client’s logo. No sign-in needed.</p>
      <div className="mb-4 rounded-xl border border-line p-4">
        <label className="check">
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> Hide numbers (show the journey only)
        </label>
        <label className="check">
          <input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} /> Let them leave comments
        </label>
        <label className="check">
          <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} /> Let them edit the map
        </label>
        <div className="field mb-3 max-w-[240px]">
          <label htmlFor="share-exp">Link expires</label>
          <select id="share-exp" className="input" value={expires} onChange={(e) => setExpires(e.target.value)}>
            <option value="0">Never</option>
            <option value="7">In 7 days</option>
            <option value="30">In 30 days</option>
            <option value="90">In 90 days</option>
          </select>
        </div>
        <button type="button" className="btn primary" onClick={create}>
          <Icon name="link" /> Create link
        </button>
      </div>
      {err && (
        <p role="alert" className="mb-2 text-sm text-bad">
          {err}
        </p>
      )}
      {links.length > 0 && (
        <ul className="m-0 mb-2 list-none p-0">
          {links.map((l) => {
            const expired = l.expires_at && Date.parse(l.expires_at) < Date.now();
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-2 border-b border-line py-2.5">
                <div className="min-w-0 flex-1">
                  <input className="input min-h-[32px]! py-1! text-xs" readOnly value={`${origin}/s/${l.token}`} aria-label="Share link" onFocus={(e) => e.target.select()} />
                  <div className="mt-1 flex flex-wrap gap-1 text-xs">
                    <span className="pill bg-brand-soft text-brand">{l.can_edit ? "Can edit" : "View only"}</span>
                    {l.hide_numbers && <span className="pill bg-brand-soft text-brand">Numbers hidden</span>}
                    {l.allow_comments && <span className="pill bg-brand-soft text-brand">Comments on</span>}
                    <span className={`pill ${expired ? "st-past" : "st-draft"}`}>{l.expires_at ? `${expired ? "Expired" : "Expires"} ${fmtDate(l.expires_at)}` : "No expiry"}</span>
                  </div>
                </div>
                <button type="button" className="btn sm" onClick={() => copy(l.token)}>
                  {copied === l.token ? "Copied" : "Copy"}
                </button>
                <a className="btn sm" href={`/s/${l.token}`} target="_blank" rel="noreferrer">
                  Open
                </a>
                <button
                  type="button"
                  className="btn sm danger"
                  onClick={async () => {
                    if (!confirm("Revoke this link? Anyone using it loses access.")) return;
                    await supabaseBrowser().from("share_links").delete().eq("id", l.id);
                    load();
                  }}
                >
                  Revoke
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form method="dialog" className="mt-4 text-right">
        <button className="btn">Done</button>
      </form>
    </dialog>
  );
});

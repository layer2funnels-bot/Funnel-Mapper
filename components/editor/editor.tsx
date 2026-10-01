"use client";
import "./editor.css";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandMark, Icon } from "@/components/icon";
import { Menu } from "@/components/menu";
import { toggleTheme } from "@/components/theme-toggle";
import { isAnnot } from "@/lib/catalog";
import { CURRENCIES, CURRENCY_CODES, exportFunnelFile, importFunnelFile, isCurrency, type FunnelGraph, type FunnelSettings } from "@/lib/graph";
import { fileName, mapSvg, stepsCsv } from "@/lib/export";
import { elkLayout, tidyLayout } from "@/lib/layout";
import { FUNNEL_STATUSES, STATUS_LABEL } from "@/lib/schemas";
import { supabaseBrowser } from "@/lib/supabase/client";
import { clearDraft, readDraft, useAutosave, type SaveFn } from "@/lib/editor/saver";
import {
  clearSelection,
  copySelection,
  deleteSelection,
  duplicateSelection,
  editorSnapshot,
  heightOf,
  initEditor,
  markDirty,
  moveNodes,
  nudge,
  paste,
  redo,
  replaceContent,
  selectNodes,
  setName,
  setOpt,
  setPanel,
  setPositionsTransient,
  setReadOnly,
  setSettings,
  showToast,
  undo,
  useEditor,
} from "@/lib/editor/store";
import { Canvas, ZoomControls } from "./canvas";
import { CommentsPanel } from "./comments";
import { download, downloadPng, pdfReport, svgToPng } from "./exporters";
import { HelpDialog } from "./help-dialog";
import { Inspector } from "./inspector";
import { KpiBar } from "./kpi-bar";
import { Palette, type PaletteProduct } from "./palette";
import { Presenter } from "./present";
import { ShareDialog } from "./share-dialog";
import { TemplateDialog } from "./template-dialog";
import { ShareComments } from "./share-comments";
import { saveVersion, VersionsPanel } from "./versions";

export interface EditorProps {
  mode: "owner" | "share";
  userId?: string;
  funnel: { id: string; name: string; description: string; status: string; client_id: string; graph: FunnelGraph; settings: FunnelSettings; updated_at: string };
  client: { id: string; name: string; logo_url: string | null; currency: string };
  agency: { name: string; logo_url: string | null };
  products?: PaletteProduct[];
  lastVersionAt?: number;
  share?: { token: string; canEdit: boolean; hideNumbers: boolean; allowComments: boolean; comments: ShareCommentLite[] };
  unresolvedComments?: number;
}
export interface ShareCommentLite {
  id: string;
  node_id: string | null;
  author_name: string;
  body: string;
  resolved: boolean;
  created_at: string;
}

export function Editor(props: EditorProps) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (!!t.closest("input, textarea, select, [contenteditable=true]") || !!document.querySelector("dialog[open]"));

function EditorInner(props: EditorProps) {
  const { mode, funnel, client, agency, share } = props;
  const owner = mode === "owner";
  const rf = useReactFlow();
  // the store is initialised for this funnel (set synchronously by initEditor in the effect below)
  const ready = useEditor((s) => s.funnelId === funnel.id);
  const [showSide, setShowSide] = useState(false);
  const [showInsp, setShowInsp] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [status, setStatus] = useState(funnel.status);
  const [commentCount, setCommentCount] = useState(props.unresolvedComments ?? 0);
  const helpRef = useRef<HTMLDialogElement>(null);
  const shareRef = useRef<HTMLDialogElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const tplRef = useRef<HTMLDialogElement>(null);

  const name = useEditor((s) => s.name);
  const readOnly = useEditor((s) => s.readOnly);
  const saveStatus = useEditor((s) => s.saveStatus);
  const opts = useEditor((s) => s.opts);
  const currency = useEditor((s) => s.settings.currency);
  const hideNumbersSetting = useEditor((s) => s.settings.hideNumbers);
  const panel = useEditor((s) => s.panel);
  const canUndo = useEditor((s) => s.past.length > 0 || (s.committed !== null && s.committed.nodes !== s.nodes));
  const canRedo = useEditor((s) => s.future.length > 0);
  const toast = useEditor((s) => s.toast);
  const hasNodes = useEditor((s) => s.nodes.length > 0);

  /* ---------- init ---------- */
  useEffect(() => {
    const canEdit = owner || !!share?.canEdit;
    const narrow = window.matchMedia("(max-width: 640px)").matches;
    let graph = funnel.graph,
      settings = funnel.settings,
      nm = funnel.name;
    let restored = false;
    if (owner) {
      const d = readDraft(funnel.id);
      if (d && d.at > Date.parse(funnel.updated_at)) {
        graph = d.graph;
        settings = d.settings;
        nm = d.name || nm;
        restored = true;
      } else if (d) clearDraft(funnel.id);
    }
    if (share?.hideNumbers) settings = { ...settings, hideNumbers: true };
    initEditor({ funnelId: funnel.id, clientId: funnel.client_id, name: nm, graph, settings, readOnly: !canEdit || narrow, shared: !owner });
    if (share?.hideNumbers) setOpt("nums", false);
    if (restored) {
      markDirty();
      showToast("Restored unsaved changes from this device. Syncing…");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funnel.id]);

  /* ---------- saving ---------- */
  const save: SaveFn = useCallback(
    async (p) => {
      if (owner) {
        const { error } = await supabaseBrowser()
          .from("funnels")
          .update({ name: p.name, graph: p.graph as never, settings: p.settings as never, summary: p.summary as never })
          .eq("id", funnel.id);
        if (error) throw error;
      } else if (share?.canEdit) {
        const r = await fetch(`/api/share/${share.token}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ graph: p.graph, settings: p.settings }) });
        if (!r.ok) throw new Error("save failed");
      }
    },
    [owner, funnel.id, share],
  );
  useAutosave({
    funnelId: funnel.id,
    save,
    saveVersion: owner ? async (p) => void (await supabaseBrowser().from("funnel_versions").insert({ funnel_id: funnel.id, graph: p.graph as never, settings: p.settings as never, label: "Autosave", auto: true })) : undefined,
    lastVersionAt: props.lastVersionAt,
    enabled: ready && (owner || !!share?.canEdit),
  });

  /* ---------- layout ---------- */
  const runTidy = useCallback(
    async (kind: "tidy" | "elk" = "tidy") => {
      const s = useEditor.getState();
      if (s.readOnly) return;
      if (!s.nodes.some((n) => !isAnnot(n.type))) return showToast("Add some blocks first");
      const next = kind === "elk" ? await elkLayout(s.nodes, s.edges, { heightOf, snap: s.opts.snap }) : tidyLayout(s.nodes, s.edges, { heightOf, snap: s.opts.snap });
      const from = Object.fromEntries(s.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const T = reduce ? 0 : 420,
        t0 = performance.now();
      await new Promise<void>((done) => {
        const step = (now: number) => {
          const t = T ? Math.min(1, (now - t0) / T) : 1,
            e = 1 - Math.pow(1 - t, 3);
          setPositionsTransient(Object.fromEntries(next.map((n) => [n.id, { x: Math.round(from[n.id].x + (n.x - from[n.id].x) * e), y: Math.round(from[n.id].y + (n.y - from[n.id].y) * e) }])));
          if (t < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      });
      useEditor.setState({ nodes: s.nodes.map((n) => ({ ...n, x: from[n.id].x, y: from[n.id].y })) });
      moveNodes(Object.fromEntries(next.map((n) => [n.id, { x: n.x, y: n.y, ...(n.type === "frame" ? { w: n.w, h: n.h } : {}) }])), { discrete: true });
      requestAnimationFrame(() => rf.fitView({ padding: 0.15, duration: 300, maxZoom: 1.2 }));
      showToast(`Layout tidied${kind === "elk" ? " (ELK layered)" : ""}. Ctrl Z to undo.`);
    },
    [rf],
  );

  /* ---------- exports ---------- */
  const doExport = useCallback(
    async (kind: "json" | "csv" | "svg" | "png" | "pdf") => {
      const s = useEditor.getState();
      const g = { nodes: s.nodes, edges: s.edges };
      const nums = s.opts.nums && !s.settings.hideNumbers;
      try {
        if (kind === "json") download(fileName(s.name, "json"), JSON.stringify(exportFunnelFile({ ...editorSnapshot(), description: funnel.description }), null, 1), "application/json");
        if (kind === "csv") download(fileName(s.name, "csv"), stepsCsv(g, s.R), "text/csv");
        if (kind === "svg") download(fileName(s.name, "svg"), mapSvg(g, s.R, { currency: s.settings.currency, nums, heightOf }), "image/svg+xml");
        if (kind === "png") await downloadPng(fileName(s.name, "png"), mapSvg(g, s.R, { currency: s.settings.currency, nums, heightOf }));
        if (kind === "pdf") {
          showToast("Building PDF…");
          const blob = await pdfReport(g, s.R, { funnelName: s.name, description: funnel.description, clientName: client.name, clientLogo: client.logo_url, agencyName: agency.name, agencyLogo: agency.logo_url, currency: s.settings.currency, basis: s.settings.basis, hideNumbers: !nums }, heightOf);
          download(fileName(s.name, "pdf"), blob);
        }
      } catch (e) {
        showToast(e instanceof Error ? `Export failed: ${e.message}` : "Export failed");
      }
    },
    [funnel.description, client, agency],
  );

  const doImport = async (f: File) => {
    try {
      const d = importFunnelFile(JSON.parse(await f.text()));
      replaceContent(d.graph, d.settings, d.name);
      requestAnimationFrame(() => rf.fitView({ padding: 0.15, maxZoom: 1.2 }));
      showToast("Funnel imported. Ctrl Z to undo.");
    } catch {
      showToast("That file isn’t a Funnel Mapper .json file");
    }
  };

  const manualVersion = async () => {
    try {
      await saveVersion(funnel.id, `Saved ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`);
      showToast("Version saved");
      uploadThumbnail();
    } catch {
      showToast("Couldn’t save the version");
    }
  };
  /** Map snapshot for portfolio cards, kept in the private `thumbnails` bucket (path stored on the funnel). */
  const uploadThumbnail = async () => {
    try {
      const s = useEditor.getState();
      if (!s.nodes.length) return;
      const png = await svgToPng(mapSvg({ nodes: s.nodes, edges: s.edges }, s.R, { currency: s.settings.currency, nums: false, heightOf }), 0.5);
      const blob = await (await fetch(png.url)).blob();
      const sb = supabaseBrowser();
      const path = `${funnel.id}.png`;
      const { error } = await sb.storage.from("thumbnails").upload(path, blob, { upsert: true, contentType: "image/png", cacheControl: "60" });
      if (!error) await sb.from("funnels").update({ thumbnail_url: path }).eq("id", funnel.id);
    } catch {}
  };

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (presenting || isTyping(ev.target)) return;
      const mod = ev.ctrlKey || ev.metaKey,
        k = ev.key.toLowerCase();
      const ro = useEditor.getState().readOnly;
      if (ev.key === "?") {
        helpRef.current?.showModal();
        return;
      }
      if (ev.key === "Escape") {
        clearSelection();
        return;
      }
      if (mod && k === "a") {
        ev.preventDefault();
        selectNodes(useEditor.getState().nodes.map((n) => n.id));
        return;
      }
      if (mod && k === "c") {
        if (copySelection()) showToast("Copied");
        return;
      }
      if (ro) return;
      if (mod && k === "z") {
        ev.preventDefault();
        if (ev.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && k === "y") {
        ev.preventDefault();
        redo();
        return;
      }
      if (mod && k === "v") {
        ev.preventDefault();
        paste();
        return;
      }
      if (mod && ev.shiftKey && k === "l") {
        ev.preventDefault();
        runTidy();
        return;
      }
      if (mod && k === "d") {
        ev.preventDefault();
        duplicateSelection();
        return;
      }
      if (mod && k === "s") {
        ev.preventDefault();
        if (owner) manualVersion();
        return;
      }
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        deleteSelection();
        return;
      }
      const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (arrows[ev.key] && useEditor.getState().selNodes.length) {
        ev.preventDefault();
        ev.stopPropagation();
        const st = ev.shiftKey ? 33 : 11;
        nudge(arrows[ev.key][0] * st, arrows[ev.key][1] * st);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenting, runTidy, owner]);

  // open the inspector sheet on small screens when something gets selected
  useEffect(
    () =>
      useEditor.subscribe((s, p) => {
        if ((s.selNodes !== p.selNodes || s.selEdge !== p.selEdge) && (s.selNodes.length || s.selEdge)) setShowInsp(true);
      }),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useEditor.setState({ toast: null }), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const saveLabel: Record<string, string> = { saved: "Saved", dirty: "Unsaved", saving: "Saving…", offline: "Offline · saved on this device", error: "Retrying…", readonly: "View only" };
  const canEdit = owner || !!share?.canEdit;
  const cls = ["fm-editor", showSide && "show-side", showInsp && "show-insp", !opts.nums && "fm-hide-nums", share?.hideNumbers && "fm-hide-all", readOnly && "fm-readonly"].filter(Boolean).join(" ");

  if (presenting)
    return (
      <div className="fm-present">
        <div className="fm-stage">
          <Canvas />
        </div>
        <Presenter onExit={() => setPresenting(false)} />
      </div>
    );

  return (
    <div className={cls}>
      <header className="fm-top">
        {!readOnly && (
          <button type="button" className="btn icon fm-mobile-only" aria-label="Show building blocks" aria-expanded={showSide} onClick={() => setShowSide((v) => !v)}>
            <Icon name="plus" />
          </button>
        )}
        {owner ? (
          <Link href={`/clients/${client.id}`} className="btn ghost icon" aria-label={`Back to ${client.name}`} title={`Back to ${client.name}`}>
            <Icon name="back" />
          </Link>
        ) : (
          <span className="flex items-center gap-2 font-display font-extrabold">
            {agency.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agency.logo_url} alt="" className="h-7 w-7 rounded-md bg-white object-contain" />
            ) : (
              <BrandMark />
            )}
            <span className="fm-hide-sm">{agency.name}</span>
          </span>
        )}
        <Menu label="File">
          {(close) => (
            <>
              {owner && (
                <>
                  <button type="button" role="menuitem" onClick={() => (close(), manualVersion())}>
                    Save version<kbd>Ctrl S</kbd>
                  </button>
                  <button type="button" role="menuitem" onClick={() => (close(), setPanel("versions"), setShowInsp(true))}>
                    Version history
                  </button>
                  <button type="button" role="menuitem" onClick={() => (close(), tplRef.current?.showModal())}>
                    Save as template
                  </button>
                  <hr />
                  <button type="button" role="menuitem" onClick={() => (close(), fileRef.current?.click())} disabled={readOnly}>
                    Import funnel (.json)
                  </button>
                </>
              )}
              <div className="ph">Export</div>
              <button type="button" role="menuitem" onClick={() => (close(), doExport("pdf"))}>
                PDF report for client
              </button>
              <button type="button" role="menuitem" onClick={() => (close(), doExport("png"))}>
                Map image (.png)
              </button>
              <button type="button" role="menuitem" onClick={() => (close(), doExport("svg"))}>
                Map image (.svg)
              </button>
              <button type="button" role="menuitem" onClick={() => (close(), doExport("csv"))}>
                Step report (.csv)
              </button>
              <button type="button" role="menuitem" onClick={() => (close(), doExport("json"))}>
                Funnel file (.json)
              </button>
              <hr />
              <button type="button" role="menuitem" onClick={() => (close(), setPresenting(true))} disabled={!hasNodes}>
                <Icon name="play" size={16} /> Present
              </button>
            </>
          )}
        </Menu>
        <label className="sr-only" htmlFor="fm-fname">
          Funnel name
        </label>
        <input id="fm-fname" className="fm-fname" value={name} onChange={(e) => setName(e.target.value)} readOnly={readOnly || !owner} />
        {canEdit && (
          <>
            <button type="button" className="btn icon" aria-label="Undo" title="Undo (Ctrl Z)" onClick={undo} disabled={readOnly || !canUndo}>
              <Icon name="undo" />
            </button>
            <button type="button" className="btn icon" aria-label="Redo" title="Redo (Ctrl Shift Z)" onClick={redo} disabled={readOnly || !canRedo}>
              <Icon name="redo" />
            </button>
            <button type="button" className="btn primary" title="Tidy up layout (Ctrl Shift L)" onClick={() => runTidy()} disabled={readOnly}>
              <Icon name="sparkle" />
              <span className="fm-hide-sm">Tidy up</span>
            </button>
          </>
        )}
        <span className="flex-1" />
        {owner && (
          <label className="fm-hide-sm">
            <span className="sr-only">Funnel status</span>
            <select
              className="btn"
              value={status}
              onChange={async (e) => {
                const v = e.target.value;
                setStatus(v);
                const { error } = await supabaseBrowser().from("funnels").update({ status: v }).eq("id", funnel.id);
                if (error) showToast("Couldn’t change status");
              }}
            >
              {FUNNEL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        )}
        <Menu label="View" align="right">
          {(close) => (
            <>
              {!share?.hideNumbers && (
                <label>
                  <input type="checkbox" checked={opts.nums} onChange={(e) => setOpt("nums", e.target.checked)} /> Show numbers on map
                </label>
              )}
              <label>
                <input type="checkbox" checked={opts.thick} onChange={(e) => setOpt("thick", e.target.checked)} /> Line thickness shows traffic
              </label>
              <label>
                <input type="checkbox" checked={opts.snap} onChange={(e) => setOpt("snap", e.target.checked)} /> Snap to grid
              </label>
              <label>
                <input type="checkbox" checked={opts.mini} onChange={(e) => setOpt("mini", e.target.checked)} /> Mini map
              </label>
              {canEdit && (
                <label>
                  <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} /> View only (lock editing)
                </label>
              )}
              {owner && (
                <label>
                  <input type="checkbox" checked={hideNumbersSetting} onChange={(e) => setSettings({ hideNumbers: e.target.checked })} /> Hide numbers on share links
                </label>
              )}
              <hr />
              {canEdit && (
                <>
                  <button type="button" role="menuitem" onClick={() => (close(), runTidy("tidy"))} disabled={readOnly}>
                    Tidy up layout<kbd>Ctrl Shift L</kbd>
                  </button>
                  <button type="button" role="menuitem" onClick={() => (close(), runTidy("elk"))} disabled={readOnly}>
                    Tidy up (ELK layered)
                  </button>
                </>
              )}
              <button type="button" role="menuitem" onClick={() => (close(), rf.fitView({ padding: 0.15, duration: 250, maxZoom: 1.2 }))}>
                Fit map to screen
              </button>
              <button type="button" role="menuitem" onClick={() => (close(), toggleTheme())}>
                Switch light / dark
              </button>
              <button type="button" role="menuitem" onClick={() => (close(), helpRef.current?.showModal())}>
                Keyboard shortcuts<kbd>?</kbd>
              </button>
            </>
          )}
        </Menu>
        {canEdit && (
          <label className="fm-hide-xs">
            <span className="sr-only">Currency</span>
            <select className="btn" value={currency} disabled={readOnly} onChange={(e) => isCurrency(e.target.value) && setSettings({ currency: e.target.value })}>
              {CURRENCY_CODES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCIES[c].label}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="fm-saved fm-hide-xs" data-s={saveStatus} role="status" aria-live="polite">
          <span className="dot" aria-hidden="true" />
          {saveLabel[saveStatus]}
        </span>
        <button type="button" className="btn icon fm-mobile-only" aria-label="Show numbers and details" aria-expanded={showInsp} onClick={() => setShowInsp((v) => !v)}>
          <Icon name="chart" />
        </button>
        {owner && (
          <>
            <button type="button" className="btn icon fm-hide-sm" aria-label="Version history" title="Version history" onClick={() => (setPanel("versions"), setShowInsp(true))}>
              <Icon name="history" />
            </button>
            <button type="button" className="btn fm-hide-sm relative" aria-label={`Client comments (${commentCount} open)`} title="Client comments" onClick={() => (setPanel("comments"), setShowInsp(true))}>
              <Icon name="comment" />
              {commentCount > 0 && <span className="pill bg-brand px-1.5! py-0! text-brand-ink">{commentCount}</span>}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setShareOpen(true);
                shareRef.current?.showModal();
              }}
            >
              <Icon name="share" />
              <span className="fm-hide-sm">Share</span>
            </button>
          </>
        )}
        {mode === "share" && (
          <button type="button" className="btn" onClick={() => setPresenting(true)} disabled={!hasNodes}>
            <Icon name="play" /> <span className="fm-hide-sm">Present</span>
          </button>
        )}
      </header>

      <aside className="fm-side" aria-label="Building blocks">
        {readOnly ? (
          <div className="px-1 py-2">
            <h2>{client.name}</h2>
            <p className="hint">{funnel.description || "Funnel map"}</p>
            {client.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.logo_url} alt={`${client.name} logo`} className="mt-4 max-h-20 rounded-lg bg-white object-contain p-2" />
            )}
            {canEdit && (
              <button type="button" className="btn mt-6 w-full" onClick={() => setReadOnly(false)}>
                <Icon name="edit" /> Edit this funnel
              </button>
            )}
          </div>
        ) : (
          <Palette products={props.products ?? []} onPicked={() => setShowSide(false)} />
        )}
      </aside>

      <section className="fm-stage" aria-label="Funnel canvas" onClick={() => showSide && setShowSide(false)}>
        {ready && <Canvas />}
        {ready && !hasNodes && (
          <div className="fm-empty">
            <div>
              <strong>Map your first funnel</strong>
              Add a traffic source, the pages people visit, then the offers they buy. Use a Yes/No condition for every decision.
            </div>
          </div>
        )}
        <ZoomControls />
      </section>

      <aside className="fm-insp" aria-label="Details">
        <div className="fm-sheet-close">
          <button type="button" className="btn icon ghost" aria-label="Close details" onClick={() => setShowInsp(false)}>
            <Icon name="close" />
          </button>
        </div>
        {owner && panel === "versions" ? (
          <VersionsPanel onSaved={uploadThumbnail} />
        ) : owner && panel === "comments" ? (
          <CommentsPanel onCount={setCommentCount} />
        ) : (
          <>
            <Inspector />
            {share?.allowComments && <ShareComments token={share.token} initial={share.comments} />}
          </>
        )}
      </aside>

      {!share?.hideNumbers && <KpiBar />}

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) doImport(f);
        }}
      />
      <HelpDialog ref={helpRef} />
      {owner && <ShareDialog ref={shareRef} funnelId={funnel.id} open={shareOpen} />}
      {owner && props.userId && <TemplateDialog ref={tplRef} userId={props.userId} defaultName={name} description={funnel.description} />}
      {toast && (
        <div className="fm-toast" role="status" key={toast.id}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

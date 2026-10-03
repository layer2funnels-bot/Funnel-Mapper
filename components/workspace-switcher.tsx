"use client";
import { useActionState, useId } from "react";
import { createWorkspaceAction, switchWorkspaceAction } from "@/app/(app)/actions";
import type { WorkspaceOption } from "@/lib/supabase/server";
import { Icon } from "./icon";

/** Left-menu workspace picker: the workspaces you're a member of, and (admins) creating a new one. */
export function WorkspaceSwitcher({ currentId, workspaces, canCreate }: { currentId: string; workspaces: WorkspaceOption[]; canCreate: boolean }) {
  const [state, create] = useActionState(createWorkspaceAction, undefined);
  const id = useId();
  const current = workspaces.find((w) => w.id === currentId);
  const kind = (w: WorkspaceOption) => (w.kind === "team" ? "Layer2Funnels team" : "Workspace");
  return (
    <details className="group mb-4 rounded-[10px] border border-side-line" data-testid="workspace-switcher">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[10px] px-3 py-2 hover:bg-side-item [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold tracking-wide text-side-muted uppercase">Workspace</span>
          <span className="block truncate text-sm font-bold text-side-ink">{current?.name ?? "Workspace"}</span>
        </span>
        <Icon name="chevronRight" className="shrink-0 text-side-muted transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t border-side-line p-2">
        <ul className="m-0 list-none p-0" aria-label="Your workspaces">
          {workspaces.map((w) => (
            <li key={w.id}>
              <form action={switchWorkspaceAction.bind(null, w.id)}>
                <button
                  className={`flex min-h-[38px] w-full items-center gap-2 rounded-lg px-2 text-left text-sm ${w.id === currentId ? "bg-side-item text-side-ink" : "text-side-muted hover:bg-side-item hover:text-side-ink"}`}
                  aria-current={w.id === currentId ? "true" : undefined}
                  disabled={w.id === currentId}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{w.name}</span>
                  <span className="shrink-0 text-[11px] text-side-muted">{kind(w)}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
        {canCreate && (
          <form action={create} className="mt-2 border-t border-side-line pt-2">
            <label htmlFor={`${id}-ws`} className="mb-1 block px-1 text-xs font-semibold text-side-muted">
              New workspace
            </label>
            <input id={`${id}-ws`} name="name" className="input mb-2 w-full" placeholder="Workspace name" maxLength={120} required autoComplete="off" />
            {state?.error && (
              <p role="alert" className="mb-2 px-1 text-xs text-bad">
                {state.error}
              </p>
            )}
            <button className="btn primary sm w-full">
              <Icon name="plus" /> Create workspace
            </button>
          </form>
        )}
      </div>
    </details>
  );
}

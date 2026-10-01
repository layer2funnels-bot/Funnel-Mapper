"use client";
import { useActionState, useRef } from "react";
import { FormMessage, Submit } from "./form-bits";
import { Icon } from "./icon";
import { createFunnelAction } from "@/app/(app)/actions";

export interface TemplateOption {
  value: string;
  label: string;
  group: string;
}

export function NewFunnelButton({ clients, clientId, templates, className = "btn primary", label = "New funnel", defaultSource = "blank" }: { clients: { id: string; name: string }[]; clientId?: string; templates: TemplateOption[]; className?: string; label?: string; defaultSource?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState(createFunnelAction, undefined);
  const groups = [...new Set(templates.map((t) => t.group))];
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>
        <Icon name="plus" /> {label}
      </button>
      <dialog ref={ref} className="modal" aria-labelledby="nf-title">
        <h3 id="nf-title">New funnel</h3>
        {clients.length === 0 ? (
          <p className="text-sm text-muted">Add a client first: every funnel belongs to a client portfolio.</p>
        ) : (
          <form action={action}>
            <FormMessage state={state} />
            <div className="field">
              <label htmlFor="nf-client">Client</label>
              <select className="input" id="nf-client" name="client_id" defaultValue={clientId ?? clients[0]?.id}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="nf-source">Start from</label>
              <select className="input" id="nf-source" name="source" defaultValue={defaultSource}>
                <option value="blank">Blank canvas</option>
                {groups.map((g) => (
                  <optgroup key={g} label={g}>
                    {templates
                      .filter((t) => t.group === g)
                      .map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="nf-name">Name (optional)</label>
              <input className="input" id="nf-name" name="name" placeholder="Uses the template name if empty" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn" onClick={() => ref.current?.close()}>
                Cancel
              </button>
              <Submit className="btn primary">Create funnel</Submit>
            </div>
          </form>
        )}
        {clients.length === 0 && (
          <div className="mt-4 flex justify-end">
            <button type="button" className="btn" onClick={() => ref.current?.close()}>
              Close
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}

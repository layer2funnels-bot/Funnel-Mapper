"use client";
import { forwardRef } from "react";

const KEYS: [string, string][] = [
  ["Delete", "Delete selection"],
  ["Ctrl Z / Ctrl Shift Z", "Undo / redo"],
  ["Ctrl C / Ctrl V", "Copy / paste blocks"],
  ["Ctrl D", "Duplicate selection"],
  ["Ctrl A", "Select all blocks"],
  ["Arrow keys", "Nudge selection (Shift for bigger steps)"],
  ["Shift + click", "Add a block to the selection"],
  ["Shift + drag canvas", "Box select"],
  ["Ctrl Shift L", "Tidy up the layout"],
  ["Ctrl S", "Save a version"],
  ["Ctrl + scroll", "Zoom"],
  ["Esc", "Clear selection"],
  ["?", "This list"],
];

export const HelpDialog = forwardRef<HTMLDialogElement>(function HelpDialog(_, ref) {
  return (
    <dialog ref={ref} className="modal" aria-labelledby="help-title">
      <h3 id="help-title">Keyboard shortcuts</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {KEYS.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>
              <span className="kb">{k}</span>
            </dt>
            <dd className="m-0">{v}</dd>
          </div>
        ))}
      </dl>
      <form method="dialog" className="mt-5 text-right">
        <button className="btn primary">Close</button>
      </form>
    </dialog>
  );
});

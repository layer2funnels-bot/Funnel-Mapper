import { STATUS_LABEL } from "@/lib/schemas";

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill st-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

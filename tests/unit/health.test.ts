import { describe, expect, it } from "vitest";
import { warnings } from "@/lib/funnel-math";
import { healthChecks } from "@/lib/health";
import { builtinTemplate, BUILTIN_KEYS } from "@/lib/templates";
import type { FunnelNode } from "@/lib/graph";

describe("healthChecks", () => {
  it("reports exactly the engine's warnings on every built-in template (plus nothing invented)", () => {
    for (const key of BUILTIN_KEYS) {
      const g = builtinTemplate(key).graph;
      expect(healthChecks(g).map((c) => c.text), key).toEqual(warnings(g));
    }
  });
  it("points each block-level check at its block, and a funnel-wide check at none", () => {
    const g = builtinTemplate("quiz").graph;
    const broken = { nodes: [...g.nodes, { id: "w", type: "landing", name: "Orphan", x: 0, y: 0, p: {} } as FunnelNode], edges: g.edges };
    const c = healthChecks(broken).find((x) => x.nodeId === "w");
    expect(c?.text).toContain("Orphan");
    const empty = { nodes: [{ id: "a", type: "landing", name: "A", x: 0, y: 0, p: {} } as FunnelNode], edges: [] };
    expect(healthChecks(empty).some((x) => x.id === "no-traffic" && !x.nodeId)).toBe(true);
  });
  it("flags a Wait with no duration (it is math-neutral, so the engine does not warn)", () => {
    const w = { nodes: [{ id: "t", type: "fbads", name: "T", x: 0, y: 0, p: {} } as FunnelNode, { id: "w", type: "wait", name: "Pause", x: 0, y: 0, p: { days: 0 } } as FunnelNode], edges: [{ id: "e", from: "t", to: "w", share: 100, port: "main" as const }] };
    expect(healthChecks(w).some((c) => c.nodeId === "w" && c.text.includes("no duration"))).toBe(true);
  });
});

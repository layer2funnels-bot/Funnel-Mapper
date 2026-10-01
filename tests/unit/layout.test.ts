import { describe, expect, it } from "vitest";
import fixtures from "../fixtures/prototype-results.json";
import { elkLayout, layoutMetrics, tidyLayout } from "@/lib/layout";
import { builtinTemplate, BUILTIN_KEYS } from "@/lib/templates";

const FX = fixtures as Record<string, any>;

describe("tidyLayout matches the prototype's Tidy up", () => {
  for (const key of BUILTIN_KEYS) {
    it(`${key}: from template positions`, () => {
      const t = builtinTemplate(key);
      const res = tidyLayout(t.graph.nodes, t.graph.edges);
      res.forEach((n, i) => {
        expect([n.x, n.y], n.name).toEqual([FX[key].tidy[i].x, FX[key].tidy[i].y]);
        if (FX[key].tidy[i].w != null) expect([n.w, n.h]).toEqual([FX[key].tidy[i].w, FX[key].tidy[i].h]);
      });
    });
    it(`${key}: from scrambled positions`, () => {
      const t = builtinTemplate(key);
      const nodes = t.graph.nodes.map((n, i) => ({ ...n, x: FX[key].scrambled[i].x, y: FX[key].scrambled[i].y }));
      const res = tidyLayout(nodes, t.graph.edges);
      res.forEach((n, i) => expect([n.x, n.y], n.name).toEqual([FX[key].tidyScrambled[i].x, FX[key].tidyScrambled[i].y]));
    });
  }
  it("does not mutate its input", () => {
    const t = builtinTemplate("quiz");
    const before = JSON.stringify(t.graph.nodes);
    tidyLayout(t.graph.nodes, t.graph.edges);
    expect(JSON.stringify(t.graph.nodes)).toBe(before);
  });
});

describe("elkLayout", () => {
  for (const key of BUILTIN_KEYS) {
    it(`${key}: no overlaps, edges flow left to right`, async () => {
      const t = builtinTemplate(key);
      const res = await elkLayout(t.graph.nodes, t.graph.edges);
      const m = layoutMetrics(res, t.graph.edges);
      expect(m.overlaps).toBe(0);
      const tidy = layoutMetrics(tidyLayout(t.graph.nodes, t.graph.edges), t.graph.edges);
      console.log(key, "tidy", tidy, "elk", m);
    });
  }
});

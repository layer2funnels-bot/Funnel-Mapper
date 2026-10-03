import { beforeEach, describe, expect, it } from "vitest";
import { BLOCK_TYPES, LIB_GROUPS, isBlockType, typeOf, type LibGroup } from "@/lib/catalog";
import { FAMILIES, FAMILY_GEOM, visualOf, WIREFRAMES } from "@/lib/block-visuals";
import { BY_KEY, ITEMS, searchLibrary } from "@/lib/library";
import { addNode, initEditor, useEditor } from "@/lib/editor/store";
import { blankGraph, blankSettings } from "@/lib/graph";

describe("the 169-block library, verified programmatically", () => {
  it("has exactly 169 items: 152 flow blocks + 17 layout presets", () => {
    expect(ITEMS.length).toBe(169);
    const flow = ITEMS.filter((i) => typeOf(i.payload.type).cat !== "annot");
    expect(flow.length).toBe(152);
    expect(ITEMS.length - flow.length).toBe(17);
  });

  it("has no duplicate or missing keys", () => {
    const keys = ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(Object.keys(BY_KEY).length).toBe(169);
    for (const i of ITEMS) {
      expect(i.label.trim(), i.key).not.toBe("");
      expect(isBlockType(i.payload.type), `${i.key} -> ${i.payload.type}`).toBe(true);
      expect(LIB_GROUPS[i.group], i.key).toBeTruthy();
    }
  });

  it("keeps all 8 categories populated", () => {
    const groups = Object.keys(LIB_GROUPS) as LibGroup[];
    expect(groups.length).toBe(8);
    for (const g of groups) expect(ITEMS.filter((i) => i.group === g).length, g).toBeGreaterThan(0);
  });

  it("gives every item a visual definition (family + geometry), 169 of 169", () => {
    let n = 0;
    for (const i of ITEMS) {
      const v = visualOf(i.payload.type);
      expect(FAMILIES[v.family], i.key).toBeTruthy();
      expect(FAMILY_GEOM[v.family], i.key).toBeTruthy();
      n++;
    }
    expect(n).toBe(169);
  });

  it("draws every page and offer with a semantic wireframe, and reports which ones use the documented fallback", () => {
    const fallback: string[] = [];
    for (const i of ITEMS) {
      const v = visualOf(i.payload.type);
      if (!FAMILIES[v.family].strip) continue;
      expect(WIREFRAMES[v.wireframe!], i.key).toBeTruthy();
      // documented fallbacks: pages -> sales, offers -> order
      if ((v.family === "page" && v.wireframe === "sales") || (v.family === "offer" && v.wireframe === "order")) fallback.push(i.key);
    }
    // the fallback set is explicit (not "everything"): most pages and offers carry their own wireframe
    expect(fallback.length).toBeLessThan(40);
    expect(visualOf("optin").wireframe).toBe("optin");
    expect(visualOf("webinar").wireframe).toBe("webinar");
  });

  it("finds every item by its own label (search coverage)", () => {
    for (const i of ITEMS) expect(searchLibrary(i.label).map((x) => x.key), i.key).toContain(i.key);
  });

  it("finds items by keyword and by group name", () => {
    expect(searchLibrary("oto").map((x) => x.key)).toContain("upsellp");
    expect(searchLibrary("Sales & CRM").length).toBeGreaterThan(5);
    expect(searchLibrary("zzzz-nothing")).toEqual([]);
  });

  describe("placeable", () => {
    beforeEach(() => initEditor({ funnelId: "t", clientId: "c", name: "t", graph: blankGraph(), settings: blankSettings() }));
    it("every item can be added to the canvas as its block type", () => {
      for (const i of ITEMS) {
        const n = addNode(i.payload.type, 0, 0, i.payload);
        expect(n, i.key).toBeTruthy();
        expect(n!.type).toBe(i.payload.type);
      }
      expect(useEditor.getState().nodes.length).toBe(169);
      // flow blocks all have ports/maths metadata
      for (const k of Object.keys(BLOCK_TYPES)) expect(typeOf(k).label).toBeTruthy();
    });
  });
});

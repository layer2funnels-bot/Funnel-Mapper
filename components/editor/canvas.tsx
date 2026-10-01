"use client";
import "@xyflow/react/dist/base.css";
import { Background, BackgroundVariant, MiniMap, ReactFlow, SelectionMode, useReactFlow, type Connection, type Edge, type Node, type NodeChange, type OnSelectionChangeParams, type EdgeChange } from "@xyflow/react";
import { useCallback, useMemo, useRef } from "react";
import { Icon } from "@/components/icon";
import { CATHEX, typeOf } from "@/lib/catalog";
import { addNode, canConnect, clearSelection, connect, frameMembers, moveNodes, selectEdge, selectNodes, setHeights, setView, useEditor } from "@/lib/editor/store";
import { edgeTypes } from "./flow-edge";
import { nodeTypes } from "./nodes";

const rfType = (t: string) => (t === "note" || t === "label" || t === "frame" ? t : "block");
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export const DND_MIME = "application/x-funnel-block";

export function Canvas() {
  const nodes = useEditor((s) => s.nodes);
  const edges = useEditor((s) => s.edges);
  const selNodes = useEditor((s) => s.selNodes);
  const selEdge = useEditor((s) => s.selEdge);
  const opts = useEditor((s) => s.opts);
  const readOnly = useEditor((s) => s.readOnly);
  const view = useEditor((s) => s.view);
  const rf = useReactFlow();
  const dims = useRef<Record<string, { width: number; height: number }>>({});
  const frameDrag = useRef<{ frame: string; start: { x: number; y: number }; members: Record<string, { x: number; y: number }> } | null>(null);

  const rfNodes: Node[] = useMemo(() => {
    const sel = new Set(selNodes);
    return nodes.map((n) => {
      const frame = n.type === "frame";
      const m = dims.current[n.id];
      return {
        id: n.id,
        type: rfType(n.type),
        position: { x: n.x, y: n.y },
        data: { id: n.id },
        selected: sel.has(n.id),
        zIndex: frame ? -1 : 0,
        ...(frame ? { width: n.w ?? 520, height: n.h ?? 300, style: { width: n.w ?? 520, height: n.h ?? 300 } } : {}),
        ...(m && !frame ? { measured: m } : {}),
        draggable: !readOnly,
        connectable: !readOnly,
        ariaLabel: `${typeOf(n.type)?.label}: ${n.name}`,
      } satisfies Node;
    });
  }, [nodes, selNodes, readOnly]);

  const rfEdges: Edge[] = useMemo(() => {
    const B = Object.fromEntries(nodes.map((n) => [n.id, n]));
    return edges
      .filter((e) => B[e.from] && B[e.to])
      .map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        sourceHandle: e.port === "alt" ? "alt" : "main",
        targetHandle: "in",
        type: "flow",
        selected: selEdge === e.id,
        data: { port: e.port, fromType: B[e.from]?.type, share: e.share },
      }));
  }, [edges, nodes, selEdge]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const pos: Record<string, { x: number; y: number }> = {};
    const heights: Record<string, number> = {};
    for (const c of changes) {
      if (c.type === "position" && c.position) pos[c.id] = { x: Math.round(c.position.x), y: Math.round(c.position.y) };
      if (c.type === "dimensions" && c.dimensions) {
        const node = useEditor.getState().nodes.find((n) => n.id === c.id);
        if (node?.type === "frame") {
          if (c.resizing) moveNodes({ [c.id]: { x: node.x, y: node.y, w: Math.round(c.dimensions.width), h: Math.round(c.dimensions.height) } });
          continue;
        }
        dims.current[c.id] = c.dimensions;
        heights[c.id] = Math.round(c.dimensions.height);
      }
    }
    if (Object.keys(heights).length) setHeights(heights);
    if (!Object.keys(pos).length) return;
    // dragging a frame carries the blocks inside it
    const fd = frameDrag.current;
    if (fd && pos[fd.frame]) {
      const dx = pos[fd.frame].x - fd.start.x,
        dy = pos[fd.frame].y - fd.start.y;
      for (const [id, p] of Object.entries(fd.members)) if (!pos[id]) pos[id] = { x: p.x + dx, y: p.y + dy };
    }
    moveNodes(pos);
  }, []);

  const onNodeDragStart = useCallback((_: unknown, node: Node) => {
    const s = useEditor.getState();
    const n = s.nodes.find((x) => x.id === node.id);
    if (n?.type !== "frame") {
      frameDrag.current = null;
      return;
    }
    const sel = new Set(s.selNodes);
    const members = Object.fromEntries(
      frameMembers(n.id)
        .filter((id) => !sel.has(id))
        .map((id) => {
          const m = s.nodes.find((x) => x.id === id)!;
          return [id, { x: m.x, y: m.y }];
        }),
    );
    frameDrag.current = { frame: n.id, start: { x: n.x, y: n.y }, members };
  }, []);

  const onEdgesChange = useCallback((_: EdgeChange[]) => {
    // edge removal/selection is handled by the store (keyboard + onSelectionChange)
  }, []);

  const onSelectionChange = useCallback(({ nodes: ns, edges: es }: OnSelectionChangeParams) => {
    const s = useEditor.getState();
    const ids = ns.map((n) => n.id);
    if (ids.length) {
      if (!same(ids, s.selNodes) || s.selEdge) selectNodes(ids);
    } else if (es.length === 1) {
      if (s.selEdge !== es[0].id) selectEdge(es[0].id);
    } else if (s.selNodes.length || s.selEdge) clearSelection();
  }, []);

  const isValidConnection = useCallback((c: Connection | Edge) => !!c.source && !!c.target && canConnect(c.source, c.target, c.sourceHandle === "alt" ? "alt" : "main"), []);
  const onConnect = useCallback((c: Connection) => connect(c.source, c.sourceHandle === "alt" ? "alt" : "main", c.target), []);

  const onDrop = useCallback(
    (ev: React.DragEvent) => {
      const raw = ev.dataTransfer.getData(DND_MIME);
      if (!raw) return;
      ev.preventDefault();
      const { type, p, name } = JSON.parse(raw) as { type: string; p?: Record<string, unknown>; name?: string };
      const at = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      addNode(type, at.x - 105, at.y - 48, { p, name });
    },
    [rf],
  );

  const miniColor = useCallback((n: Node) => {
    const node = useEditor.getState().nodes.find((x) => x.id === n.id);
    const T = node && typeOf(node.type);
    return T ? CATHEX[T.color ?? T.cat] : "#888";
  }, []);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={() => (frameDrag.current = null)}
      onSelectionChange={onSelectionChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      onPaneClick={() => clearSelection()}
      onDrop={onDrop}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DND_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      defaultViewport={{ x: view.x, y: view.y, zoom: view.k }}
      onMoveEnd={(_, vp) => setView({ x: Math.round(vp.x), y: Math.round(vp.y), k: Math.round(vp.zoom * 1000) / 1000 })}
      minZoom={0.2}
      maxZoom={2.5}
      snapToGrid={opts.snap}
      snapGrid={[11, 11]}
      selectionKeyCode="Shift"
      multiSelectionKeyCode={["Shift", "Meta", "Control"]}
      selectionMode={SelectionMode.Partial}
      deleteKeyCode={null}
      selectNodesOnDrag={false}
      nodesDraggable={!readOnly}
      nodesConnectable={!readOnly}
      elementsSelectable
      zoomOnDoubleClick={false}
      connectionRadius={30}
      proOptions={{ hideAttribution: true }}
      aria-label="Funnel canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--dot)" />
      {opts.mini && <MiniMap position="bottom-left" pannable zoomable nodeColor={miniColor} nodeStrokeWidth={0} ariaLabel="Mini map" style={{ width: 190, height: 120 }} />}
    </ReactFlow>
  );
}

export function ZoomControls() {
  const rf = useReactFlow();
  const k = useEditor((s) => s.view.k);
  return (
    <div className="fm-zoom">
      <button type="button" className="btn icon" aria-label="Zoom out" onClick={() => rf.zoomOut({ duration: 150 })}>
        <Icon name="minus" />
      </button>
      <output aria-live="polite">{Math.round(k * 100)}%</output>
      <button type="button" className="btn icon" aria-label="Zoom in" onClick={() => rf.zoomIn({ duration: 150 })}>
        <Icon name="plus" />
      </button>
      <button type="button" className="btn" onClick={() => rf.fitView({ padding: 0.15, duration: 250, maxZoom: 1.2 })}>
        Fit
      </button>
    </div>
  );
}


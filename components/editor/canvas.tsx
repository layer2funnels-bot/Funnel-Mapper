"use client";
import "@xyflow/react/dist/base.css";
import { Background, BackgroundVariant, MiniMap, ReactFlow, SelectionMode, useReactFlow, type Connection, type Edge, type Node, type NodeChange, type EdgeChange, type FinalConnectionState } from "@xyflow/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { CATDARK, SIZED_TYPES, WIDTH_TYPES, typeOf } from "@/lib/catalog";
import { addNode, canConnect, clearSelection, connect, frameMembers, layerOf, moveNodes, selectEdge, selectNodes, setDims, setView, useEditor } from "@/lib/editor/store";
import { edgeTypes } from "./flow-edge";
import { nodeTypes } from "./nodes";

const OWN_TYPES = new Set(["note", "label", "frame", "shape", "image", "checklist"]);
const rfType = (t: string) => (OWN_TYPES.has(t) ? t : "block");
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
  // a funnel that has never been panned/zoomed (default view) is fitted to the screen on first load
  const [fitOnInit] = useState(() => {
    const s = useEditor.getState();
    return s.nodes.length > 0 && s.view.x === 60 && s.view.y === 40 && s.view.k === 1;
  });
  const dims = useEditor((s) => s.dims);
  const frameDrag = useRef<{ frame: string; start: { x: number; y: number }; members: Record<string, { x: number; y: number }> } | null>(null);

  const rfNodes: Node[] = useMemo(() => {
    const sel = new Set(selNodes);
    return nodes.map((n) => {
      const sized = SIZED_TYPES.has(n.type);
      const m = dims[n.id];
      return {
        id: n.id,
        type: rfType(n.type),
        position: { x: n.x, y: n.y },
        data: { id: n.id },
        selected: sel.has(n.id),
        zIndex: layerOf(n),
        ...(sized ? { width: n.w ?? 200, height: n.h ?? 120, style: { width: n.w ?? 200, height: n.h ?? 120 } } : {}),
        ...(!sized && WIDTH_TYPES.has(n.type) && n.w ? { style: { width: n.w } } : {}),
        ...(m && !sized ? { measured: m } : {}),
        draggable: !readOnly && !n.locked,
        deletable: !n.locked,
        connectable: !readOnly,
        ariaLabel: `${typeOf(n.type)?.label}: ${n.name}${n.locked ? " (locked)" : ""}`,
      } satisfies Node;
    });
  }, [nodes, selNodes, readOnly, dims]);

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
        data: { port: e.port, fromType: B[e.from]?.type, share: e.share, s: e.s },
      }));
  }, [edges, nodes, selEdge]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const pos: Record<string, { x: number; y: number }> = {};
    const sizes: Record<string, { width: number; height: number }> = {};
    // selection: React Flow asks, the store decides (fully controlled, no feedback loop)
    const sel = changes.filter((c) => c.type === "select");
    if (sel.length) {
      const st = useEditor.getState();
      const next = new Set(st.selNodes);
      sel.forEach((c) => (c.selected ? next.add(c.id) : next.delete(c.id)));
      const ids = st.nodes.map((n) => n.id).filter((id) => next.has(id));
      if (!same(ids, st.selNodes)) {
        if (ids.length) selectNodes(ids);
        else if (!st.selEdge) clearSelection();
        else useEditor.setState({ selNodes: [] });
      }
    }
    for (const c of changes) {
      if (c.type === "position" && c.position) pos[c.id] = { x: Math.round(c.position.x), y: Math.round(c.position.y) };
      if (c.type === "dimensions" && c.dimensions) {
        const node = useEditor.getState().nodes.find((n) => n.id === c.id);
        if (node && SIZED_TYPES.has(node.type)) {
          if (c.resizing) moveNodes({ [c.id]: { x: node.x, y: node.y, w: Math.round(c.dimensions.width), h: Math.round(c.dimensions.height) } });
          continue;
        }
        // width-only elements: follow the handle live; their height is measured from the content
        if (node && WIDTH_TYPES.has(node.type) && c.resizing) moveNodes({ [c.id]: { x: node.x, y: node.y, w: Math.round(c.dimensions.width) } });
        sizes[c.id] = { width: Math.round(c.dimensions.width), height: Math.round(c.dimensions.height) };
      }
    }
    if (Object.keys(sizes).length) setDims(sizes);
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
        .filter((id) => !sel.has(id) && !s.nodes.find((x) => x.id === id)?.locked)
        .map((id) => {
          const m = s.nodes.find((x) => x.id === id)!;
          return [id, { x: m.x, y: m.y }];
        }),
    );
    frameDrag.current = { frame: n.id, start: { x: n.x, y: n.y }, members };
  }, []);

  // Edges are selected only by clicking them (box selection must not hand the selection to an edge);
  // React Flow's deselect changes still clear it.
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const c of changes) if (c.type === "select" && !c.selected && useEditor.getState().selEdge === c.id) useEditor.setState({ selEdge: null });
  }, []);

  const isValidConnection = useCallback((c: Connection | Edge) => !!c.source && !!c.target && canConnect(c.source, c.target, c.sourceHandle === "alt" ? "alt" : "main"), []);
  const onConnect = useCallback((c: Connection) => connect(c.source, c.sourceHandle === "alt" ? "alt" : "main", c.target), []);
  // Like the prototype: dropping a connection anywhere on a block (not just its input dot) connects to it.
  const onConnectEnd = useCallback((ev: MouseEvent | TouchEvent, state: FinalConnectionState) => {
    if (state.isValid || !state.fromNode || state.fromHandle?.type !== "source") return;
    const pt = "changedTouches" in ev ? ev.changedTouches[0] : ev;
    const target = document.elementFromPoint(pt.clientX, pt.clientY)?.closest(".react-flow__node")?.getAttribute("data-id");
    if (!target) return;
    const port = state.fromHandle.id === "alt" ? "alt" : "main";
    if (canConnect(state.fromNode.id, target, port)) connect(state.fromNode.id, port, target);
  }, []);

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
    if (node?.type === "frame") return `${String(node.p.color ?? "#10B981")}26`;
    const T = node && typeOf(node.type);
    return T ? CATDARK[T.color ?? T.cat] : "#888";
  }, []);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onEdgeClick={(_, e) => selectEdge(e.id)}
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={() => (frameDrag.current = null)}
      onConnect={onConnect}
      onConnectEnd={onConnectEnd}
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
      fitView={fitOnInit}
      fitViewOptions={{ padding: 0.15, maxZoom: 1.2 }}
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
      attributionPosition="top-right"
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


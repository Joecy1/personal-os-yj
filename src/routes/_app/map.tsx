// Personal Map — hand-drawn hybrid: Inner Citadel + Defend / Destroy engines + 3 outputs (Influence, Profit, Impact) + free nodes.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader } from "@/components/Module";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/map")({ component: MapPage });

type Engine = { id: string; label: string; note: string };
type Output = { key: string; label: string; note: string };
type FreeNode = { id: string; label: string; x: number; y: number; note: string };
type MapState = {
  inner_citadel: { label: string; lines: string[] };
  defend_engines: Engine[];
  destroy_engines: Engine[];
  outputs: Output[];
  free_nodes: FreeNode[];
  motto: string;
};

const DEFAULT: MapState = {
  inner_citadel: { label: "Inner citadel", lines: ["Autotelic", "The journey is all there is", "Drive & fuel"] },
  defend_engines: [],
  destroy_engines: [],
  outputs: [
    { key: "influence", label: "Influence", note: "" },
    { key: "profit", label: "Profit", note: "" },
    { key: "impact", label: "Impact", note: "" },
  ],
  free_nodes: [],
  motto: "The journey is all there is",
};

function MapPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [state, setState] = useState<MapState>(DEFAULT);
  const [editing, setEditing] = useState(false);

  const { data: row } = useQuery({
    queryKey: ["personal-map", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("personal_map").select("*").eq("user_id", user!.id).maybeSingle();
      if (!data) {
        const { data: created } = await supabase.from("personal_map").insert({ user_id: user!.id }).select().single();
        return created;
      }
      return data;
    },
  });

  useEffect(() => {
    if (!row) return;
    setState({
      inner_citadel: (row.inner_citadel as any) ?? DEFAULT.inner_citadel,
      defend_engines: (row.defend_engines as any) ?? [],
      destroy_engines: (row.destroy_engines as any) ?? [],
      outputs: (row.outputs as any) ?? DEFAULT.outputs,
      free_nodes: (row.free_nodes as any) ?? [],
      motto: row.motto ?? DEFAULT.motto,
    });
  }, [row]);

  const save = useMutation({
    mutationFn: async (next: MapState) => {
      if (!user) return;
      await supabase.from("personal_map").update({
        inner_citadel: next.inner_citadel,
        defend_engines: next.defend_engines,
        destroy_engines: next.destroy_engines,
        outputs: next.outputs,
        free_nodes: next.free_nodes,
        motto: next.motto,
      }).eq("user_id", user.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["personal-map"] }); toast.success("Map saved"); },
  });

  const persist = (next: MapState) => { setState(next); save.mutate(next); };

  return (
    <Module>
      <PageHeader title="Personal map" subtitle="Inner citadel · Engines to defend · Engines to destroy · Outputs" actions={
        <button className="pos-btn" onClick={() => setEditing((e) => !e)}>{editing ? "Done editing" : "Edit"}</button>
      } />

      {/* Hand-drawn map */}
      <div style={{ background: "#FAF6E6", border: "1px solid var(--rule)", borderRadius: 10, padding: 24, marginBottom: 24, position: "relative", minHeight: 480 }}>
        <HandDrawnMap state={state} />
      </div>

      {editing && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <CitadelEditor state={state} persist={persist} />
          <OutputsEditor state={state} persist={persist} />
          <EngineEditor title="Engines to defend" subtitle="What protects your inner citadel — keep these alive."
            engines={state.defend_engines}
            onChange={(engines) => persist({ ...state, defend_engines: engines })}
            color="var(--teal)"
          />
          <EngineEditor title="Engines to destroy" subtitle="What erodes your inner citadel — kill or contain these."
            engines={state.destroy_engines}
            onChange={(engines) => persist({ ...state, destroy_engines: engines })}
            color="var(--coral)"
          />
          <FreeNodesEditor state={state} persist={persist} />
        </div>
      )}
    </Module>
  );
}

function HandDrawnMap({ state }: { state: MapState }) {
  const W = 1000, H = 540;
  const cx = 200, cy = 380;
  const outX = [W - 180, W - 180, W - 180];
  const outY = [120, 280, 440];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", fontFamily: "var(--font-serif)" }}>
      {/* Inner citadel */}
      <g>
        <ellipse cx={cx} cy={cy} rx={130} ry={110} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
        <text x={cx} y={cy - 60} textAnchor="middle" fontSize={14} fill="var(--coral)" fontFamily="var(--font-sans)">● {state.inner_citadel.label}</text>
        {state.inner_citadel.lines.map((l, i) => (
          <text key={i} x={cx} y={cy - 30 + i * 20} textAnchor="middle" fontSize={13} fill="var(--ink)" fontFamily="var(--font-sans)">{l}</text>
        ))}
      </g>

      {/* Motto */}
      <text x={cx + 200} y={cy + 30} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-serif)" fontStyle="italic">{state.motto}</text>

      {/* Defend engines (above citadel) */}
      {state.defend_engines.slice(0, 3).map((e, i) => {
        const x = 60 + i * 130, y = 120;
        return (
          <g key={e.id}>
            <text x={x} y={y - 8} fontSize={10} fill="var(--teal)" fontFamily="var(--font-mono)">DEFEND</text>
            <text x={x} y={y + 8} fontSize={12} fill="var(--ink)" fontFamily="var(--font-sans)" fontWeight={500}>{e.label}</text>
            <line x1={x + 30} y1={y + 18} x2={cx - 50} y2={cy - 90} stroke="var(--teal)" strokeWidth={1} markerEnd="url(#arrInk)" />
          </g>
        );
      })}

      {/* Destroy engines (below citadel) */}
      {state.destroy_engines.slice(0, 3).map((e, i) => {
        const x = 60 + i * 130, y = 510;
        return (
          <g key={e.id}>
            <text x={x} y={y - 16} fontSize={10} fill="var(--coral)" fontFamily="var(--font-mono)">DESTROY ↑</text>
            <text x={x} y={y} fontSize={12} fill="var(--ink)" fontFamily="var(--font-sans)" fontWeight={500} textDecoration="line-through">{e.label}</text>
            <line x1={x + 30} y1={y - 30} x2={cx - 50} y2={cy + 80} stroke="var(--coral)" strokeWidth={1} strokeDasharray="3 3" />
          </g>
        );
      })}

      {/* Outputs (right side) */}
      <defs>
        <marker id="arrInk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ink)" />
        </marker>
      </defs>
      {state.outputs.map((o, i) => {
        const x = outX[i], y = outY[i];
        return (
          <g key={o.key}>
            <circle cx={x} cy={y} r={70} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
            <text x={x} y={y - 4} textAnchor="middle" fontSize={14} fontWeight={500} fill="var(--ink)" fontFamily="var(--font-sans)">{o.label}</text>
            {o.note && <text x={x} y={y + 14} textAnchor="middle" fontSize={10} fill="var(--ink-3)" fontFamily="var(--font-sans)">{o.note.slice(0, 26)}</text>}
            <line x1={cx + 130} y1={cy - 40 + i * 20} x2={x - 70} y2={y} stroke="var(--ink)" strokeWidth={1} markerEnd="url(#arrInk)" />
            <text x={(cx + 130 + x - 70) / 2} y={(cy - 40 + i * 20 + y) / 2 - 6} textAnchor="middle" fontSize={11} fill="var(--ink-3)" fontFamily="var(--font-serif)" fontStyle="italic">→ {o.label.toLowerCase()}</text>
          </g>
        );
      })}

      {/* Free nodes */}
      {state.free_nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={40} fill="none" stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="2 2" />
          <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize={11} fill="var(--ink-2)" fontFamily="var(--font-sans)">{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

function CitadelEditor({ state, persist }: { state: MapState; persist: (s: MapState) => void }) {
  return (
    <div className="pos-card">
      <div className="card-label">Inner citadel</div>
      <label className="pos-label">Label</label>
      <input className="pos-input" value={state.inner_citadel.label} onChange={(e) => persist({ ...state, inner_citadel: { ...state.inner_citadel, label: e.target.value } })} />
      <label className="pos-label" style={{ marginTop: 12 }}>Lines (one per line)</label>
      <textarea className="pos-input" rows={4} value={state.inner_citadel.lines.join("\n")} onChange={(e) => persist({ ...state, inner_citadel: { ...state.inner_citadel, lines: e.target.value.split("\n").slice(0, 5) } })} />
      <label className="pos-label" style={{ marginTop: 12 }}>Motto</label>
      <input className="pos-input" value={state.motto} onChange={(e) => persist({ ...state, motto: e.target.value })} />
    </div>
  );
}

function OutputsEditor({ state, persist }: { state: MapState; persist: (s: MapState) => void }) {
  return (
    <div className="pos-card">
      <div className="card-label">Outputs</div>
      {state.outputs.map((o, i) => (
        <div key={o.key} style={{ marginBottom: 10 }}>
          <label className="pos-label">{o.label}</label>
          <input className="pos-input" value={o.note} placeholder={`What does ${o.label.toLowerCase()} look like for you?`} onChange={(e) => {
            const next = [...state.outputs]; next[i] = { ...next[i], note: e.target.value };
            persist({ ...state, outputs: next });
          }} />
        </div>
      ))}
    </div>
  );
}

function EngineEditor({ title, subtitle, engines, onChange, color }: { title: string; subtitle: string; engines: Engine[]; onChange: (e: Engine[]) => void; color: string }) {
  return (
    <div className="pos-card">
      <div className="card-label" style={{ color }}>{title}</div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>{subtitle}</div>
      {engines.map((e, i) => (
        <div key={e.id} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input className="pos-input" value={e.label} placeholder="Name" onChange={(ev) => { const n = [...engines]; n[i] = { ...n[i], label: ev.target.value }; onChange(n); }} />
          <button className="pos-btn" onClick={() => onChange(engines.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button className="add-btn" onClick={() => onChange([...engines, { id: crypto.randomUUID(), label: "", note: "" }])}>+ Add</button>
    </div>
  );
}

function FreeNodesEditor({ state, persist }: { state: MapState; persist: (s: MapState) => void }) {
  return (
    <div className="pos-card" style={{ gridColumn: "span 2" }}>
      <div className="card-label">Free nodes</div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>Loose ideas, references, anchors. Position them by tweaking x/y (0–1000, 0–540).</div>
      {state.free_nodes.map((n, i) => (
        <div key={n.id} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <input className="pos-input" style={{ flex: 2 }} value={n.label} placeholder="Label" onChange={(e) => { const a = [...state.free_nodes]; a[i] = { ...a[i], label: e.target.value }; persist({ ...state, free_nodes: a }); }} />
          <input className="pos-input" style={{ width: 70 }} type="number" value={n.x} onChange={(e) => { const a = [...state.free_nodes]; a[i] = { ...a[i], x: Number(e.target.value) }; persist({ ...state, free_nodes: a }); }} />
          <input className="pos-input" style={{ width: 70 }} type="number" value={n.y} onChange={(e) => { const a = [...state.free_nodes]; a[i] = { ...a[i], y: Number(e.target.value) }; persist({ ...state, free_nodes: a }); }} />
          <button className="pos-btn" onClick={() => persist({ ...state, free_nodes: state.free_nodes.filter((_, j) => j !== i) })}>×</button>
        </div>
      ))}
      <button className="add-btn" onClick={() => persist({ ...state, free_nodes: [...state.free_nodes, { id: crypto.randomUUID(), label: "New node", x: 500, y: 270, note: "" }] })}>+ Add free node</button>
    </div>
  );
}

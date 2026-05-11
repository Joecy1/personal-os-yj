import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, SectionHeader, EmptyState } from "@/components/Module";
import { shortDate } from "@/lib/date";
import { MapRenderer, type MapData } from "@/components/MapRenderer";
import { FrameworkChips } from "@/components/FrameworkPicker";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/worldmap")({ component: WorldMapPage });

type Wmap = { id: string; topic: string; raw_text: string; map_data: MapData | null; status: string; created_at: string };
type Wcomp = { id: string; initiator_id: string; partner_id: string; partner_label: string; comparison_data: any; created_at: string };

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/worldmap-ai`;

async function callExtract(rawText: string, topic: string) {
  const r = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
    body: JSON.stringify({ action: "extract", rawText, topic }),
  });
  if (r.status === 429) throw new Error("Rate limited — try again shortly.");
  if (r.status === 402) throw new Error("AI credits exhausted — top up in Settings.");
  if (!r.ok) throw new Error("Extraction failed");
  const j = await r.json();
  return j.map_data as MapData;
}

async function callCompare(myMap: MapData, partnerMap: MapData, myLabel: string, partnerLabel: string, topic: string) {
  const r = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
    body: JSON.stringify({ action: "compare", myMap, partnerMap, myLabel, partnerLabel, topic }),
  });
  if (r.status === 429) throw new Error("Rate limited — try again shortly.");
  if (r.status === 402) throw new Error("AI credits exhausted.");
  if (!r.ok) throw new Error("Comparison failed");
  const j = await r.json();
  return j.comparison_data;
}

function WorldMapPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState<{ kind: "index" } | { kind: "create" } | { kind: "map"; id: string } | { kind: "compareForm"; mapId: string } | { kind: "comparison"; id: string }>({ kind: "index" });

  const { data: maps } = useQuery({
    queryKey: ["world-maps", user?.id],
    enabled: !!user,
    queryFn: async () => ((await supabase.from("world_maps").select("*").order("created_at", { ascending: false })).data ?? []) as Wmap[],
  });

  const { data: comparisons } = useQuery({
    queryKey: ["world-comparisons", user?.id],
    enabled: !!user,
    queryFn: async () => ((await supabase.from("world_map_comparisons").select("*").order("created_at", { ascending: false })).data ?? []) as Wcomp[],
  });

  const completed = useMemo(() => (maps ?? []).filter((m) => m.status === "complete"), [maps]);

  const Anchor = (
    <div style={{ borderLeft: "3px solid var(--purple)", paddingLeft: 14, marginBottom: 28 }}>
      <div className="font-serif" style={{ fontStyle: "italic", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.5 }}>
        "The world outside and the pictures in our heads."
      </div>
      <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 6 }}>
        Walter Lippmann, Public Opinion, 1922
      </div>
    </div>
  );

  if (view.kind === "create") {
    return <Module>{Anchor}<CreatePanel onCancel={() => setView({ kind: "index" })} onCreated={(id) => { qc.invalidateQueries({ queryKey: ["world-maps"] }); qc.invalidateQueries({ queryKey: ["sidebar-badges"] }); setView({ kind: "map", id }); }} /></Module>;
  }
  if (view.kind === "map") {
    const m = (maps ?? []).find((x) => x.id === view.id);
    if (!m) return <Module>{Anchor}<EmptyState>Map not found.</EmptyState></Module>;
    return <Module>{Anchor}<SingleMapView map={m} onBack={() => setView({ kind: "index" })} onCompare={() => setView({ kind: "compareForm", mapId: m.id })} /></Module>;
  }
  if (view.kind === "compareForm") {
    const m = (maps ?? []).find((x) => x.id === view.mapId);
    if (!m) return <Module>{Anchor}<EmptyState>Map not found.</EmptyState></Module>;
    return <Module>{Anchor}<CompareForm myMap={m} onCancel={() => setView({ kind: "map", id: m.id })} onDone={(cid) => { qc.invalidateQueries({ queryKey: ["world-comparisons"] }); qc.invalidateQueries({ queryKey: ["world-maps"] }); setView({ kind: "comparison", id: cid }); }} /></Module>;
  }
  if (view.kind === "comparison") {
    const c = (comparisons ?? []).find((x) => x.id === view.id);
    const myMap = c ? (maps ?? []).find((m) => m.id === c.initiator_id) : null;
    const partnerMap = c ? (maps ?? []).find((m) => m.id === c.partner_id) : null;
    if (!c || !myMap || !partnerMap) return <Module>{Anchor}<EmptyState>Comparison not found.</EmptyState></Module>;
    return <Module>{Anchor}<ComparisonView c={c} myMap={myMap} partnerMap={partnerMap} onBack={() => setView({ kind: "map", id: myMap.id })} /></Module>;
  }

  return (
    <Module>
      {Anchor}
      <PageHeader
        title="World map"
        subtitle="Make your mental model visible — then compare it"
        actions={<button className="pos-btn primary" onClick={() => setView({ kind: "create" })}>+ New map</button>}
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Maps created", val: completed.length },
          { label: "Comparisons made", val: (comparisons ?? []).length },
          { label: "Topics mapped", val: new Set(completed.map((m) => m.topic)).size },
        ].map((s) => (
          <div key={s.label} className="pos-card">
            <div className="card-label">{s.label}</div>
            <div className="font-serif" style={{ fontSize: 24 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <SectionHeader title="Your maps" />
      {completed.length === 0 ? <EmptyState>No maps yet — describe how you see something.</EmptyState> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {completed.map((m) => {
            const cs = (comparisons ?? []).filter((c) => c.initiator_id === m.id || c.partner_id === m.id);
            return (
              <button key={m.id} onClick={() => setView({ kind: "map", id: m.id })} className="pos-card" style={{ textAlign: "left", cursor: "pointer" }}>
                <div className="font-serif" style={{ fontSize: 16, marginBottom: 6 }}>{m.topic}</div>
                <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {shortDate(m.created_at)} · {m.map_data?.nodes?.length ?? 0} nodes{cs.length ? ` · ${cs.length} comparison${cs.length > 1 ? "s" : ""}` : ""}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <SectionHeader title="Comparisons" />
      {(comparisons ?? []).length === 0 ? <EmptyState>No comparisons yet.</EmptyState> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {(comparisons ?? []).map((c) => {
            const m = (maps ?? []).find((x) => x.id === c.initiator_id);
            return (
              <button key={c.id} onClick={() => setView({ kind: "comparison", id: c.id })} className="pos-card" style={{ textAlign: "left", cursor: "pointer" }}>
                <div className="font-serif" style={{ fontSize: 16, marginBottom: 6 }}>{m?.topic ?? "—"} <span style={{ color: "var(--ink-4)" }}>vs.</span> {c.partner_label}</div>
                <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{shortDate(c.created_at)}</div>
              </button>
            );
          })}
        </div>
      )}
    </Module>
  );
}

function CreatePanel({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [raw, setRaw] = useState("");
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !topic.trim() || !raw.trim()) return;
    setBusy(true);
    try {
      const ins = await supabase.from("world_maps").insert({ user_id: user.id, topic: topic.trim(), raw_text: raw.trim(), status: "draft", frameworks_used: frameworks }).select("id").single();
      if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "insert failed");
      const map_data = await callExtract(raw.trim(), topic.trim());
      await supabase.from("world_maps").update({ map_data: map_data as any, status: "complete" }).eq("id", ins.data.id);
      onCreated(ins.data.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="New map" subtitle="Describe how you see something — the AI will extract its structure" actions={<button className="pos-btn" onClick={onCancel}>Cancel</button>} />
      <div className="pos-card">
        <label className="pos-label">What are you trying to map?</label>
        <input className="pos-input" placeholder='e.g. "What is success?"' value={topic} onChange={(e) => setTopic(e.target.value)} />
        <label className="pos-label" style={{ marginTop: 14 }}>Your description</label>
        <textarea className="pos-input" rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} />
        <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 6 }}>
          The more honest and specific you are, the more the map will reveal. You are the only one who sees this.
        </div>
        <label className="pos-label" style={{ marginTop: 14 }}>Any framework shaping how you see this?</label>
        <FrameworkChips selectedSlugs={frameworks} onChange={setFrameworks} emptyHint="None unlocked yet — optional." />
        <div style={{ marginTop: 18 }}>
          <button className="pos-btn primary" disabled={busy || !topic.trim() || !raw.trim()} onClick={submit}>
            {busy ? "Reading your mental model…" : "Generate my map →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SingleMapView({ map, onBack, onCompare }: { map: Wmap; onBack: () => void; onCompare: () => void }) {
  const [expanded, setExpanded] = useState(false);
  if (!map.map_data) return <EmptyState>No map data.</EmptyState>;
  const a = map.map_data.annotations ?? {};
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button className="pos-btn" onClick={onBack}>← All maps</button>
        <button className="pos-btn" onClick={onCompare}>Compare with someone →</button>
      </div>
      <div className="font-serif" style={{ fontSize: 22, marginBottom: 4 }}>{map.topic}</div>
      <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 18 }}>
        Mapped {shortDate(map.created_at)}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, fontStyle: "italic", maxHeight: expanded ? undefined : 84, overflow: "hidden" }}>
          {map.raw_text}
        </div>
        {map.raw_text.length > 280 && (
          <button onClick={() => setExpanded((v) => !v)} className="font-mono" style={{ background: "none", border: "none", padding: 0, marginTop: 6, fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
            {expanded ? "Collapse" : "Read more"}
          </button>
        )}
      </div>

      <div className="pos-card" style={{ marginBottom: 24, padding: 8, background: "var(--cream)" }}>
        <MapRenderer mapData={map.map_data} variant="full" />
      </div>

      {(a.core_insight || a.tension_insight || a.blank_space_insight) && (
        <div className="pos-card">
          {a.core_insight && (
            <div style={{ display: "flex", gap: 12, padding: "8px 0", alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--purple)", marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{a.core_insight}</div>
            </div>
          )}
          {a.tension_insight && (
            <div style={{ display: "flex", gap: 12, padding: "8px 0", alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--coral)", marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{a.tension_insight}</div>
            </div>
          )}
          {a.blank_space_insight && (
            <div style={{ display: "flex", gap: 12, padding: "8px 0", alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{a.blank_space_insight}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CompareForm({ myMap, onCancel, onDone }: { myMap: Wmap; onCancel: () => void; onDone: (cid: string) => void }) {
  const { user } = useAuth();
  const [label, setLabel] = useState("");
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !label.trim() || !raw.trim() || !myMap.map_data) return;
    setBusy(true);
    try {
      const partnerData = await callExtract(raw.trim(), myMap.topic);
      const ins = await supabase.from("world_maps").insert({
        user_id: user.id, topic: myMap.topic, raw_text: raw.trim(),
        map_data: partnerData as any, status: "complete",
      }).select("id").single();
      if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "insert failed");
      const comparison = await callCompare(myMap.map_data, partnerData, "You", label.trim(), myMap.topic);
      const cins = await supabase.from("world_map_comparisons").insert({
        user_id: user.id, initiator_id: myMap.id, partner_id: ins.data.id,
        partner_label: label.trim(), comparison_data: comparison,
      }).select("id").single();
      if (cins.error || !cins.data) throw new Error(cins.error?.message ?? "insert failed");
      onDone(cins.data.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Compare" subtitle={`Compare your map of "${myMap.topic}" with someone else's`} actions={<button className="pos-btn" onClick={onCancel}>Cancel</button>} />
      <div className="pos-card">
        <label className="pos-label">Who are you comparing with?</label>
        <input className="pos-input" placeholder="e.g. Marcus, my sister, a stranger I met" value={label} onChange={(e) => setLabel(e.target.value)} />
        <label className="pos-label" style={{ marginTop: 14 }}>Their description of the same topic</label>
        <textarea className="pos-input" rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} />
        <div style={{ marginTop: 18 }}>
          <button className="pos-btn primary" disabled={busy || !label.trim() || !raw.trim()} onClick={submit}>
            {busy ? "Comparing…" : "Generate comparison →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ComparisonView({ c, myMap, partnerMap, onBack }: { c: Wcomp; myMap: Wmap; partnerMap: Wmap; onBack: () => void }) {
  const cd = c.comparison_data ?? {};
  return (
    <div>
      <button className="pos-btn" onClick={onBack} style={{ marginBottom: 12 }}>← Back</button>
      <div className="font-serif" style={{ fontSize: 22, marginBottom: 18 }}>{myMap.topic} <span style={{ color: "var(--ink-4)" }}>— You vs. {c.partner_label}</span></div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <div className="pos-card" style={{ background: "var(--purple-bg)", borderColor: "rgba(90,68,168,0.2)", padding: 12 }}>
          <div className="card-label" style={{ color: "var(--purple)" }}>You</div>
          {myMap.map_data && <MapRenderer mapData={myMap.map_data} variant="compact" />}
        </div>
        <div className="pos-card" style={{ background: "var(--teal-bg)", borderColor: "rgba(10,122,106,0.2)", padding: 12 }}>
          <div className="card-label" style={{ color: "var(--teal)" }}>{c.partner_label}</div>
          {partnerMap.map_data && <MapRenderer mapData={partnerMap.map_data} variant="compact" />}
        </div>
      </div>

      <Panel title="Shared ground" color="var(--teal)" items={(cd.shared_ground ?? []).map((x: any) => ({ a: x.observation, b: x.significance }))} />
      <Panel title="Where you diverge" color="var(--amber)" items={(cd.divergences ?? []).map((x: any) => ({ a: x.observation, b: x.significance }))} />
      <Panel title="What only each person can see" color="var(--purple)" items={[
        ...(cd.only_in_mine ?? []).map((x: any) => ({ a: `Only you: ${x.concept}`, b: x.interpretation })),
        ...(cd.only_in_theirs ?? []).map((x: any) => ({ a: `Only ${c.partner_label}: ${x.concept}`, b: x.interpretation })),
      ]} />

      {(cd.conversation_starters ?? []).length > 0 && (
        <div style={{ background: "var(--purple-bg)", border: "1px solid rgba(90,68,168,0.2)", borderRadius: 10, padding: "20px 24px", marginTop: 12 }}>
          <div className="font-mono" style={{ fontSize: 10, color: "var(--purple)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            Questions worth asking in person
          </div>
          {(cd.conversation_starters as string[]).map((q, i) => (
            <div key={i} className="font-serif" style={{ fontStyle: "italic", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, padding: "8px 0", borderLeft: "2px solid rgba(90,68,168,0.3)", paddingLeft: 14, marginBottom: 8 }}>
              {q}
            </div>
          ))}
          <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 6 }}>
            These come from the differences in your maps. They are real questions, not prompts.
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ title, color, items }: { title: string; color: string; items: { a: string; b: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="pos-card" style={{ marginBottom: 12 }}>
      <div className="font-mono" style={{ fontSize: 10, color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{title}</div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", alignItems: "flex-start", borderTop: i > 0 ? "1px solid var(--rule-2)" : "none" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 6, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{it.a}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, marginTop: 2 }}>{it.b}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

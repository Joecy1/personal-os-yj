// Motivation Engine — simplified loop: catalyst → desire → action → reality → emotion. AI extracts structure.
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, EmptyState } from "@/components/Module";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/motivation")({ component: MotivationPage });

function MotivationPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);

  const { data: entries } = useQuery({
    queryKey: ["motivation-entries", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("motivation_entries").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });
  
  const save = useMutation({
    mutationFn: async (extraction: any) => {
      if (!user) return;
      await supabase.from("motivation_entries").insert({
        user_id: user.id,
        catalyst: extraction.catalyst,
        desire: extraction.desire,
        emotion: extraction.emotion,
        reality_check: extraction.reality_check,
        actions: extraction.actions,
        raw_text: text,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["motivation-entries"] });
      setText("");
      toast.success("Entry saved");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const createQuests = useMutation({
    mutationFn: async (actions: string[]) => {
      if (!user) return;
      const quests = actions.map((action) => ({
        user_id: user.id,
        title: action,
        type: "daily",
        xp_value: 50,
        campaign_id: null,
      }));
      await supabase.from("quests").insert(quests);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quests"] }); toast.success("Quests created from actions"); },
  });

  const analyze = async () => {
    if (text.trim().length < 4) { toast.error("Write a little more first"); return; }
    setExtracting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/motivation-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ rawText: text }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        if (r.status === 429) toast.error("Rate limited — wait a moment");
        else if (r.status === 402) toast.error("AI credits exhausted");
        else toast.error(err.error || "Extraction failed");
        return;
      }
      const { extraction } = await r.json();
      save.mutate(extraction);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <Module>
      <PageHeader title="Motivation engine" subtitle="Catalyst → Desire → Action → Reality → Emotion" />

      {/* Loop diagram */}
      <div style={{ background: "var(--cream-2)", borderRadius: 10, padding: "24px 20px", marginBottom: 24 }}>
        <LoopDiagram />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
          A catalyst sparks desire. Desire becomes action. Action meets reality. Reality stirs emotion — which loops back as the next catalyst.
        </div>
      </div>

      {/* Input */}
      <div className="pos-card" style={{ marginBottom: 24 }}>
        <div className="card-label">Speak your mind</div>
        <textarea
          className="pos-input"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Just dump what you're feeling, wanting, fearing. Be unfiltered. The AI will tease apart the catalyst, the desire underneath, and what to actually do."
          style={{ fontSize: 14, lineHeight: 1.6 }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)" }}>{text.length} / 4000</div>
          <button className="pos-btn primary" onClick={analyze} disabled={extracting || text.trim().length < 4}>
            {extracting ? "Analyzing…" : "Analyze →"}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="section-title" style={{ marginBottom: 12 }}>Recent captures</div>
      {(entries ?? []).length === 0 ? <EmptyState>No entries yet. Speak your mind above.</EmptyState> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries!.map((e) => (
            <div key={e.id} className="pos-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span className="tag tag-coral">{e.emotion || "—"}</span>
                <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>{new Date(e.created_at).toLocaleString()}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                <Cell label="Catalyst" value={e.catalyst} accent="var(--purple)" />
                <Cell label="Desire" value={e.desire} accent="var(--amber)" />
              </div>
              <Cell label="Reality check" value={e.reality_check} accent="var(--teal)" />
              {Array.isArray(e.actions) && (e.actions as string[]).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div className="card-label">Actions</div>
                    <button className="pos-btn secondary" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => createQuests.mutate(e.actions as string[])}>Create quests</button>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "var(--ink)" }}>
                    {(e.actions as string[]).map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
              {e.raw_text && (
                <details style={{ marginTop: 12 }}>
                  <summary style={{ fontSize: 11, color: "var(--ink-3)", cursor: "pointer", fontFamily: "var(--font-mono)" }}>Original text</summary>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6, fontStyle: "italic", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{e.raw_text}</div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </Module>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ borderLeft: `2px solid ${accent}`, paddingLeft: 10 }}>
      <div className="card-label" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{value || "—"}</div>
    </div>
  );
}

function LoopDiagram() {
  const nodes = [
    { id: "catalyst", label: "Catalyst", x: 100, y: 50, color: "var(--purple)" },
    { id: "desire", label: "Desire", x: 300, y: 50, color: "var(--amber)" },
    { id: "action", label: "Action", x: 400, y: 130, color: "var(--ink)" },
    { id: "reality", label: "Reality", x: 300, y: 210, color: "var(--teal)" },
    { id: "emotion", label: "Emotion", x: 100, y: 210, color: "var(--coral)" },
  ];
  const edges = [
    ["catalyst", "desire"], ["desire", "action"], ["action", "reality"], ["reality", "emotion"], ["emotion", "catalyst"],
  ];
  const map = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox="0 0 500 260" style={{ width: "100%", maxWidth: 600, height: "auto", display: "block", margin: "0 auto" }}>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-3)" />
        </marker>
      </defs>
      {edges.map(([a, b], i) => {
        const A = map.get(a)!; const B = map.get(b)!;
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len, off = 38;
        return <line key={i} x1={A.x + ux * off} y1={A.y + uy * off} x2={B.x - ux * off} y2={B.y - uy * off} stroke="var(--ink-3)" strokeWidth="1" markerEnd="url(#arr)" />;
      })}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={36} fill="#fff" stroke={n.color} strokeWidth={1.5} />
          <text x={n.x} y={n.y + 4} textAnchor="middle" fontFamily="DM Sans, sans-serif" fontSize={12} fontWeight={500} fill={n.color}>{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

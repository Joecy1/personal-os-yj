import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePlayerStats } from "@/lib/queries";
import { levelTitle } from "@/lib/date";
import { Module, PageHeader } from "@/components/Module";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/stats")({ component: StatsPage });

const CAPITALS: { key: string; label: string; sub: string; color: string }[] = [
  { key: "capital_human", label: "Human capital", sub: "Skills · knowledge", color: "amber" },
  { key: "capital_health", label: "Health capital", sub: "Body · energy", color: "teal" },
  { key: "capital_financial", label: "Financial capital", sub: "Savings · cashflow", color: "coral" },
  { key: "capital_social", label: "Social capital", sub: "Network · trust", color: "purple" },
  { key: "capital_symbolic", label: "Symbolic capital", sub: "Reputation · influence", color: "amber" },
  { key: "capital_psychological", label: "Psychological", sub: "Resilience · clarity", color: "teal" },
  { key: "capital_time_autonomy", label: "Time autonomy", sub: "Control · flexibility", color: "purple" },
];

function StatsPage() {
  const { user } = useAuth();
  const { data: stats } = usePlayerStats();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: async (patch: any) => { await supabase.from("player_stats").update(patch).eq("user_id", user!.id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["player-stats"] }); setEditing(null); toast.success("Updated"); },
  });

  if (!stats) return <Module><PageHeader title="Stats" /></Module>;

  return (
    <Module>
      <PageHeader title="Stats" subtitle="Seven-capital model — current allocation and flow" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 24 }}>
        <div className="pos-card">
          <div className="card-label">Level</div>
          <div className="font-serif" style={{ fontSize: 32, fontWeight: 700 }}>{stats.level}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{levelTitle(stats.level)}</div>
        </div>
        <div className="pos-card">
          <div className="card-label">XP total</div>
          <div className="font-serif" style={{ fontSize: 32, fontWeight: 700 }}>{stats.xp_total}</div>
          <div className="progress-bar" style={{ marginTop: 8 }}><div className="progress-fill amber" style={{ width: `${((stats.xp_total % 500) / 500) * 100}%` }} /></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {CAPITALS.map((c) => {
          const v = (stats as any)[c.key] as number;
          return (
            <div key={c.key} className="pos-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-label" style={{ marginBottom: 0 }}>{c.label}</div>
                <button onClick={() => setEditing(c.key)} className="font-mono" style={{ background: "none", border: "none", color: "var(--ink-4)", fontSize: 10, cursor: "pointer" }}>edit</button>
              </div>
              {editing === c.key ? (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input type="number" min={0} max={100} className="pos-input" defaultValue={v} id={`inp-${c.key}`} />
                  <button className="pos-btn primary" onClick={() => { const el = document.getElementById(`inp-${c.key}`) as HTMLInputElement; update.mutate({ [c.key]: Number(el.value) }); }}>OK</button>
                </div>
              ) : (
                <>
                  <div className="font-serif" style={{ fontSize: 26, fontWeight: 700, marginTop: 8 }}>{v}</div>
                  <div className="progress-bar" style={{ marginTop: 8 }}><div className={`progress-fill ${c.color}`} style={{ width: `${v}%` }} /></div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>{c.sub}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Module>
  );
}

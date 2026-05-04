import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, EmptyState } from "@/components/Module";
import { FrameworkChips } from "@/components/FrameworkPicker";
import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/lib/campaign-templates";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/campaigns")({ component: CampaignsPage });

type Milestone = { id: string; title: string; complete: boolean; xp?: number; capital?: CapitalKey | ""; capital_amount?: number };
type CapitalKey = "human" | "social" | "financial" | "health" | "symbolic" | "psychological" | "time_autonomy";
const CAPITAL_KEYS: CapitalKey[] = ["human", "health", "financial", "social", "symbolic", "psychological", "time_autonomy"];
const CAPITAL_LABEL: Record<CapitalKey, string> = {
  human: "Human", health: "Health", financial: "Financial", social: "Social", symbolic: "Symbolic", psychological: "Psychological", time_autonomy: "Time autonomy",
};

function CampaignsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns-all", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("campaigns").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (payload: any) => {
      await supabase.from("campaigns").insert({ user_id: user!.id, ...payload, status: "active" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns-all"] }); qc.invalidateQueries({ queryKey: ["campaigns"] }); qc.invalidateQueries({ queryKey: ["sidebar-badges"] }); toast.success("Campaign created"); setShowNew(false); setShowTemplates(false); },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      await supabase.from("campaigns").update(patch).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns-all"] }),
  });

  const grantXpAndCapital = async (xp: number, capital?: CapitalKey | "", amount?: number) => {
    if (!user) return;
    const { data: stats } = await supabase.from("player_stats").select("*").eq("user_id", user.id).single();
    if (!stats) return;
    const newXp = Math.max(0, stats.xp_total + xp);
    const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);
    const patch: any = { xp_total: newXp, level: newLevel };
    if (capital && amount) {
      const col = `capital_${capital}` as const;
      patch[col] = Math.max(0, Math.min(100, ((stats as any)[col] ?? 50) + amount));
    }
    await supabase.from("player_stats").update(patch).eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["player-stats"] });
  };

  const toggleMilestone = useMutation({
    mutationFn: async ({ campaign, idx }: { campaign: any; idx: number }) => {
      const ms = [...((campaign.milestones as Milestone[]) ?? [])];
      const m = ms[idx];
      const becoming = !m.complete;
      ms[idx] = { ...m, complete: becoming };
      await supabase.from("campaigns").update({ milestones: ms }).eq("id", campaign.id);
      if (becoming) {
        await grantXpAndCapital(m.xp ?? 25, m.capital, m.capital_amount ?? 0);
        toast.success(`+${m.xp ?? 25} XP${m.capital && m.capital_amount ? ` · +${m.capital_amount} ${CAPITAL_LABEL[m.capital as CapitalKey]}` : ""}`);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns-all"] }),
  });

  const completeCampaign = useMutation({
    mutationFn: async (c: any) => {
      await supabase.from("campaigns").update({ status: "complete", completed_at: new Date().toISOString() }).eq("id", c.id);
      const targets = (c.capital_targets ?? {}) as Record<string, number>;
      // Apply each capital target on completion + overall XP
      const { data: stats } = await supabase.from("player_stats").select("*").eq("user_id", user!.id).single();
      if (stats) {
        const patch: any = {};
        const newXp = stats.xp_total + (c.xp_value ?? 200);
        patch.xp_total = newXp;
        patch.level = Math.max(1, Math.floor(newXp / 500) + 1);
        for (const k of CAPITAL_KEYS) {
          const amt = Number(targets[k] ?? 0);
          if (amt) {
            const col = `capital_${k}` as const;
            patch[col] = Math.max(0, Math.min(100, ((stats as any)[col] ?? 50) + amt));
          }
        }
        await supabase.from("player_stats").update(patch).eq("user_id", user!.id);
      }
      toast.success(`Campaign complete · +${c.xp_value ?? 200} XP`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns-all"] }); qc.invalidateQueries({ queryKey: ["player-stats"] }); qc.invalidateQueries({ queryKey: ["sidebar-badges"] }); },
  });

  const updateFrameworks = useMutation({
    mutationFn: async ({ id, slugs }: { id: string; slugs: string[] }) => {
      await supabase.from("campaigns").update({ frameworks_used: slugs }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns-all"] }),
  });

  const createFromTemplate = (t: CampaignTemplate) => {
    create.mutate({
      title: t.title,
      win_condition: t.win_condition,
      milestones: t.milestones.map((m) => ({ ...m, id: crypto.randomUUID(), xp: 25 })),
      tags: t.tags,
      frameworks_used: t.framework_slugs,
      xp_value: 200,
    });
  };

  return (
    <Module>
      <PageHeader title="Campaigns" subtitle="Long-horizon goals · milestones earn XP and grow capitals" actions={
        <>
          <button className="pos-btn" onClick={() => { setShowTemplates((v) => !v); setShowNew(false); }}>+ From template</button>
          <button className="pos-btn primary" onClick={() => { setShowNew(true); setShowTemplates(false); }}>+ New campaign</button>
        </>
      } />

      {showTemplates && (
        <div className="pos-card" style={{ marginBottom: 24 }}>
          <div className="card-label">Pick a template</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            {CAMPAIGN_TEMPLATES.map((t) => (
              <div key={t.key} style={{ padding: 14, background: "#fff", border: "1px solid var(--rule)", borderRadius: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>{t.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>{t.blurb}</div>
                <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
                  {t.milestones.length} milestones · {t.tags.join(" · ")}
                </div>
                <button className="pos-btn primary" onClick={() => createFromTemplate(t)}>Use template</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && <CampaignForm onCancel={() => setShowNew(false)} onSave={(p) => create.mutate(p)} />}

      {(campaigns ?? []).length === 0 && !showNew ? (
        <EmptyState>No campaigns yet — start your first.</EmptyState>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {(campaigns ?? []).map((c, i) => {
            const ms = (c.milestones as Milestone[]) ?? [];
            const done = ms.filter((m) => m.complete).length;
            const pct = ms.length ? Math.round((done / ms.length) * 100) : 0;
            const targets = (c.capital_targets ?? {}) as Record<string, number>;
            const isEditing = editingId === c.id;
            if (isEditing) {
              return (
                <div key={c.id} style={{ gridColumn: "span 2" }}>
                  <CampaignForm
                    initial={c}
                    onCancel={() => setEditingId(null)}
                    onSave={(p) => { updateCampaign.mutate({ id: c.id, patch: p }); setEditingId(null); toast.success("Saved"); }}
                  />
                </div>
              );
            }
            return (
              <div key={c.id} className="pos-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div className="card-label">Campaign · {c.xp_value ?? 200} XP on completion</div>
                    <div className="card-title">{c.title}</div>
                    {c.win_condition && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{c.win_condition}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <span className={`tag ${c.status === "active" ? (i % 2 === 0 ? "tag-amber" : "tag-teal") : c.status === "complete" ? "tag-green" : "tag-gray"}`}>{c.status}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="pos-btn" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => setEditingId(c.id)}>Edit</button>
                      {c.status === "active" && <button className="pos-btn primary" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => completeCampaign.mutate(c)}>Complete</button>}
                    </div>
                  </div>
                </div>
                {Object.keys(targets).length > 0 && (
                  <div style={{ marginBottom: 12, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {Object.entries(targets).filter(([, v]) => Number(v)).map(([k, v]) => (
                      <span key={k} className="tag tag-teal">+{v} {CAPITAL_LABEL[k as CapitalKey]}</span>
                    ))}
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "var(--ink-3)" }}>
                    <span>{done} of {ms.length} milestones</span>
                    <span className="font-mono" style={{ fontSize: 11 }}>{pct}%</span>
                  </div>
                  <div className="progress-bar"><div className={`progress-fill ${i % 2 === 0 ? "amber" : "teal"}`} style={{ width: `${pct}%` }} /></div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ms.map((m, idx) => (
                    <div key={m.id} onClick={() => toggleMilestone.mutate({ campaign: c, idx })} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, cursor: "pointer" }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, border: "1px solid var(--ink-4)", background: m.complete ? "var(--teal)" : "transparent", flexShrink: 0 }} />
                      <span style={{ flex: 1, color: m.complete ? "var(--ink-3)" : "var(--ink)", textDecoration: m.complete ? "line-through" : "none" }}>{m.title}</span>
                      <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>+{m.xp ?? 25}xp{m.capital && m.capital_amount ? ` · +${m.capital_amount} ${CAPITAL_LABEL[m.capital as CapitalKey].slice(0, 3)}` : ""}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--rule)" }}>
                  <div className="card-label" style={{ marginBottom: 8 }}>Frameworks to apply</div>
                  <FrameworkChips
                    selectedSlugs={(c.frameworks_used as string[] | null) ?? []}
                    onChange={(slugs) => updateFrameworks.mutate({ id: c.id, slugs })}
                    emptyHint="No frameworks unlocked yet."
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Module>
  );
}

function CampaignForm({ onSave, onCancel, initial }: { onSave: (p: any) => void; onCancel: () => void; initial?: any }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [winCondition, setWin] = useState(initial?.win_condition ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [xpValue, setXpValue] = useState<number>(initial?.xp_value ?? 200);
  const [milestones, setMilestones] = useState<Milestone[]>(
    (initial?.milestones as Milestone[]) ?? [{ id: crypto.randomUUID(), title: "", complete: false, xp: 25, capital: "", capital_amount: 0 }]
  );
  const [targets, setTargets] = useState<Record<string, number>>((initial?.capital_targets ?? {}) as Record<string, number>);

  const submit = () => {
    onSave({
      title,
      win_condition: winCondition,
      milestones: milestones.filter((m) => m.title.trim()).map((m) => ({ ...m, xp: Number(m.xp ?? 25), capital_amount: Number(m.capital_amount ?? 0) })),
      tags: tags.split(",").map((t: string) => t.trim()).filter(Boolean),
      xp_value: xpValue,
      capital_targets: Object.fromEntries(Object.entries(targets).filter(([, v]) => Number(v))),
    });
  };

  return (
    <div className="pos-card" style={{ marginBottom: 24 }}>
      <div className="card-label">{initial ? "Edit campaign" : "New campaign"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
        <div>
          <label className="pos-label">Title</label>
          <input className="pos-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="pos-label">XP on complete</label>
          <input className="pos-input" type="number" value={xpValue} onChange={(e) => setXpValue(Number(e.target.value))} />
        </div>
      </div>
      <label className="pos-label" style={{ marginTop: 12 }}>Win condition</label>
      <textarea className="pos-input" rows={2} value={winCondition} onChange={(e) => setWin(e.target.value)} />
      <label className="pos-label" style={{ marginTop: 12 }}>Tags (comma separated)</label>
      <input className="pos-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. sales, content" />

      <label className="pos-label" style={{ marginTop: 12 }}>Capital boosts on completion (0–25 each)</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {CAPITAL_KEYS.map((k) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--ink-3)", flex: 1 }}>{CAPITAL_LABEL[k]}</span>
            <input className="pos-input" type="number" min={0} max={25} value={targets[k] ?? 0} onChange={(e) => setTargets({ ...targets, [k]: Number(e.target.value) })} style={{ width: 60 }} />
          </div>
        ))}
      </div>

      <label className="pos-label" style={{ marginTop: 16 }}>Milestones</label>
      {milestones.map((m, i) => (
        <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 70px 110px 70px 32px", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <input className="pos-input" value={m.title} onChange={(e) => { const c = [...milestones]; c[i] = { ...c[i], title: e.target.value }; setMilestones(c); }} placeholder={`Milestone ${i + 1}`} />
          <input className="pos-input" type="number" value={m.xp ?? 25} onChange={(e) => { const c = [...milestones]; c[i] = { ...c[i], xp: Number(e.target.value) }; setMilestones(c); }} placeholder="xp" />
          <select className="pos-input" value={m.capital ?? ""} onChange={(e) => { const c = [...milestones]; c[i] = { ...c[i], capital: e.target.value as any }; setMilestones(c); }}>
            <option value="">— capital —</option>
            {CAPITAL_KEYS.map((k) => <option key={k} value={k}>{CAPITAL_LABEL[k]}</option>)}
          </select>
          <input className="pos-input" type="number" value={m.capital_amount ?? 0} onChange={(e) => { const c = [...milestones]; c[i] = { ...c[i], capital_amount: Number(e.target.value) }; setMilestones(c); }} placeholder="±" />
          <button className="pos-btn" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button className="add-btn" onClick={() => setMilestones([...milestones, { id: crypto.randomUUID(), title: "", complete: false, xp: 25, capital: "", capital_amount: 0 }])}>+ Add milestone</button>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="pos-btn primary" onClick={submit}>{initial ? "Save changes" : "Create"}</button>
        <button className="pos-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

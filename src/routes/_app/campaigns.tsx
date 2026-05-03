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

type Milestone = { id: string; title: string; complete: boolean };

function CampaignsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns-all", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("campaigns").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (payload: { title: string; win_condition: string; milestones: Milestone[]; tags: string[]; frameworks_used?: string[] }) => {
      await supabase.from("campaigns").insert({ user_id: user!.id, ...payload, status: "active" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns-all"] }); qc.invalidateQueries({ queryKey: ["campaigns"] }); qc.invalidateQueries({ queryKey: ["sidebar-badges"] }); toast.success("Campaign created"); setShowNew(false); setShowTemplates(false); },
  });

  const createFromTemplate = (t: CampaignTemplate) => {
    create.mutate({
      title: t.title,
      win_condition: t.win_condition,
      milestones: t.milestones.map((m) => ({ ...m, id: crypto.randomUUID() })),
      tags: t.tags,
      frameworks_used: t.framework_slugs,
    });
  };

  const toggleMilestone = useMutation({
    mutationFn: async ({ campaign, idx }: { campaign: any; idx: number }) => {
      const ms = [...(campaign.milestones as Milestone[])];
      ms[idx] = { ...ms[idx], complete: !ms[idx].complete };
      await supabase.from("campaigns").update({ milestones: ms }).eq("id", campaign.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns-all"] }),
  });

  const updateFrameworks = useMutation({
    mutationFn: async ({ id, slugs }: { id: string; slugs: string[] }) => {
      await supabase.from("campaigns").update({ frameworks_used: slugs }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns-all"] }),
  });

  return (
    <Module>
      <PageHeader title="Campaigns" subtitle="Long-horizon goals with milestones and win conditions" actions={
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

      {showNew && <NewCampaignForm onCancel={() => setShowNew(false)} onSave={(p) => create.mutate(p)} />}

      {(campaigns ?? []).length === 0 && !showNew ? (
        <EmptyState>No campaigns yet — start your first.</EmptyState>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {(campaigns ?? []).map((c, i) => {
            const ms = (c.milestones as Milestone[]) ?? [];
            const done = ms.filter((m) => m.complete).length;
            const pct = ms.length ? Math.round((done / ms.length) * 100) : 0;
            return (
              <div key={c.id} className="pos-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div className="card-label">Campaign</div>
                    <div className="card-title">{c.title}</div>
                    {c.win_condition && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{c.win_condition}</div>}
                  </div>
                  <span className={`tag ${c.status === "active" ? (i % 2 === 0 ? "tag-amber" : "tag-teal") : c.status === "complete" ? "tag-green" : "tag-gray"}`}>{c.status}</span>
                </div>
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
                      <span style={{ color: m.complete ? "var(--ink-3)" : "var(--ink)", textDecoration: m.complete ? "line-through" : "none" }}>{m.title}</span>
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

function NewCampaignForm({ onSave, onCancel }: { onSave: (p: { title: string; win_condition: string; milestones: Milestone[]; tags: string[] }) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [winCondition, setWin] = useState("");
  const [tags, setTags] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([{ id: crypto.randomUUID(), title: "", complete: false }]);
  return (
    <div className="pos-card" style={{ marginBottom: 24 }}>
      <div className="card-label">New campaign</div>
      <label className="pos-label">Title</label>
      <input className="pos-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="pos-label" style={{ marginTop: 12 }}>Win condition</label>
      <textarea className="pos-input" rows={2} value={winCondition} onChange={(e) => setWin(e.target.value)} />
      <label className="pos-label" style={{ marginTop: 12 }}>Tags (comma separated)</label>
      <input className="pos-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. sales, content" />
      <label className="pos-label" style={{ marginTop: 12 }}>Milestones</label>
      {milestones.map((m, i) => (
        <div key={m.id} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input className="pos-input" value={m.title} onChange={(e) => { const c = [...milestones]; c[i] = { ...c[i], title: e.target.value }; setMilestones(c); }} placeholder={`Milestone ${i + 1}`} />
          <button className="pos-btn" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button className="add-btn" onClick={() => setMilestones([...milestones, { id: crypto.randomUUID(), title: "", complete: false }])}>+ Add milestone</button>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="pos-btn primary" onClick={() => onSave({ title, win_condition: winCondition, milestones: milestones.filter((m) => m.title.trim()), tags: tags.split(",").map((t) => t.trim()).filter(Boolean) })}>Create</button>
        <button className="pos-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

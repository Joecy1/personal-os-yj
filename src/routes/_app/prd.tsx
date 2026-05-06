import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, SectionHeader, EmptyState } from "@/components/Module";
import { MODULES, PRD_TEMPLATE_HINTS } from "@/lib/modules";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/prd")({ component: PRDPage });

type PRD = {
  id: string;
  scope: string;
  module_key: string;
  title: string;
  problem: string;
  users: string;
  principles: string;
  features: any;
  success_metrics: string;
  non_goals: string;
  status: string;
  notes: string;
};

const STATUSES = ["draft", "active", "stable", "archived"] as const;
const STATUS_COLOR: Record<string, string> = { draft: "var(--ink-4)", active: "var(--amber)", stable: "var(--green)", archived: "var(--ink-3)" };

function PRDPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: prds = [] } = useQuery({
    queryKey: ["prds", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("prd_documents").select("*").order("scope").order("created_at")).data as PRD[] ?? [],
  });

  const global = prds.find((p) => p.scope === "global");
  const modules = prds.filter((p) => p.scope === "module");

  const createGlobal = useMutation({
    mutationFn: async () => {
      await supabase.from("prd_documents").insert({
        user_id: user!.id, scope: "global", module_key: "", title: "Personal OS — Vision",
        status: "active",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prds"] }),
  });

  const [newKey, setNewKey] = useState("");
  const createModule = useMutation({
    mutationFn: async () => {
      const mod = MODULES.find((m) => m.key === newKey);
      if (!mod) return;
      const { data } = await supabase.from("prd_documents").insert({
        user_id: user!.id, scope: "module", module_key: mod.key, title: mod.label, status: "draft",
      }).select("*").single();
      if (data) setActiveId(data.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prds"] }); setNewKey(""); toast.success("PRD created"); },
  });

  const active = useMemo(() => prds.find((p) => p.id === activeId) ?? null, [prds, activeId]);

  return (
    <Module>
      <PageHeader title="Product requirement docs" subtitle="A hybrid PRD: one global vision, one mini-PRD per module" />

      {/* Global */}
      <SectionHeader title="Global vision" link={!global ? <button className="pos-btn" onClick={() => createGlobal.mutate()}>+ Create global PRD</button> : undefined} />
      {!global ? <EmptyState>No global PRD yet.</EmptyState> : (
        <PRDCard prd={global} onOpen={() => setActiveId(global.id)} />
      )}

      {/* Modules */}
      <div style={{ marginTop: 32 }}>
        <SectionHeader
          title="Module PRDs"
          link={
            <div style={{ display: "flex", gap: 6 }}>
              <select className="pos-input" style={{ padding: "6px 10px", fontSize: 12 }} value={newKey} onChange={(e) => setNewKey(e.target.value)}>
                <option value="">— pick module —</option>
                {MODULES.filter((m) => !modules.some((p) => p.module_key === m.key)).map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
              <button className="pos-btn primary" disabled={!newKey} onClick={() => createModule.mutate()}>+ Add</button>
            </div>
          }
        />
        {modules.length === 0 ? <EmptyState>No module PRDs yet.</EmptyState> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {modules.map((p) => <PRDCard key={p.id} prd={p} onOpen={() => setActiveId(p.id)} />)}
          </div>
        )}
      </div>

      {active && <PRDEditor prd={active} onClose={() => setActiveId(null)} />}
    </Module>
  );
}

function PRDCard({ prd, onOpen }: { prd: PRD; onOpen: () => void }) {
  const mod = MODULES.find((m) => m.key === prd.module_key);
  const featureCount = Array.isArray(prd.features) ? prd.features.length : 0;
  return (
    <button onClick={onOpen} style={{ textAlign: "left", padding: 16, background: "#fff", border: "1px solid var(--rule)", borderRadius: 8, cursor: "pointer", display: "block", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[prd.status] }} />
        <span className="font-mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          {prd.scope === "global" ? "global" : mod?.label ?? prd.module_key} · {prd.status}
        </span>
      </div>
      <div className="font-serif" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{prd.title || "Untitled"}</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{featureCount} features · {prd.problem ? "problem set" : "no problem yet"}</div>
    </button>
  );
}

function PRDEditor({ prd, onClose }: { prd: PRD; onClose: () => void }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<PRD>(prd);
  const features = Array.isArray(draft.features) ? (draft.features as { id: string; title: string; done: boolean }[]) : [];

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from("prd_documents").update({
        title: draft.title, problem: draft.problem, users: draft.users, principles: draft.principles,
        features: features as any, success_metrics: draft.success_metrics, non_goals: draft.non_goals,
        status: draft.status, notes: draft.notes,
      }).eq("id", prd.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prds"] }); toast.success("Saved"); onClose(); },
  });

  const del = useMutation({
    mutationFn: async () => { await supabase.from("prd_documents").delete().eq("id", prd.id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prds"] }); onClose(); toast.success("Deleted"); },
  });

  const addFeature = () => setDraft({ ...draft, features: [...features, { id: crypto.randomUUID(), title: "", done: false }] });
  const updFeature = (i: number, patch: Partial<{ title: string; done: boolean }>) => {
    const next = [...features]; next[i] = { ...next[i], ...patch };
    setDraft({ ...draft, features: next });
  };
  const rmFeature = (i: number) => setDraft({ ...draft, features: features.filter((_, j) => j !== i) });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 60, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 20px", overflowY: "auto" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--cream)", borderRadius: 10, width: "100%", maxWidth: 760, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <input className="pos-input" style={{ fontSize: 18, fontWeight: 600, fontFamily: "var(--font-serif)", border: "none", padding: 0 }} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <div style={{ display: "flex", gap: 4 }}>
            {STATUSES.map((s) => (
              <button key={s} className="opt-pill" onClick={() => setDraft({ ...draft, status: s })} style={draft.status === s ? { background: STATUS_COLOR[s], borderColor: STATUS_COLOR[s], color: "#fff" } : {}}>{s}</button>
            ))}
          </div>
        </div>

        <Field label="Problem" hint={PRD_TEMPLATE_HINTS.problem} value={draft.problem} onChange={(v) => setDraft({ ...draft, problem: v })} rows={3} />
        <Field label="Users & moments" hint={PRD_TEMPLATE_HINTS.users} value={draft.users} onChange={(v) => setDraft({ ...draft, users: v })} rows={3} />
        <Field label="Principles" hint={PRD_TEMPLATE_HINTS.principles} value={draft.principles} onChange={(v) => setDraft({ ...draft, principles: v })} rows={3} />

        <label className="pos-label" style={{ marginTop: 16 }}>Features</label>
        <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", marginBottom: 8, letterSpacing: "0.04em" }}>{PRD_TEMPLATE_HINTS.features}</div>
        {features.map((f, i) => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input type="checkbox" checked={f.done} onChange={(e) => updFeature(i, { done: e.target.checked })} />
            <input className="pos-input" style={{ flex: 1 }} value={f.title} onChange={(e) => updFeature(i, { title: e.target.value })} placeholder="Capability that ships" />
            <button onClick={() => rmFeature(i)} style={{ background: "none", border: "none", color: "var(--ink-4)", cursor: "pointer" }}>×</button>
          </div>
        ))}
        <button className="pos-btn" onClick={addFeature}>+ Feature</button>

        <Field label="Success metrics" hint={PRD_TEMPLATE_HINTS.success_metrics} value={draft.success_metrics} onChange={(v) => setDraft({ ...draft, success_metrics: v })} rows={2} />
        <Field label="Non-goals" hint={PRD_TEMPLATE_HINTS.non_goals} value={draft.non_goals} onChange={(v) => setDraft({ ...draft, non_goals: v })} rows={2} />
        <Field label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} rows={2} />

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "space-between" }}>
          <button className="pos-btn" style={{ color: "var(--coral)" }} onClick={() => del.mutate()}>Delete</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="pos-btn" onClick={onClose}>Cancel</button>
            <button className="pos-btn primary" onClick={() => save.mutate()}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, value, onChange, rows = 2 }: { label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div style={{ marginTop: 16 }}>
      <label className="pos-label">{label}</label>
      {hint && <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", marginBottom: 4, letterSpacing: "0.04em" }}>{hint}</div>}
      <textarea className="pos-input" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, EmptyState } from "@/components/Module";
import { MODULES } from "@/lib/modules";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/feedback")({ component: FeedbackPage });

const KIND_COLORS: Record<string, string> = {
  broken: "var(--coral)", works: "var(--green)", idea: "var(--amber)", question: "var(--purple)",
};
const STATUSES = ["open", "triaged", "resolved", "wont_fix"] as const;
const KINDS = ["all", "broken", "works", "idea", "question"] as const;

function FeedbackPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterModule, setFilterModule] = useState<string>("all");

  const [showNew, setShowNew] = useState(false);
  const [nm, setNm] = useState({ module_key: "", kind: "broken", severity: "normal", title: "", body: "" });

  const { data: items = [] } = useQuery({
    queryKey: ["feedback", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("feedback_items").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const mod = MODULES.find((m) => m.key === nm.module_key);
      await supabase.from("feedback_items").insert({
        user_id: user!.id,
        module_key: nm.module_key, route: mod?.route ?? "",
        kind: nm.kind, severity: nm.severity, title: nm.title, body: nm.body, status: "open",
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feedback"] }); setShowNew(false); setNm({ module_key: "", kind: "broken", severity: "normal", title: "", body: "" }); toast.success("Logged"); },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from("feedback_items").update({ status }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("feedback_items").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback"] }),
  });

  const filtered = items.filter((i) =>
    (filterStatus === "all" || i.status === filterStatus) &&
    (filterKind === "all" || i.kind === filterKind) &&
    (filterModule === "all" || i.module_key === filterModule)
  );

  const counts = {
    open: items.filter((i) => i.status === "open").length,
    triaged: items.filter((i) => i.status === "triaged").length,
    resolved: items.filter((i) => i.status === "resolved").length,
    wont_fix: items.filter((i) => i.status === "wont_fix").length,
  };

  return (
    <Module>
      <PageHeader title="Feedback" subtitle="What works · what's broken · what to close — captured per page, triaged here" actions={<button className="pos-btn primary" onClick={() => setShowNew(true)}>+ New entry</button>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
        {(STATUSES).map((s) => (
          <div key={s} className="pos-card" style={{ padding: "12px 14px" }}>
            <div className="font-mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-4)" }}>{s.replace("_", " ")}</div>
            <div className="font-serif" style={{ fontSize: 22, fontWeight: 600 }}>{counts[s]}</div>
          </div>
        ))}
      </div>

      {showNew && (
        <div className="pos-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="pos-label">Module</label>
              <select className="pos-input" value={nm.module_key} onChange={(e) => setNm({ ...nm, module_key: e.target.value })}>
                <option value="">— select —</option>
                {MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="pos-label">Kind</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {["broken", "works", "idea", "question"].map((k) => (
                  <button key={k} className="opt-pill" onClick={() => setNm({ ...nm, kind: k })} style={nm.kind === k ? { background: KIND_COLORS[k], borderColor: KIND_COLORS[k], color: "#fff" } : {}}>{k}</button>
                ))}
              </div>
            </div>
          </div>
          <label className="pos-label" style={{ marginTop: 12 }}>Title</label>
          <input className="pos-input" value={nm.title} onChange={(e) => setNm({ ...nm, title: e.target.value })} />
          <label className="pos-label" style={{ marginTop: 12 }}>Body</label>
          <textarea className="pos-input" rows={3} value={nm.body} onChange={(e) => setNm({ ...nm, body: e.target.value })} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="pos-btn primary" disabled={!nm.title || !nm.module_key} onClick={() => create.mutate()}>Save</button>
            <button className="pos-btn" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <FilterRow label="Status" value={filterStatus} setValue={setFilterStatus} options={["all", ...STATUSES]} />
        <FilterRow label="Kind" value={filterKind} setValue={setFilterKind} options={[...KINDS]} />
        <div>
          <div className="pos-label" style={{ marginBottom: 4 }}>Module</div>
          <select className="pos-input" style={{ width: 200 }} value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
            <option value="all">All</option>
            {MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No feedback in this view.</EmptyState>
      ) : filtered.map((it) => {
        const mod = MODULES.find((m) => m.key === it.module_key);
        return (
          <div key={it.id} style={{ padding: 16, background: "#fff", border: "1px solid var(--rule)", borderRadius: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: KIND_COLORS[it.kind] ?? "var(--ink-4)" }} />
              <span className="font-mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                {it.kind} · {mod?.label ?? it.route ?? "—"} · {it.severity}
              </span>
              <div style={{ flex: 1 }} />
              <select className="pos-input" style={{ width: 120, padding: "4px 8px", fontSize: 11 }} value={it.status} onChange={(e) => setStatus.mutate({ id: it.id, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
              <button onClick={() => del.mutate(it.id)} style={{ background: "none", border: "none", color: "var(--ink-4)", cursor: "pointer", fontSize: 14 }}>×</button>
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{it.title}</div>
            {it.body && <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{it.body}</div>}
          </div>
        );
      })}
    </Module>
  );
}

function FilterRow({ label, value, setValue, options }: { label: string; value: string; setValue: (v: string) => void; options: readonly string[] }) {
  return (
    <div>
      <div className="pos-label" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {options.map((o) => (
          <button key={o} className="opt-pill" onClick={() => setValue(o)} style={value === o ? { background: "var(--cream-2)", borderColor: "var(--ink-4)", color: "var(--ink)" } : {}}>{o.replace("_", " ")}</button>
        ))}
      </div>
    </div>
  );
}

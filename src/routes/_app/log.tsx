import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, EmptyState } from "@/components/Module";
import { shortDate } from "@/lib/date";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/log")({ component: LogPage });

const TYPES = ["insight", "pattern", "rule", "decision"] as const;
const TAG: Record<string, string> = { insight: "tag-amber", pattern: "tag-coral", rule: "tag-gray", decision: "tag-purple" };

function LogPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | typeof TYPES[number]>("all");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [type, setType] = useState<typeof TYPES[number]>("insight");

  const { data: entries } = useQuery({
    queryKey: ["log", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("design_log_entries").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => { await supabase.from("design_log_entries").insert({ user_id: user!.id, title, body, type }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["log"] }); setTitle(""); setBody(""); setShowForm(false); toast.success("Logged"); },
  });

  const filtered = filter === "all" ? entries ?? [] : (entries ?? []).filter((e) => e.type === filter);

  return (
    <Module>
      <PageHeader title="Design log" subtitle="Decisions, patterns, lessons — what you notice about how you operate" actions={<button className="pos-btn primary" onClick={() => setShowForm(true)}>+ New entry</button>} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <button className="opt-pill" style={filter === "all" ? { background: "var(--ink)", color: "var(--cream)", borderColor: "var(--ink)" } : {}} onClick={() => setFilter("all")}>All</button>
        {TYPES.map((t) => <button key={t} className="opt-pill" style={filter === t ? { background: "var(--ink)", color: "var(--cream)", borderColor: "var(--ink)" } : {}} onClick={() => setFilter(t)}>{t}</button>)}
      </div>

      {showForm && (
        <div className="pos-card" style={{ marginBottom: 24 }}>
          <label className="pos-label">Title</label>
          <input className="pos-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="pos-label" style={{ marginTop: 12 }}>Body</label>
          <textarea className="pos-input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          <label className="pos-label" style={{ marginTop: 12 }}>Type</label>
          <div style={{ display: "flex", gap: 6 }}>{TYPES.map((t) => <button key={t} className="opt-pill" style={type === t ? { background: "var(--cream-2)", borderColor: "var(--ink-4)", color: "var(--ink)" } : {}} onClick={() => setType(t)}>{t}</button>)}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="pos-btn primary" onClick={() => create.mutate()}>Save</button>
            <button className="pos-btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? <EmptyState>Nothing logged yet.</EmptyState> : filtered.map((e) => (
        <div key={e.id} style={{ display: "flex", gap: 20, padding: "16px 0", borderBottom: "1px solid var(--rule)" }}>
          <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", width: 64, flexShrink: 0, paddingTop: 2, letterSpacing: "0.04em" }}>{shortDate(e.created_at)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{e.title}</div>
            {e.body && <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>{e.body}</div>}
          </div>
          <span className={`tag ${TAG[e.type]}`}>{e.type}</span>
        </div>
      ))}
    </Module>
  );
}

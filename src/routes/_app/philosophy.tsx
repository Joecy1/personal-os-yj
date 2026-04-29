import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, SectionHeader, EmptyState } from "@/components/Module";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/philosophy")({ component: PhilosophyPage });

const TAG: Record<string, string> = { hard: "tag-coral", principle: "tag-amber", worldview: "tag-purple" };

function PhilosophyPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [content, setContent] = useState(""); const [type, setType] = useState<"hard" | "principle" | "worldview">("hard");

  const { data: entries } = useQuery({
    queryKey: ["philosophy", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("philosophy_entries").select("*").order("index")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const sameType = (entries ?? []).filter((e) => e.type === type);
      const prefix = type === "worldview" ? "W" : "";
      const idx = `${prefix}${String(sameType.length + 1).padStart(prefix ? 1 : 2, "0")}`;
      await supabase.from("philosophy_entries").insert({ user_id: user!.id, content, type, index: idx });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["philosophy"] }); setContent(""); setShow(false); toast.success("Added"); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("philosophy_entries").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["philosophy"] }); toast.success("Removed"); },
  });

  const rules = (entries ?? []).filter((e) => e.type !== "worldview");
  const worldview = (entries ?? []).filter((e) => e.type === "worldview");

  return (
    <Module>
      <PageHeader title="Philosophy" subtitle="Worldview · principles · hard rules — the operating system beneath the OS" actions={<button className="pos-btn primary" onClick={() => setShow(true)}>+ Add entry</button>} />

      {show && (
        <div className="pos-card" style={{ marginBottom: 24 }}>
          <label className="pos-label">Content</label>
          <textarea className="pos-input" rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
          <label className="pos-label" style={{ marginTop: 12 }}>Type</label>
          <div style={{ display: "flex", gap: 6 }}>{(["hard", "principle", "worldview"] as const).map((t) => <button key={t} className="opt-pill" style={type === t ? { background: "var(--cream-2)", borderColor: "var(--ink-4)", color: "var(--ink)" } : {}} onClick={() => setType(t)}>{t}</button>)}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="pos-btn primary" onClick={() => create.mutate()}>Save</button>
            <button className="pos-btn" onClick={() => setShow(false)}>Cancel</button>
          </div>
        </div>
      )}

      <SectionHeader title="Hard rules & principles" />
      {rules.length === 0 ? <EmptyState>No rules yet.</EmptyState> : rules.map((e) => (
        <div key={e.id} style={{ padding: "14px 16px", background: "#fff", border: "1px solid var(--rule)", borderRadius: 8, marginBottom: 8, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-4)", width: 24 }}>{e.index}</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, flex: 1 }}>{e.content}</div>
          <span className={`tag ${TAG[e.type]}`}>{e.type}</span>
          <button onClick={() => del.mutate(e.id)} style={{ background: "none", border: "none", color: "var(--ink-4)", cursor: "pointer", fontSize: 12 }}>×</button>
        </div>
      ))}

      <SectionHeader title="Worldview anchors" />
      {worldview.length === 0 ? <EmptyState>No anchors yet.</EmptyState> : worldview.map((e) => (
        <div key={e.id} style={{ padding: "14px 16px", background: "#fff", border: "1px solid var(--rule)", borderRadius: 8, marginBottom: 8, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-4)", width: 24 }}>{e.index}</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, flex: 1 }}>{e.content}</div>
          <span className={`tag ${TAG[e.type]}`}>{e.type}</span>
          <button onClick={() => del.mutate(e.id)} style={{ background: "none", border: "none", color: "var(--ink-4)", cursor: "pointer", fontSize: 12 }}>×</button>
        </div>
      ))}
    </Module>
  );
}

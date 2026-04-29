import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, EmptyState } from "@/components/Module";
import { shortDate } from "@/lib/date";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ecosystem")({ component: EcosystemPage });

const ICONS: Record<string, string> = { book: "📖", person: "👤", place: "🗺️", video: "▶", conversation: "💬", observation: "👁" };

function EcosystemPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [quick, setQuick] = useState("");

  const { data: entries } = useQuery({
    queryKey: ["eco", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("ecosystem_entries").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (p: any) => { await supabase.from("ecosystem_entries").insert({ user_id: user!.id, ...p }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["eco"] }); qc.invalidateQueries({ queryKey: ["sidebar-badges"] }); toast.success("Logged"); setShowForm(false); setQuick(""); },
  });

  const types = useMemo(() => Array.from(new Set((entries ?? []).map((e) => e.entry_type))), [entries]);
  const filtered = useMemo(() => {
    let list = entries ?? [];
    if (filter !== "all") list = list.filter((e) => e.entry_type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || (e.excerpt ?? "").toLowerCase().includes(q) || (e.tags ?? []).some((t: string) => t.toLowerCase().includes(q)));
    }
    return list;
  }, [entries, filter, search]);

  return (
    <Module>
      <PageHeader title="Ecosystem" subtitle="Your living memory — everything that has shaped how you see the world" actions={<button className="pos-btn primary" onClick={() => setShowForm(true)}>+ Log encounter</button>} />

      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <input className="pos-input" value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Log anything — a book, person, place, video, observation, conversation…" />
        <button className="pos-btn primary" style={{ borderRadius: 8 }} onClick={() => { if (quick.trim()) { setShowForm(true); } }}>Capture</button>
      </div>

      {showForm && <NewEntryForm initialTitle={quick} onCancel={() => setShowForm(false)} onSave={(p) => create.mutate(p)} />}

      <div style={{ marginBottom: 16 }}>
        <input className="pos-input" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <button className="opt-pill" style={filter === "all" ? { background: "var(--ink)", color: "var(--cream)", borderColor: "var(--ink)" } : {}} onClick={() => setFilter("all")}>All</button>
        {types.map((t) => (
          <button key={t} className="opt-pill" style={filter === t ? { background: "var(--ink)", color: "var(--cream)", borderColor: "var(--ink)" } : {}} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>

      {filtered.length === 0 ? <EmptyState>No entries yet.</EmptyState> : filtered.map((e) => (
        <div key={e.id} style={{ display: "flex", gap: 16, padding: "16px 18px", background: "#fff", border: "1px solid var(--rule)", borderRadius: 8, marginBottom: 8 }}>
          <div style={{ width: 48, height: 48, borderRadius: 6, background: "var(--cream-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, border: "1px solid var(--rule)" }}>{ICONS[e.entry_type] ?? "•"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{e.title}</div>
            {e.excerpt && <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 8 }}>{e.excerpt}</div>}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span className="tag tag-green">{e.entry_type}</span>
              {(e.tags ?? []).map((t: string) => <span key={t} className="tag tag-gray">{t}</span>)}
              <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", marginLeft: "auto" }}>{shortDate(e.encountered_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </Module>
  );
}

function NewEntryForm({ initialTitle, onSave, onCancel }: { initialTitle: string; onSave: (p: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initialTitle);
  const [excerpt, setExcerpt] = useState("");
  const [type, setType] = useState("observation");
  const [tags, setTags] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [url, setUrl] = useState("");
  return (
    <div className="pos-card" style={{ marginBottom: 24 }}>
      <label className="pos-label">Title</label>
      <input className="pos-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="pos-label" style={{ marginTop: 12 }}>Excerpt / key insight</label>
      <textarea className="pos-input" rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
        <div><label className="pos-label">Type</label>
          <select className="pos-input" value={type} onChange={(e) => setType(e.target.value)}>
            {["book", "person", "place", "video", "conversation", "observation"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select></div>
        <div><label className="pos-label">Date</label><input type="date" className="pos-input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="pos-label">Source URL</label><input className="pos-input" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
      </div>
      <label className="pos-label" style={{ marginTop: 12 }}>Tags (comma separated)</label>
      <input className="pos-input" value={tags} onChange={(e) => setTags(e.target.value)} />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="pos-btn primary" onClick={() => onSave({ title, excerpt, entry_type: type, tags: tags.split(",").map((t) => t.trim()).filter(Boolean), encountered_at: date, source_url: url || null })}>Save</button>
        <button className="pos-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

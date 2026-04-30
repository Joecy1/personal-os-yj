import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, EmptyState } from "@/components/Module";
import { shortDate, today } from "@/lib/date";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/relations")({ component: RelationsPage });

type Person = { id: string; name: string; context: string | null; avatar_label: string | null; tags: string[] };
type Interaction = {
  id: string; person_id: string; what_happened: string; how_i_felt: string;
  valence: string; tags: string[]; want_to_say: string | null; interaction_date: string;
};

function valenceClass(v: string) {
  if (v === "positive") return "tag-teal";
  if (v === "negative") return "tag-coral";
  return "tag-gray";
}
function valenceColor(v: string) {
  if (v === "positive") return "var(--teal)";
  if (v === "negative") return "var(--coral)";
  return "var(--ink-4)";
}

function RelationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filterTag, setFilterTag] = useState<string>("All");
  const [unsaidOnly, setUnsaidOnly] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; personId?: string; existing?: Interaction } | null>(null);
  const [quickName, setQuickName] = useState("");

  const { data: people } = useQuery({
    queryKey: ["relation-people", user?.id],
    enabled: !!user,
    queryFn: async () => ((await supabase.from("relation_people").select("*").order("created_at")).data ?? []) as Person[],
  });

  const { data: interactions } = useQuery({
    queryKey: ["relation-interactions", user?.id],
    enabled: !!user,
    queryFn: async () => ((await supabase.from("relation_interactions").select("*").order("interaction_date", { ascending: false })).data ?? []) as Interaction[],
  });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    (people ?? []).forEach((p) => (p.tags ?? []).forEach((t) => s.add(t)));
    return ["All", ...Array.from(s)];
  }, [people]);

  const stats = useMemo(() => {
    const ints = interactions ?? [];
    const pos = ints.filter((i) => i.valence === "positive").length;
    const unsaid = ints.filter((i) => i.want_to_say && i.want_to_say.trim()).length;
    const pct = ints.length ? Math.round((pos / ints.length) * 100) : 0;
    return { peopleCount: people?.length ?? 0, total: ints.length, positivePct: pct, unsaid };
  }, [people, interactions]);

  const peopleWithUnsaid = useMemo(() => {
    const set = new Set<string>();
    (interactions ?? []).forEach((i) => { if (i.want_to_say && i.want_to_say.trim()) set.add(i.person_id); });
    return set;
  }, [interactions]);

  const visiblePeople = useMemo(() => {
    let list = people ?? [];
    if (filterTag !== "All") list = list.filter((p) => (p.tags ?? []).includes(filterTag));
    if (unsaidOnly) list = list.filter((p) => peopleWithUnsaid.has(p.id));
    // sort by latest interaction
    const lastDate = new Map<string, string>();
    (interactions ?? []).forEach((i) => {
      const cur = lastDate.get(i.person_id);
      if (!cur || i.interaction_date > cur) lastDate.set(i.person_id, i.interaction_date);
    });
    return [...list].sort((a, b) => (lastDate.get(b.id) ?? "").localeCompare(lastDate.get(a.id) ?? ""));
  }, [people, interactions, filterTag, unsaidOnly, peopleWithUnsaid]);

  const delInteraction = useMutation({
    mutationFn: async (id: string) => { await supabase.from("relation_interactions").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["relation-interactions"] }); toast.success("Removed"); },
  });

  return (
    <Module>
      <div style={{ borderLeft: "3px solid var(--green)", paddingLeft: 14, marginBottom: 28 }}>
        <div className="font-serif" style={{ fontStyle: "italic", fontSize: 15, color: "var(--ink-2)", lineHeight: 1.5 }}>
          "The essence of man is the ensemble of social relations."
        </div>
        <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 6 }}>
          Karl Marx, Theses on Feuerbach, VI
        </div>
      </div>

      <PageHeader title="Relations" subtitle="Real interactions, real feelings, real things you want to say" actions={<button className="pos-btn primary" onClick={() => setModal({ open: true })}>+ Log interaction</button>} />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "People logged", val: stats.peopleCount },
          { label: "Total interactions", val: stats.total },
          { label: "Positive %", val: `${stats.positivePct}%` },
          { label: "Unsaid things", val: stats.unsaid, click: () => setUnsaidOnly((v) => !v), active: unsaidOnly },
        ].map((s, i) => (
          <button key={i} className="pos-card" onClick={s.click} style={{ textAlign: "left", cursor: s.click ? "pointer" : "default", borderColor: s.active ? "var(--coral)" : "var(--rule)" }}>
            <div className="card-label">{s.label}</div>
            <div className="font-serif" style={{ fontSize: 24, color: "var(--ink)" }}>{s.val}</div>
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {allTags.map((t) => (
          <button key={t} className={`opt-pill ${filterTag === t ? "sel" : ""}`} onClick={() => setFilterTag(t)}>{t}</button>
        ))}
      </div>

      {/* Quick capture */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (quickName.trim()) { setModal({ open: true }); } }}
        style={{ marginBottom: 24 }}
      >
        <input
          className="pos-input"
          placeholder="Who did you interact with today? A person, a community, a stranger…"
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
        />
      </form>

      {/* People list */}
      {visiblePeople.length === 0 ? (
        <EmptyState>No relations match — log your first interaction.</EmptyState>
      ) : visiblePeople.map((p) => {
        const ints = (interactions ?? []).filter((i) => i.person_id === p.id);
        const lastDate = ints[0]?.interaction_date;
        return (
          <div key={p.id} className="pos-card" style={{ marginBottom: 16, padding: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 18px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--cream-2)", border: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-2)", flexShrink: 0 }}>
                {p.avatar_label || p.name.slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.context}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {(p.tags ?? []).slice(0, 3).map((t) => <span key={t} className="tag tag-green">{t}</span>)}
                {lastDate && <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>Last: {shortDate(lastDate)}</span>}
                <button className="pos-btn" onClick={() => setModal({ open: true, personId: p.id })}>+ Add</button>
              </div>
            </div>
            {ints.map((it) => (
              <div key={it.id} style={{ borderTop: "1px solid var(--rule-2)", display: "flex", gap: 0, position: "relative" }}>
                <div style={{ width: 4, background: valenceColor(it.valence), flexShrink: 0 }} />
                <div style={{ padding: "14px 18px", flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5, marginBottom: 6 }}>{it.what_happened}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", fontStyle: "italic", lineHeight: 1.5 }}>{it.how_i_felt}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span className={`tag ${valenceClass(it.valence)}`}>{it.valence}</span>
                      {(it.tags ?? []).map((t) => <span key={t} className="tag tag-gray">{t}</span>)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>{shortDate(it.interaction_date)}</span>
                      <button onClick={() => delInteraction.mutate(it.id)} style={{ background: "none", border: "none", color: "var(--ink-4)", fontSize: 14, cursor: "pointer" }}>×</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {ints.some((i) => i.want_to_say && i.want_to_say.trim()) && (
              <div style={{ padding: "0 18px 14px" }}>
                {ints.filter((i) => i.want_to_say && i.want_to_say.trim()).map((i) => (
                  <div key={i.id + "-w"} style={{ background: "var(--cream-2)", borderRadius: 6, padding: "10px 14px", marginTop: 8 }}>
                    <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>What I want to say</div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>{i.want_to_say}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {modal?.open && (
        <LogModal
          initialPersonId={modal.personId}
          initialName={quickName}
          existing={modal.existing}
          people={people ?? []}
          onClose={() => { setModal(null); setQuickName(""); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["relation-people"] });
            qc.invalidateQueries({ queryKey: ["relation-interactions"] });
            qc.invalidateQueries({ queryKey: ["sidebar-badges"] });
            setModal(null); setQuickName("");
          }}
        />
      )}
    </Module>
  );
}

function LogModal({ initialPersonId, initialName, existing, people, onClose, onSaved }: {
  initialPersonId?: string;
  initialName?: string;
  existing?: Interaction;
  people: Person[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [personId, setPersonId] = useState<string>(initialPersonId ?? existing?.person_id ?? (people[0]?.id ?? ""));
  const [newName, setNewName] = useState(initialName && !people.find((p) => p.name.toLowerCase() === initialName.toLowerCase()) ? initialName : "");
  const [newContext, setNewContext] = useState("");
  const [newTags, setNewTags] = useState("");
  const [date, setDate] = useState(existing?.interaction_date ?? today());
  const [what, setWhat] = useState(existing?.what_happened ?? "");
  const [felt, setFelt] = useState(existing?.how_i_felt ?? "");
  const [valence, setValence] = useState<string>(existing?.valence ?? "neutral");
  const [tags, setTags] = useState((existing?.tags ?? []).join(", "));
  const [wts, setWts] = useState(existing?.want_to_say ?? "");

  const useNew = !!newName.trim() && !personId;

  const save = async () => {
    if (!user) return;
    if (!what.trim() || !felt.trim()) { toast.error("Fill what happened and how you felt"); return; }
    let pid = personId;
    if (useNew) {
      const ins = await supabase.from("relation_people").insert({
        user_id: user.id,
        name: newName.trim(),
        context: newContext.trim(),
        avatar_label: newName.trim().slice(0, 2),
        tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
      }).select("id").single();
      if (ins.error || !ins.data) { toast.error("Could not create person"); return; }
      pid = ins.data.id;
    }
    if (!pid) { toast.error("Pick a person or type a new name"); return; }
    const payload = {
      user_id: user.id,
      person_id: pid,
      what_happened: what.trim(),
      how_i_felt: felt.trim(),
      valence,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      want_to_say: wts.trim() || null,
      interaction_date: date,
    };
    const r = existing
      ? await supabase.from("relation_interactions").update(payload).eq("id", existing.id)
      : await supabase.from("relation_interactions").insert(payload);
    if (r.error) { toast.error(r.error.message); return; }
    toast.success("Saved");
    onSaved();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(26,24,20,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--cream)", borderRadius: 10, padding: 24, maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--rule)" }}>
        <div className="page-title" style={{ marginBottom: 20 }}>{existing ? "Edit interaction" : "Log interaction"}</div>

        <label className="pos-label">Who</label>
        <select className="pos-input" value={personId} onChange={(e) => { setPersonId(e.target.value); setNewName(""); }}>
          <option value="">— Type a new name below —</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {!personId && (
          <div style={{ marginTop: 8 }}>
            <input className="pos-input" placeholder="New person's name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="pos-input" placeholder="Context, e.g. Family · Singapore" value={newContext} onChange={(e) => setNewContext(e.target.value)} style={{ marginTop: 6 }} />
            <input className="pos-input" placeholder="Tags (comma separated)" value={newTags} onChange={(e) => setNewTags(e.target.value)} style={{ marginTop: 6 }} />
          </div>
        )}

        <label className="pos-label" style={{ marginTop: 14 }}>Date</label>
        <input className="pos-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <label className="pos-label" style={{ marginTop: 14 }}>What happened</label>
        <textarea className="pos-input" rows={3} value={what} onChange={(e) => setWhat(e.target.value)} />

        <label className="pos-label" style={{ marginTop: 14 }}>How I felt</label>
        <textarea className="pos-input" rows={3} value={felt} onChange={(e) => setFelt(e.target.value)} />

        <label className="pos-label" style={{ marginTop: 14 }}>Valence</label>
        <div style={{ display: "flex", gap: 6 }}>
          {(["positive", "neutral", "negative"] as const).map((v) => (
            <button key={v} type="button" className={`opt-pill ${valence === v ? "sel" : ""}`} onClick={() => setValence(v)}>{v}</button>
          ))}
        </div>

        <label className="pos-label" style={{ marginTop: 14 }}>Concept tags</label>
        <input className="pos-input" placeholder="comma separated" value={tags} onChange={(e) => setTags(e.target.value)} />

        <label className="pos-label" style={{ marginTop: 14 }}>Draft something to say to them (optional)</label>
        <textarea className="pos-input" rows={3} value={wts} onChange={(e) => setWts(e.target.value)} />

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button className="pos-btn" onClick={onClose}>Cancel</button>
          <button className="pos-btn primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

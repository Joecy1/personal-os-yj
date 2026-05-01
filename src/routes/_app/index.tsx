import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { greeting, longDate, today, shortDate } from "@/lib/date";
import { useQuests, useToggleQuest } from "@/lib/queries";
import { Module, SectionHeader } from "@/components/Module";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/")({ component: Daily });

function Daily() {
  const { user } = useAuth();
  const { data: questData } = useQuests();
  const toggle = useToggleQuest();
  const qc = useQueryClient();

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("campaigns").select("*").eq("status", "active").order("created_at")).data ?? [],
  });

  const { data: review } = useQuery({
    queryKey: ["review", user?.id, today()],
    enabled: !!user,
    queryFn: async () => (await supabase.from("daily_reviews").select("*").eq("date", today()).maybeSingle()).data,
  });

  const { data: perma } = useQuery({
    queryKey: ["perma-today", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("perma_entries").select("*").eq("date", today()).maybeSingle()).data,
  });

  const { data: anchor } = useQuery({
    queryKey: ["desire-anchor", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("desire_cycles")
        .select("id,desire,idol_name,idol_why,idol_traits,is_self_idol,ambition_size")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      const hasAnchor = data.is_self_idol || (data.idol_name && data.idol_name.trim()) || (data.idol_why && data.idol_why.trim());
      return hasAnchor ? data : null;
    },
  });

  const { data: questSpark } = useQuery({
    queryKey: ["quest-spark", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 6);
      const sinceStr = since.toISOString().slice(0, 10);
      const { data } = await supabase
        .from("quest_completions")
        .select("completed_at")
        .gte("completed_at", sinceStr);
      const counts: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        counts.push((data ?? []).filter((r) => r.completed_at === ds).length);
      }
      return counts;
    },
  });

  const { data: ecoSurfaced } = useQuery({
    queryKey: ["eco-surface", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const camps = await supabase.from("campaigns").select("tags").eq("status", "active");
      const tags = new Set<string>(); (camps.data ?? []).forEach((c) => (c.tags ?? []).forEach((t: string) => tags.add(t)));
      const all = await supabase.from("ecosystem_entries").select("*").order("created_at", { ascending: false }).limit(20);
      const list = all.data ?? [];
      const matched = list.filter((e) => (e.tags ?? []).some((t: string) => tags.has(t)));
      return (matched.length ? matched : list).slice(0, 3);
    },
  });

  const { data: relSurfaced } = useQuery({
    queryKey: ["rel-surface", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [people, ints] = await Promise.all([
        supabase.from("relation_people").select("*"),
        supabase.from("relation_interactions").select("*").order("interaction_date", { ascending: false }),
      ]);
      const peopleById = new Map((people.data ?? []).map((p) => [p.id, p]));
      const interactions = (ints.data ?? []) as Array<{ id: string; person_id: string; what_happened: string; want_to_say: string | null; interaction_date: string }>;
      const withUnsaid = interactions.filter((i) => i.want_to_say && i.want_to_say.trim());
      // overdue: latest interaction per person > 7 days ago
      const latestByPerson = new Map<string, typeof interactions[number]>();
      interactions.forEach((i) => { if (!latestByPerson.has(i.person_id)) latestByPerson.set(i.person_id, i); });
      const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 7);
      const overdue = Array.from(latestByPerson.values()).filter((i) => new Date(i.interaction_date) < sevenAgo);
      const surfaced: Array<{ kind: "unsaid" | "overdue"; interaction: typeof interactions[number]; person: any }> = [];
      withUnsaid.forEach((i) => { const p = peopleById.get(i.person_id); if (p) surfaced.push({ kind: "unsaid", interaction: i, person: p }); });
      overdue.forEach((i) => { if (surfaced.find((s) => s.person.id === i.person_id)) return; const p = peopleById.get(i.person_id); if (p) surfaced.push({ kind: "overdue", interaction: i, person: p }); });
      return surfaced.slice(0, 2);
    },
  });

  const [focus, setFocus] = useState("");
  const [wentWell, setWentWell] = useState("");
  const [carry, setCarry] = useState("");

  useEffect(() => {
    setFocus(review?.focus_intention ?? "");
    setWentWell(review?.went_well ?? "");
    setCarry(review?.carry_forward ?? "");
  }, [review]);

  const saveReview = useMutation({
    mutationFn: async (patch: Record<string, string>) => {
      if (!user) return;
      await supabase.from("daily_reviews").upsert({ user_id: user.id, date: today(), focus_intention: focus, went_well: wentWell, carry_forward: carry, ...patch }, { onConflict: "user_id,date" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review"] }),
  });

  const milestoneProgress = (m: any) => {
    const arr = Array.isArray(m) ? m : [];
    if (!arr.length) return 0;
    return Math.round((arr.filter((x: any) => x.complete).length / arr.length) * 100);
  };

  return (
    <Module>
      <div className="font-serif" style={{ fontSize: 28, fontStyle: "italic", letterSpacing: "-0.02em", marginBottom: 6 }}>{greeting()}</div>
      <div className="font-mono" style={{ fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.08em", marginBottom: 32 }}>{longDate()}</div>

      <div style={{ background: "var(--amber-bg)", border: "1px solid rgba(200,130,10,0.2)", borderRadius: 10, padding: "18px 22px", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--amber)", marginBottom: 6 }}>Today's focus</div>
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          onBlur={() => saveReview.mutate({})}
          placeholder="What matters most today?"
          style={{ background: "transparent", border: "none", outline: "none", fontSize: 14, color: "var(--ink)", fontWeight: 500, width: "100%" }}
        />
      </div>

      {anchor && (
        <div style={{ background: "var(--purple-bg)", border: "1px solid rgba(90,68,168,0.2)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--purple)" }}>Anchor — who you're becoming</div>
            {anchor.ambition_size && <span className="tag tag-purple">{anchor.ambition_size}</span>}
          </div>
          <Link to="/desire" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5, fontStyle: "italic" }} className="font-serif">
              {anchor.is_self_idol ? "My future self" : (anchor.idol_name || "—")}
              {anchor.idol_why ? <span style={{ fontStyle: "normal", fontFamily: "var(--font-sans)", color: "var(--ink-2)" }}> — {anchor.idol_why}</span> : null}
            </div>
            {anchor.idol_traits && (
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>traits to absorb · {anchor.idol_traits}</div>
            )}
            {anchor.desire && (
              <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>serving: {anchor.desire.slice(0, 100)}{anchor.desire.length > 100 ? "…" : ""}</div>
            )}
          </Link>
        </div>
      )}

      <div style={{ background: "var(--green-bg)", border: "1px solid rgba(58,125,68,0.2)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--green)", marginBottom: 8 }}>From your ecosystem — resonant today</div>
        {(ecoSurfaced?.length ?? 0) === 0 ? (
          <Link to="/ecosystem" style={{ fontSize: 13, color: "var(--ink)" }}>Your ecosystem is empty — log your first encounter →</Link>
        ) : (
          ecoSurfaced!.map((e, i) => (
            <Link key={e.id} to="/ecosystem" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderBottom: i < ecoSurfaced!.length - 1 ? "1px solid rgba(58,125,68,0.1)" : "none", textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", marginTop: 6 }} />
              <div>
                <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{e.title}{e.excerpt ? ` — ${e.excerpt.slice(0, 120)}${e.excerpt.length > 120 ? "…" : ""}` : ""}</div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{e.entry_type} · {(e.tags ?? []).slice(0, 3).join(", ")}</div>
              </div>
            </Link>
          ))
        )}
      </div>

      <div style={{ background: "var(--teal-bg)", border: "1px solid rgba(10,122,106,0.2)", borderRadius: 10, padding: "16px 20px", marginBottom: 32 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--teal)", marginBottom: 8 }}>From your relations — worth revisiting</div>
        {(relSurfaced?.length ?? 0) === 0 ? (
          <Link to="/relations" style={{ fontSize: 13, color: "var(--ink)" }}>You haven't logged any interactions yet — who did you meet recently?</Link>
        ) : (
          relSurfaced!.map((s, i) => {
            const days = Math.max(0, Math.floor((Date.now() - new Date(s.interaction.interaction_date).getTime()) / 86400000));
            const nudge = s.kind === "unsaid"
              ? `You haven't told ${s.person.name} something you wanted to say. ${(s.interaction.want_to_say ?? "").slice(0, 60)}${(s.interaction.want_to_say ?? "").length > 60 ? "…" : ""}`
              : `You haven't spoken to ${s.person.name} in ${days} days. ${s.interaction.what_happened.slice(0, 60)}${s.interaction.what_happened.length > 60 ? "…" : ""}`;
            return (
              <Link key={s.interaction.id} to="/relations" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderBottom: i < relSurfaced!.length - 1 ? "1px solid rgba(10,122,106,0.1)" : "none", textDecoration: "none", color: "inherit" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", marginTop: 6 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{nudge}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                    <strong>{s.person.name}</strong>{(s.person.tags ?? []).length ? ` · ${s.person.tags[0]}` : ""}{s.kind === "unsaid" ? " · pending want-to-say" : ` · ${days}d ago`}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        <div>
          <SectionHeader title="Daily quests" link={<Link to="/quests" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}>All →</Link>} />
          {(questData?.quests ?? []).slice(0, 6).map((q) => {
            const done = questData!.completedToday.has(q.id);
            return (
              <div key={q.id} onClick={() => toggle.mutate({ questId: q.id, xp: q.xp_value, currentlyDone: done })}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#fff", border: "1px solid var(--rule)", borderRadius: 8, cursor: "pointer", marginBottom: 6 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid var(--ink-4)", background: done ? "var(--ink)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done && <div style={{ width: 6, height: 4, borderLeft: "1.5px solid #fff", borderBottom: "1.5px solid #fff", transform: "rotate(-45deg) translate(1px,-1px)" }} />}
                </div>
                <span style={{ flex: 1, fontSize: 13, color: done ? "var(--ink-4)" : "var(--ink)", textDecoration: done ? "line-through" : "none" }}>{q.title}</span>
                <span className={`tag ${q.type === "campaign" ? "tag-amber" : q.type === "routine" ? "tag-teal" : "tag-gray"}`}>{q.type}</span>
              </div>
            );
          })}
          {(questData?.quests ?? []).length === 0 && <div className="pos-card" style={{ textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No quests yet. <Link to="/quests" style={{ color: "var(--ink)" }}>Add your first →</Link></div>}
        </div>

        <div>
          <SectionHeader title="Campaign pulse" link={<Link to="/campaigns" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}>All →</Link>} />
          {(campaigns ?? []).map((c, i) => {
            const pct = milestoneProgress(c.milestones);
            return (
              <div key={c.id} className="pos-card" style={{ marginBottom: 16 }}>
                <div className="card-label">{c.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "var(--ink-2)" }}>
                  <span>{Array.isArray(c.milestones) ? `${(c.milestones as any[]).filter((m: any) => m.complete).length} of ${(c.milestones as any[]).length}` : "0 milestones"}</span>
                  <span className="font-mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>{pct}%</span>
                </div>
                <div className="progress-bar"><div className={`progress-fill ${i % 2 === 0 ? "amber" : "teal"}`} style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
          {(campaigns ?? []).length === 0 && <div className="pos-card" style={{ textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No active campaigns. <Link to="/campaigns" style={{ color: "var(--ink)" }}>Start one →</Link></div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <SectionHeader title="Wellbeing today" link={<Link to="/perma" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" }}>{perma ? "Edit →" : "Log entry →"}</Link>} />
          <div className="pos-card">
            {perma ? (
              [
                ["Positive emotion", perma.positive_emotion, "amber"],
                ["Engagement", perma.engagement, "amber"],
                ["Relationships", perma.relationships, "teal"],
                ["Physical health", perma.physical_health, "teal"],
              ].map(([k, v, c]: any) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-2)", width: 130 }}>{k}</span>
                  <div style={{ flex: 1, height: 6, background: "var(--cream-3)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(v / 10) * 100}%`, background: `var(--${c})` }} />
                  </div>
                  <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-3)", width: 22, textAlign: "right" }}>{v}</span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: 20, color: "var(--ink-3)", fontSize: 13 }}>No entry today.</div>
            )}
          </div>
        </div>
        <div>
          <SectionHeader title="End-of-day review" />
          <div className="pos-card">
            <label className="pos-label">What went well?</label>
            <textarea className="pos-input" rows={2} value={wentWell} onChange={(e) => setWentWell(e.target.value)} onBlur={() => { saveReview.mutate({}); toast.success("Saved"); }} placeholder="Three things…" />
            <label className="pos-label" style={{ marginTop: 12 }}>What to carry forward?</label>
            <textarea className="pos-input" rows={2} value={carry} onChange={(e) => setCarry(e.target.value)} onBlur={() => { saveReview.mutate({}); toast.success("Saved"); }} placeholder="One intention…" />
          </div>
        </div>
      </div>
    </Module>
  );
}

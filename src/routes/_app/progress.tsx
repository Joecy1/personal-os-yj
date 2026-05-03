import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, SectionHeader } from "@/components/Module";

export const Route = createFileRoute("/_app/progress")({ component: ProgressPage });

function ProgressPage() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["progress-overview", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const [stats, comps, reviews, esm, cycles, fws, fwAll, camps] = await Promise.all([
        supabase.from("player_stats").select("*").maybeSingle(),
        supabase.from("quest_completions").select("completed_at").gte("completed_at", since),
        supabase.from("daily_reviews").select("date").gte("date", since),
        supabase.from("esm_entries").select("captured_at").gte("captured_at", since),
        supabase.from("desire_cycles").select("status,current_phase"),
        supabase.from("user_frameworks").select("status,unlocked_at,framework_id,knowledge_frameworks(title,domain)").eq("status", "unlocked"),
        supabase.from("knowledge_frameworks").select("id", { count: "exact", head: true }),
        supabase.from("campaigns").select("status,milestones"),
      ]);
      return {
        stats: stats.data,
        comps: comps.data ?? [],
        reviews: reviews.data ?? [],
        esm: esm.data ?? [],
        cycles: cycles.data ?? [],
        fws: fws.data ?? [],
        fwTotal: fwAll.count ?? 0,
        camps: camps.data ?? [],
      };
    },
  });

  if (!data) return <Module><PageHeader title="Progress" /></Module>;

  // 30-day arrays
  const days30: { date: string; comps: number; reviewed: boolean; esm: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    days30.push({
      date: k,
      comps: data.comps.filter((c) => c.completed_at === k).length,
      reviewed: data.reviews.some((r) => r.date === k),
      esm: data.esm.filter((e) => e.captured_at.slice(0, 10) === k).length,
    });
  }
  const reviewRate = Math.round((days30.filter((d) => d.reviewed).length / 30) * 100);
  const totalComps = days30.reduce((s, d) => s + d.comps, 0);
  const totalEsm = days30.reduce((s, d) => s + d.esm, 0);

  const cyclesByStatus = data.cycles.reduce((acc: Record<string, number>, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1; return acc;
  }, {});
  const avgPhase = data.cycles.length ? (data.cycles.reduce((s, c) => s + (c.current_phase ?? 1), 0) / data.cycles.length).toFixed(1) : "—";

  const activeCamps = data.camps.filter((c: any) => c.status === "active").length;
  const milestonesDone = data.camps.reduce((s: number, c: any) => s + ((c.milestones as any[]) ?? []).filter((m: any) => m.complete).length, 0);
  const milestonesTotal = data.camps.reduce((s: number, c: any) => s + ((c.milestones as any[]) ?? []).length, 0);

  const stats = data.stats;

  const capitals = stats ? [
    ["Financial", stats.capital_financial],
    ["Health", stats.capital_health],
    ["Human", stats.capital_human],
    ["Time / autonomy", stats.capital_time_autonomy],
    ["Psychological", stats.capital_psychological],
    ["Symbolic", stats.capital_symbolic],
    ["Social", stats.capital_social],
  ] as const : [];

  return (
    <Module>
      <PageHeader title="Progress" subtitle="The shape of the last 30 days" />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <Kpi label="Streak" value={`${stats?.streak_current ?? 0}`} sub={`best ${stats?.streak_best ?? 0}`} />
        <Kpi label="XP total" value={`${stats?.xp_total ?? 0}`} sub={`level ${stats?.level ?? 1}`} />
        <Kpi label="Frameworks" value={`${data.fws.length} / ${data.fwTotal}`} sub="unlocked" />
        <Kpi label="Daily review" value={`${reviewRate}%`} sub="last 30 days" />
      </div>

      {/* Capitals */}
      <SectionHeader title="Capitals" />
      <div className="pos-card" style={{ marginBottom: 24 }}>
        {capitals.map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-2)", width: 130 }}>{k}</span>
            <div style={{ flex: 1, height: 6, background: "var(--cream-3)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${v}%`, background: "var(--teal)" }} />
            </div>
            <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-3)", width: 30, textAlign: "right" }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Activity sparkline */}
      <SectionHeader title="Activity — last 30 days" />
      <div className="pos-card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 60 }}>
          {days30.map((d) => {
            const max = Math.max(1, ...days30.map((x) => x.comps));
            const h = Math.max(2, (d.comps / max) * 60);
            return <div key={d.date} title={`${d.date}: ${d.comps} quests, ${d.esm} check-ins${d.reviewed ? ", reviewed" : ""}`} style={{ flex: 1, height: h, background: d.reviewed ? "var(--amber)" : "var(--cream-3)", borderRadius: 1 }} />;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>
          <span>{totalComps} quest completions</span>
          <span>{totalEsm} emotion check-ins</span>
          <span>{reviewRate}% reviewed</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <SectionHeader title="Desire cycles" link={<Link to="/desire" style={miniLink}>Open →</Link>} />
          <div className="pos-card">
            <Row k="Active" v={cyclesByStatus.active ?? 0} />
            <Row k="Fulfilled" v={cyclesByStatus.fulfilled ?? 0} />
            <Row k="Abandoned" v={cyclesByStatus.abandoned ?? 0} />
            <Row k="Avg phase reached" v={avgPhase} />
          </div>
        </div>
        <div>
          <SectionHeader title="Campaigns" link={<Link to="/campaigns" style={miniLink}>Open →</Link>} />
          <div className="pos-card">
            <Row k="Active" v={activeCamps} />
            <Row k="Milestones complete" v={`${milestonesDone} / ${milestonesTotal}`} />
          </div>
        </div>
      </div>

      <SectionHeader title="Frameworks unlocked" link={<Link to="/knowledge" style={miniLink}>Vault →</Link>} />
      <div className="pos-card">
        {data.fws.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-3)" }}>None unlocked yet.</div>
        ) : (
          data.fws.map((f: any) => (
            <div key={f.framework_id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--rule)", fontSize: 13 }}>
              <span>{f.knowledge_frameworks?.title ?? "—"}</span>
              <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
                {f.knowledge_frameworks?.domain} · {f.unlocked_at ? new Date(f.unlocked_at).toLocaleDateString() : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </Module>
  );
}

const miniLink: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em", textDecoration: "none" };

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="pos-card">
      <div className="card-label">{label}</div>
      <div className="font-serif" style={{ fontSize: 26, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--rule)", fontSize: 13 }}>
      <span style={{ color: "var(--ink-2)" }}>{k}</span>
      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{v}</span>
    </div>
  );
}

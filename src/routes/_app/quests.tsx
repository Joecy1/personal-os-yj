import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuests, useToggleQuest, usePlayerStats } from "@/lib/queries";
import { levelTitle } from "@/lib/date";
import { Module, PageHeader } from "@/components/Module";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/quests")({ component: QuestsPage });

function QuestsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuests();
  const { data: stats } = usePlayerStats();
  const toggle = useToggleQuest();
  const [showNew, setShowNew] = useState(false);

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns-active", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("campaigns").select("id,title").eq("status", "active")).data ?? [],
  });

  const { data: weekly } = useQuery({
    queryKey: ["quests-weekly", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 6);
      const sinceStr = since.toISOString().slice(0, 10);
      const [completionsRes, questsRes] = await Promise.all([
        supabase.from("quest_completions").select("quest_id, completed_at").gte("completed_at", sinceStr),
        supabase.from("quests").select("id, xp_value"),
      ]);
      const xpById = new Map((questsRes.data ?? []).map((q) => [q.id, q.xp_value]));
      const days: { date: string; label: string; count: number; xp: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        const todays = (completionsRes.data ?? []).filter((c) => c.completed_at === ds);
        days.push({
          date: ds,
          label: d.toLocaleDateString(undefined, { weekday: "short" })[0],
          count: todays.length,
          xp: todays.reduce((s, c) => s + (xpById.get(c.quest_id) ?? 0), 0),
        });
      }
      return days;
    },
  });

  const create = useMutation({
    mutationFn: async (p: any) => { await supabase.from("quests").insert({ user_id: user!.id, ...p }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quests"] }); toast.success("Quest added"); setShowNew(false); },
  });

  const completedToday = data?.completedToday ?? new Set();
  const quests = data?.quests ?? [];
  const xpToday = quests.filter((q) => completedToday.has(q.id)).reduce((s, q) => s + q.xp_value, 0);
  const grouped: Record<string, typeof quests> = { routine: [], campaign: [], daily: [] };
  quests.forEach((q) => { (grouped[q.type] ?? grouped.daily).push(q); });

  return (
    <Module>
      <PageHeader title="Daily quests" subtitle="Today's action layer" actions={<button className="pos-btn primary" onClick={() => setShowNew(true)}>+ Add quest</button>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Completed" value={`${completedToday.size}`} sub={`of ${quests.length} today`} />
        <StatCard label="Streak" value={`${stats?.streak_current ?? 0}`} sub="days running" trend={`↑ best: ${stats?.streak_best ?? 0}`} />
        <StatCard label="XP today" value={`${xpToday}`} sub="of 500 target" />
        <StatCard label="Level" value={`${stats?.level ?? 1}`} sub={levelTitle(stats?.level ?? 1)} />
      </div>

      {weekly && (
        <div className="pos-card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div className="card-label" style={{ marginBottom: 0 }}>Last 7 days — feedback loop</div>
            <div style={{ display: "flex", gap: 18, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>
              <span>{weekly.reduce((s, d) => s + d.count, 0)} quests · {weekly.reduce((s, d) => s + d.xp, 0)} XP</span>
            </div>
          </div>
          <WeeklyChart days={weekly} />
        </div>
      )}

      {showNew && <NewQuestForm campaigns={campaigns ?? []} onCancel={() => setShowNew(false)} onSave={(p) => create.mutate(p)} />}

      {(["routine", "campaign", "daily"] as const).map((type) => (
        grouped[type].length > 0 && (
          <div key={type} style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>{type === "daily" ? "One-off" : type}</div>
            {grouped[type].map((q) => {
              const done = completedToday.has(q.id);
              return (
                <div key={q.id} onClick={() => toggle.mutate({ questId: q.id, xp: q.xp_value, currentlyDone: done })} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#fff", border: "1px solid var(--rule)", borderRadius: 8, cursor: "pointer", marginBottom: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid var(--ink-4)", background: done ? "var(--ink)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {done && <div style={{ width: 6, height: 4, borderLeft: "1.5px solid #fff", borderBottom: "1.5px solid #fff", transform: "rotate(-45deg) translate(1px,-1px)" }} />}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: done ? "var(--ink-4)" : "var(--ink)", textDecoration: done ? "line-through" : "none" }}>{q.title}</span>
                  <span className={`tag ${q.type === "campaign" ? "tag-amber" : q.type === "routine" ? "tag-teal" : "tag-gray"}`}>{q.type}</span>
                  <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>+{q.xp_value} XP</span>
                </div>
              );
            })}
          </div>
        )
      ))}
    </Module>
  );
}

function StatCard({ label, value, sub, trend }: { label: string; value: string; sub: string; trend?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--rule)", borderRadius: 8, padding: "16px 18px" }}>
      <div className="font-mono" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: 8 }}>{label}</div>
      <div className="font-serif" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{sub}</div>
      {trend && <div className="font-mono" style={{ fontSize: 11, marginTop: 6, color: "var(--teal)" }}>{trend}</div>}
    </div>
  );
}

function WeeklyChart({ days }: { days: { date: string; label: string; count: number; xp: number }[] }) {
  const maxXp = Math.max(1, ...days.map((d) => d.xp));
  const todayStr = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10, alignItems: "end" }}>
      {days.map((d) => {
        const h = Math.round((d.xp / maxXp) * 80);
        const isToday = d.date === todayStr;
        return (
          <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{d.xp || ""}</div>
            <div style={{ width: "100%", height: 84, display: "flex", alignItems: "flex-end" }}>
              <div
                title={`${d.date} · ${d.count} quests · ${d.xp} XP`}
                style={{
                  width: "100%",
                  height: Math.max(2, h),
                  background: isToday ? "var(--amber)" : (d.xp > 0 ? "var(--ink)" : "var(--cream-3)"),
                  borderRadius: 3,
                  transition: "height 0.3s",
                }}
              />
            </div>
            <div className="font-mono" style={{ fontSize: 10, color: isToday ? "var(--amber)" : "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{d.label}</div>
            <div className="font-mono" style={{ fontSize: 9, color: "var(--ink-4)" }}>{d.count}</div>
          </div>
        );
      })}
    </div>
  );
}

function NewQuestForm({ campaigns, onSave, onCancel }: { campaigns: { id: string; title: string }[]; onSave: (p: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("daily");
  const [xp, setXp] = useState(50);
  const [campaignId, setCampaignId] = useState("");
  const [recurrence, setRecurrence] = useState("daily");
  return (
    <div className="pos-card" style={{ marginBottom: 24 }}>
      <label className="pos-label">Title</label>
      <input className="pos-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 12 }}>
        <div><label className="pos-label">Type</label>
          <select className="pos-input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="routine">Routine</option><option value="campaign">Campaign</option><option value="daily">One-off</option>
          </select></div>
        <div><label className="pos-label">XP</label>
          <input type="number" className="pos-input" value={xp} onChange={(e) => setXp(Number(e.target.value))} /></div>
        <div><label className="pos-label">Recurrence</label>
          <select className="pos-input" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="once">Once</option>
          </select></div>
        <div><label className="pos-label">Campaign</label>
          <select className="pos-input" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">—</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button className="pos-btn primary" onClick={() => onSave({ title, type, xp_value: xp, recurrence, campaign_id: campaignId || null })}>Add</button>
        <button className="pos-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

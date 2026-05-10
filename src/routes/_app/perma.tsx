import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { today } from "@/lib/date";
import { Module, PageHeader, SectionHeader } from "@/components/Module";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Legend, Tooltip } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/perma")({ component: PermaPage });

const DIMS = [
  { k: "positive_emotion", label: "Positive emotion", color: "amber" },
  { k: "engagement", label: "Engagement", color: "amber" },
  { k: "relationships", label: "Relationships", color: "teal" },
  { k: "meaning", label: "Meaning", color: "teal" },
  { k: "achievement", label: "Achievement", color: "amber" },
  { k: "physical_health", label: "Physical health", color: "teal" },
  { k: "positive_mindset", label: "Positive mindset", color: "amber" },
  { k: "environment", label: "Environment", color: "purple" },
  { k: "economic_security", label: "Economic security", color: "coral" },
];

function PermaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [vals, setVals] = useState<Record<string, number>>(Object.fromEntries(DIMS.map((d) => [d.k, 5])));
  const [trendView, setTrendView] = useState<"individual" | "aggregated">("individual");
  const [selectedTrend, setSelectedTrend] = useState("positive_emotion");
  const [spending, setSpending] = useState("");
  const [income, setIncome] = useState("");
  const [healthLog, setHealthLog] = useState("");

  const { data: entry } = useQuery({
    queryKey: ["perma-today", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("perma_entries").select("*").eq("date", today()).maybeSingle()).data,
  });

  const { data: history } = useQuery({
    queryKey: ["perma-history", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("perma_entries").select("*").order("date", { ascending: true }).limit(30)).data ?? [],
  });

  const { data: interactions } = useQuery({
    queryKey: ["perma-relations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase
        .from("relation_interactions")
        .select("valence")
        .gte("interaction_date", sevenDaysAgo.toISOString().slice(0, 10));
      return data ?? [];
    },
  });

  const { data: pomodoros } = useQuery({
    queryKey: ["perma-pomodoro", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase
        .from("pomodoro_sessions")
        .select("duration_minutes")
        .gte("started_at", sevenDaysAgo.toISOString());
      return data ?? [];
    },
  });

  const { data: questCompletions } = useQuery({
    queryKey: ["perma-quests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase
        .from("quest_completions")
        .select("id")
        .gte("completed_at", sevenDaysAgo.toISOString().slice(0, 10));
      return data ?? [];
    },
  });

  const { data: esmToday } = useQuery({
    queryKey: ["esm-today", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("esm_entries")
        .select("primary_emotion")
        .gte("captured_at", start.toISOString());
      return data ?? [];
    },
  });

  useEffect(() => {
    if (entry) setVals(Object.fromEntries(DIMS.map((d) => [d.k, Number((entry as any)[d.k]) ?? 5])));
  }, [entry]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("perma_entries").upsert(
        { user_id: user.id, date: today(), ...vals },
        { onConflict: "user_id,date" }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perma-today"] });
      qc.invalidateQueries({ queryKey: ["perma-history"] });
      toast.success("Saved");
    },
  });

  // Calculate correlations between dimensions
  const calculateCorrelations = () => {
    if (!history || history.length < 5) return [];
    
    const correlations = [];
    
    // Engagement → Positive Emotion
    const engagementValues = (history ?? []).map((h) => (h as any).engagement);
    const emotionValues = (history ?? []).map((h) => (h as any).positive_emotion);
    const engEmoCorr = calculatePearson(engagementValues, emotionValues);
    if (!isNaN(engEmoCorr)) correlations.push({ x: "engagement", y: "positive_emotion", r: engEmoCorr });

    // Relationships → Positive Emotion
    const relValues = (history ?? []).map((h) => (h as any).relationships);
    const relEmoCorr = calculatePearson(relValues, emotionValues);
    if (!isNaN(relEmoCorr)) correlations.push({ x: "relationships", y: "positive_emotion", r: relEmoCorr });

    // Meaning → Achievement
    const meaningValues = (history ?? []).map((h) => (h as any).meaning);
    const achieveValues = (history ?? []).map((h) => (h as any).achievement);
    const meanAchieveCorr = calculatePearson(meaningValues, achieveValues);
    if (!isNaN(meanAchieveCorr)) correlations.push({ x: "meaning", y: "achievement", r: meanAchieveCorr });

    return correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  };

  const calculatePearson = (x: number[], y: number[]) => {
    if (x.length !== y.length || x.length < 2) return NaN;
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b) / n;
    const meanY = y.reduce((a, b) => a + b) / n;
    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denomX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
    const denomY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
    return numerator / (denomX * denomY);
  };

  const radarData = DIMS.map((d) => ({ dim: d.label.split(" ")[0], today: vals[d.k] }));
  const lastEntry = history && history.length > 0 ? history[history.length - 1] : null;
  const radarDataLastWeek = lastEntry ? DIMS.map((d) => ({ dim: d.label.split(" ")[0], last: Number((lastEntry as any)[d.k]) })) : [];

  const trendData = (history ?? []).map((h) => ({ date: h.date.slice(5), ...DIMS.reduce((a, d) => ({ ...a, [d.k]: Number((h as any)[d.k]) }), {}) }));
  const aggregatedTrend = (history ?? []).map((h) => ({ date: h.date.slice(5), avg: Math.round(DIMS.reduce((sum, d) => sum + Number((h as any)[d.k]), 0) / DIMS.length * 10) / 10 }));
  const correlations = calculateCorrelations();

  return (
    <Module>
      <PageHeader
        title="PERMA+4"
        subtitle="A holistic framework for measuring your lived wellbeing. Record what you actually experience day by day—grounded in the phenomena you observe, not external metrics. This is your internal truth."
        actions={
          <>
            <button className="pos-btn secondary" onClick={() => save.mutate()}>
              Save entry
            </button>
          </>
        }
      />

      {/* Today's Entry */}
      <div className="pos-card" style={{ marginBottom: 24 }}>
        <SectionHeader title="Today's wellbeing" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            {DIMS.map((d) => (
              <div key={d.k} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-2)", width: 120 }}>{d.label}</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={vals[d.k]}
                  onChange={(e) => setVals({ ...vals, [d.k]: Number(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-3)", width: 28, textAlign: "right" }}>{vals[d.k]}</span>
              </div>
            ))}
          </div>

          {/* Radar */}
          <div>
            <div style={{ height: 320, padding: 8 }}>
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--rule)" />
                  <PolarAngleAxis dataKey="dim" tick={{ fontSize: 9, fill: "var(--ink-3)" }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar dataKey="today" stroke="var(--amber)" fill="var(--amber)" fillOpacity={0.4} name="Today" />
                  {radarDataLastWeek.length > 0 && <Radar dataKey="last" stroke="var(--ink-4)" fill="none" strokeDasharray="5 5" name="7d ago" />}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Trends Section */}
      <div className="pos-card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SectionHeader title="30-day trends" />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className={`pos-btn ${trendView === "individual" ? "primary" : "secondary"}`}
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => setTrendView("individual")}
            >
              Individual
            </button>
            <button
              className={`pos-btn ${trendView === "aggregated" ? "primary" : "secondary"}`}
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => setTrendView("aggregated")}
            >
              Overall
            </button>
          </div>
        </div>

        {trendView === "individual" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label className="card-label">Dimension</label>
              <select
                value={selectedTrend}
                onChange={(e) => setSelectedTrend(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid var(--rule)",
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {DIMS.map((d) => (
                  <option key={d.k} value={d.k}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ height: 260, padding: 8 }}>
              <ResponsiveContainer>
                <LineChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--ink-3)" }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "var(--ink-3)" }} />
                  <Tooltip />
                  <Line
                    dataKey={selectedTrend}
                    stroke="var(--teal)"
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {trendView === "aggregated" && (
          <div style={{ height: 260, padding: 8 }}>
            <ResponsiveContainer>
              <LineChart data={aggregatedTrend}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--ink-3)" }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "var(--ink-3)" }} />
                <Tooltip />
                <Line
                  dataKey="avg"
                  stroke="var(--amber)"
                  dot={false}
                  strokeWidth={2.5}
                  isAnimationActive={false}
                  name="Overall wellbeing"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Economic Security */}
      <div className="pos-card" style={{ marginBottom: 24, borderLeft: "3px solid var(--coral)" }}>
        <SectionHeader title="Economic security" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label className="card-label">Income (this month)</label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="$0"
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid var(--rule)",
                borderRadius: 4,
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
            />
          </div>
          <div>
            <label className="card-label">Spending (this month)</label>
            <input
              type="number"
              value={spending}
              onChange={(e) => setSpending(e.target.value)}
              placeholder="$0"
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid var(--rule)",
                borderRadius: 4,
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="https://www.ynab.com" target="_blank" rel="noopener noreferrer" className="pos-btn secondary" style={{ fontSize: 11 }}>
            YNAB →
          </a>
          <a href="https://mint.intuit.com" target="_blank" rel="noopener noreferrer" className="pos-btn secondary" style={{ fontSize: 11 }}>
            Mint →
          </a>
          <a href="https://actualbudget.com" target="_blank" rel="noopener noreferrer" className="pos-btn secondary" style={{ fontSize: 11 }}>
            Actual →
          </a>
        </div>
      </div>

      {/* Physical Health */}
      <div className="pos-card" style={{ marginBottom: 24, borderLeft: "3px solid var(--teal)" }}>
        <SectionHeader title="Physical health" />
        <div style={{ marginBottom: 12 }}>
          <label className="card-label">Today's health log</label>
          <textarea
            value={healthLog}
            onChange={(e) => setHealthLog(e.target.value)}
            placeholder="e.g., 30min run, 8h sleep, morning stretch"
            rows={2}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid var(--rule)",
              borderRadius: 4,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              resize: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="https://www.strava.com" target="_blank" rel="noopener noreferrer" className="pos-btn secondary" style={{ fontSize: 11 }}>
            Strava →
          </a>
          <a href="https://www.apple.com/health/" target="_blank" rel="noopener noreferrer" className="pos-btn secondary" style={{ fontSize: 11 }}>
            Apple Health →
          </a>
          <a href="https://www.garmin.com" target="_blank" rel="noopener noreferrer" className="pos-btn secondary" style={{ fontSize: 11 }}>
            Garmin →
          </a>
          <a href="https://www.fitbit.com" target="_blank" rel="noopener noreferrer" className="pos-btn secondary" style={{ fontSize: 11 }}>
            Fitbit →
          </a>
        </div>
      </div>

      {/* Correlations */}
      {correlations.length > 0 && (
        <div className="pos-card" style={{ borderLeft: "3px solid var(--purple)" }}>
          <SectionHeader title="Wellbeing correlations" />
          <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.8 }}>
            {correlations.map((c, i) => (
              <div key={i} style={{ marginBottom: 8, paddingLeft: 12, borderLeft: `2px solid var(--ink-4)` }}>
                <strong>{c.x}</strong> ↔ <strong>{c.y}</strong>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                  Correlation: <code>{(c.r * 100).toFixed(0)}%</code>
                  {Math.abs(c.r) > 0.7
                    ? " — strong relationship"
                    : Math.abs(c.r) > 0.4
                      ? " — moderate relationship"
                      : " — weak relationship"}
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 12, fontStyle: "italic" }}>
              These correlations show how your dimensions influence each other over time. Positive values mean they move together; negative means they move opposite.
            </div>
          </div>
        </div>
      )}
    </Module>
  );
}
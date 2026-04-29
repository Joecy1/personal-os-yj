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

  useEffect(() => {
    if (entry) setVals(Object.fromEntries(DIMS.map((d) => [d.k, Number((entry as any)[d.k])])));
  }, [entry]);

  const save = useMutation({
    mutationFn: async () => { await supabase.from("perma_entries").upsert({ user_id: user!.id, date: today(), ...vals }, { onConflict: "user_id,date" }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perma-today"] }); qc.invalidateQueries({ queryKey: ["perma-history"] }); toast.success("Saved"); },
  });

  const radarData = DIMS.map((d) => ({ dim: d.label.split(" ")[0], today: vals[d.k] }));
  const trendData = (history ?? []).map((h) => ({ date: h.date.slice(5), ...DIMS.reduce((a, d) => ({ ...a, [d.k]: Number((h as any)[d.k]) }), {}) }));

  return (
    <Module>
      <PageHeader title="PERMA+4" subtitle="Daily wellbeing entry — 9 dimensions" actions={<button className="pos-btn primary" onClick={() => save.mutate()}>Save entry</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <SectionHeader title="Today's entry" />
          <div className="pos-card">
            {DIMS.map((d) => (
              <div key={d.k} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-2)", width: 130 }}>{d.label}</span>
                <input type="range" min={1} max={10} step={0.5} value={vals[d.k]} onChange={(e) => setVals({ ...vals, [d.k]: Number(e.target.value) })} style={{ flex: 1 }} />
                <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-3)", width: 28, textAlign: "right" }}>{vals[d.k]}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionHeader title="Radar view" />
          <div className="pos-card" style={{ height: 280, padding: 8 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--rule)" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fill: "var(--ink-3)" }} />
                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                <Radar dataKey="today" stroke="var(--amber)" fill="var(--amber)" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <SectionHeader title="30-day trend" />
          <div className="pos-card" style={{ height: 240, padding: 8 }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--ink-3)" }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "var(--ink-3)" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {DIMS.slice(0, 4).map((d, i) => <Line key={d.k} dataKey={d.k} stroke={["var(--amber)", "var(--teal)", "var(--coral)", "var(--purple)"][i]} dot={false} strokeWidth={1.5} />)}
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ink-4)", fontSize: 12 }}>Log entries to see trends</div>}
          </div>
        </div>
      </div>
    </Module>
  );
}

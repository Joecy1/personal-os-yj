import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader, SectionHeader, EmptyState } from "@/components/Module";
import { CaptureCard, EMOTION_COLOR, type Emotion } from "@/components/EsmCapture";

export const Route = createFileRoute("/_app/diary")({ component: DiaryPage });

function todayStr() { return new Date().toISOString().slice(0, 10); }
function dayKey(iso: string) { return iso.slice(0, 10); }

function DiaryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: entries } = useQuery({
    queryKey: ["esm-entries", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("esm_entries").select("*").order("captured_at", { ascending: false }).limit(200)).data ?? [],
  });

  const onLogged = () => {
    qc.invalidateQueries({ queryKey: ["esm-entries"] });
    qc.invalidateQueries({ queryKey: ["esm-today"] });
  };

  const today = (entries ?? []).filter((e) => dayKey(e.captured_at) === todayStr());

  const days: { date: string; avgV: number | null; avgA: number | null; n: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const day = (entries ?? []).filter((e) => dayKey(e.captured_at) === k);
    const n = day.length;
    days.push({
      date: k, n,
      avgV: n ? day.reduce((s, e) => s + (e.valence ?? 0), 0) / n : null,
      avgA: n ? day.reduce((s, e) => s + (e.arousal ?? 0), 0) / n : null,
    });
  }

  return (
    <Module>
      <PageHeader title="Emotion diary" subtitle="Quick check-ins. Notice the pattern." />

      <CaptureCard onSaved={onLogged} />

      <div style={{ marginTop: 32 }}>
        <SectionHeader title="Last 7 days" />
        <div className="pos-card" style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          {days.map((d) => {
            const v = d.avgV ?? 0; const a = d.avgA ?? 0;
            const vH = Math.max(2, Math.abs(v) * 14);
            const aH = Math.max(2, Math.abs(a) * 14);
            return (
              <div key={d.date} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 50, justifyContent: "center" }}>
                  <div title={`valence ${v.toFixed(1)}`} style={{ width: 8, height: vH, background: v >= 0 ? "var(--amber)" : "var(--ink-3)", borderRadius: 2 }} />
                  <div title={`arousal ${a.toFixed(1)}`} style={{ width: 8, height: aH, background: a >= 0 ? "var(--teal)" : "var(--ink-3)", borderRadius: 2, opacity: 0.7 }} />
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-4)", marginTop: 4 }}>
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })[0]}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-3)" }}>{d.n}</div>
              </div>
            );
          })}
          <div style={{ paddingLeft: 12, borderLeft: "1px solid var(--rule)", fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
            <div><span style={{ display: "inline-block", width: 8, height: 8, background: "var(--amber)", marginRight: 4 }} /> valence</div>
            <div style={{ marginTop: 4 }}><span style={{ display: "inline-block", width: 8, height: 8, background: "var(--teal)", marginRight: 4 }} /> arousal</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <SectionHeader title={`Today · ${today.length}`} />
          {today.length === 0 ? <EmptyState>No check-ins yet today.</EmptyState> : today.map((e) => <EntryRow key={e.id} entry={e} />)}
        </div>
        <div>
          <SectionHeader title="History" />
          {(entries ?? []).filter((e) => dayKey(e.captured_at) !== todayStr()).slice(0, 30).map((e) => (
            <EntryRow key={e.id} entry={e} showDate />
          ))}
          {(entries ?? []).length === 0 && <EmptyState>No entries yet.</EmptyState>}
        </div>
      </div>
    </Module>
  );
}

function EntryRow({ entry, showDate }: { entry: any; showDate?: boolean }) {
  const t = new Date(entry.captured_at);
  const time = t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const date = t.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const color = EMOTION_COLOR[entry.primary_emotion as Emotion] ?? "var(--ink-3)";
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", background: "#fff", border: "1px solid var(--rule)", borderRadius: 6, marginBottom: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "var(--ink)" }}>
          <strong style={{ color }}>{entry.primary_emotion}</strong>
          <span style={{ color: "var(--ink-3)" }}> · v{entry.valence > 0 ? "+" : ""}{entry.valence} · a{entry.arousal > 0 ? "+" : ""}{entry.arousal}</span>
          {entry.context && <span style={{ color: "var(--ink-2)" }}> — {entry.context}</span>}
        </div>
        {entry.note && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{entry.note}</div>}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-4)", whiteSpace: "nowrap" }}>
        {showDate ? `${date} · ${time}` : time}
      </div>
    </div>
  );
}

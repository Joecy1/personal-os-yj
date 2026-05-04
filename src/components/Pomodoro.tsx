// Pomodoro widget: configurable duration, optional lock to a quest or campaign, persists on completion.
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const PRESETS = [15, 25, 50, 90];

type Lock = { kind: "quest"; id: string; title: string } | { kind: "campaign"; id: string; title: string } | null;

export function Pomodoro({ initialLock }: { initialLock?: Lock }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [duration, setDuration] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [lock, setLock] = useState<Lock>(initialLock ?? null);
  const [log, setLog] = useState("");
  const [showLog, setShowLog] = useState(false);
  const startedRef = useRef<Date | null>(null);

  useEffect(() => { if (!running) setRemaining(duration * 60); }, [duration, running]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && remaining === 0) {
      if (phase === "focus") {
        setRunning(false);
        setShowLog(true);
        toast.success("Focus session done — log what you did");
      } else {
        setRunning(false);
        setPhase("focus");
        setRemaining(duration * 60);
      }
    }
  }, [remaining, running, phase, duration]);

  const { data: quests } = useQuery({
    queryKey: ["pom-quests", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("quests").select("id,title").eq("archived", false).order("created_at")).data ?? [],
  });
  const { data: campaigns } = useQuery({
    queryKey: ["pom-campaigns", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("campaigns").select("id,title").eq("status", "active").order("created_at")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("pomodoro_sessions").insert({
        user_id: user.id,
        quest_id: lock?.kind === "quest" ? lock.id : null,
        campaign_id: lock?.kind === "campaign" ? lock.id : null,
        duration_min: duration,
        break_min: breakMin,
        started_at: (startedRef.current ?? new Date()).toISOString(),
        ended_at: new Date().toISOString(),
        completed: true,
        log,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pomodoro-today"] }); toast.success("Session logged"); setShowLog(false); setLog(""); },
  });

  const start = () => {
    setPhase("focus"); setRemaining(duration * 60); startedRef.current = new Date(); setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => { setRunning(false); setRemaining(duration * 60); setPhase("focus"); };
  const startBreak = () => { setPhase("break"); setRemaining(breakMin * 60); setRunning(true); };

  const min = String(Math.floor(remaining / 60)).padStart(2, "0");
  const sec = String(remaining % 60).padStart(2, "0");
  const pct = phase === "focus" ? (remaining / (duration * 60)) * 100 : (remaining / (breakMin * 60)) * 100;

  return (
    <div style={{ background: "var(--amber-bg)", border: "1px solid rgba(200,130,10,0.2)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--amber)" }}>
          Pomodoro · {phase}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {PRESETS.map((p) => (
            <button key={p} className="opt-pill" disabled={running} onClick={() => setDuration(p)} style={duration === p ? { background: "var(--ink)", color: "var(--cream)", borderColor: "var(--ink)" } : {}}>{p}m</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className="font-mono" style={{ fontSize: 36, fontWeight: 500, color: "var(--ink)", minWidth: 120, letterSpacing: "-0.02em" }}>{min}:{sec}</div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, background: "var(--cream-3)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: phase === "focus" ? "var(--amber)" : "var(--teal)", transition: "width 1s linear" }} />
          </div>
          <select
            disabled={running}
            value={lock ? `${lock.kind}:${lock.id}` : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) { setLock(null); return; }
              const [kind, id] = v.split(":");
              if (kind === "quest") {
                const q = quests?.find((x) => x.id === id); if (q) setLock({ kind: "quest", id, title: q.title });
              } else {
                const c = campaigns?.find((x) => x.id === id); if (c) setLock({ kind: "campaign", id, title: c.title });
              }
            }}
            className="pos-input"
            style={{ fontSize: 12 }}
          >
            <option value="">— Lock to quest or campaign (optional) —</option>
            {(quests ?? []).length > 0 && <optgroup label="Quests">{quests!.map((q) => <option key={q.id} value={`quest:${q.id}`}>{q.title}</option>)}</optgroup>}
            {(campaigns ?? []).length > 0 && <optgroup label="Campaigns">{campaigns!.map((c) => <option key={c.id} value={`campaign:${c.id}`}>{c.title}</option>)}</optgroup>}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {!running && phase === "focus" && remaining === duration * 60 && <button className="pos-btn primary" onClick={start}>Start</button>}
          {running && <button className="pos-btn" onClick={pause}>Pause</button>}
          {!running && remaining < duration * 60 && remaining > 0 && <button className="pos-btn primary" onClick={() => setRunning(true)}>Resume</button>}
          {!running && phase === "focus" && remaining === 0 && <button className="pos-btn" onClick={startBreak}>Start break</button>}
          <button className="pos-btn" onClick={reset}>Reset</button>
        </div>
      </div>

      {showLog && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(200,130,10,0.2)" }}>
          <label className="pos-label">What did you actually do?</label>
          <textarea className="pos-input" rows={2} value={log} onChange={(e) => setLog(e.target.value)} placeholder="Brief log of the session…" />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button className="pos-btn primary" onClick={() => save.mutate()}>Log session</button>
            <button className="pos-btn" onClick={() => { setShowLog(false); setLog(""); }}>Skip</button>
          </div>
        </div>
      )}
    </div>
  );
}

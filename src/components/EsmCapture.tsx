import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const EMOTIONS = ["joy", "calm", "curiosity", "surprise", "sadness", "fear", "anger", "disgust"] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const EMOTION_COLOR: Record<Emotion, string> = {
  joy: "var(--amber)",
  calm: "var(--teal)",
  curiosity: "var(--purple)",
  surprise: "var(--coral)",
  sadness: "var(--ink-3)",
  fear: "var(--ink-3)",
  anger: "var(--coral)",
  disgust: "var(--ink-3)",
};

export function CaptureCard({ onSaved, compact }: { onSaved?: () => void; compact?: boolean }) {
  const { user } = useAuth();
  const [valence, setValence] = useState(0);
  const [arousal, setArousal] = useState(0);
  const [emotion, setEmotion] = useState<Emotion>("calm");
  const [context, setContext] = useState("");
  const [note, setNote] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("esm_entries").insert({
        user_id: user.id,
        valence,
        arousal,
        primary_emotion: emotion,
        context,
        note,
      });
    },
    onSuccess: () => {
      toast.success("Logged");
      setContext(""); setNote(""); setValence(0); setArousal(0);
      onSaved?.();
    },
  });

  return (
    <div className="pos-card" style={{ background: compact ? "#fff" : "var(--cream-2)" }}>
      {!compact && <div className="card-label">Quick check-in</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
        <div>
          <label className="pos-label">Valence ({valence > 0 ? "+" : ""}{valence})</label>
          <input type="range" min={-3} max={3} step={1} value={valence} onChange={(e) => setValence(Number(e.target.value))} style={{ width: "100%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
            <span>negative</span><span>positive</span>
          </div>
        </div>
        <div>
          <label className="pos-label">Arousal ({arousal > 0 ? "+" : ""}{arousal})</label>
          <input type="range" min={-3} max={3} step={1} value={arousal} onChange={(e) => setArousal(Number(e.target.value))} style={{ width: "100%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
            <span>calm</span><span>activated</span>
          </div>
        </div>
      </div>
      <label className="pos-label">Primary emotion</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {EMOTIONS.map((em) => (
          <button
            key={em}
            className="opt-pill"
            onClick={() => setEmotion(em)}
            style={emotion === em ? { background: EMOTION_COLOR[em], color: "#fff", borderColor: EMOTION_COLOR[em] } : {}}
          >
            {em}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 2fr", gap: 12 }}>
        <div>
          <label className="pos-label">Context</label>
          <input className="pos-input" value={context} onChange={(e) => setContext(e.target.value)} placeholder="What were you doing?" />
        </div>
        {!compact && (
          <div>
            <label className="pos-label">Note (optional)</label>
            <input className="pos-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Trigger, thought, etc." />
          </div>
        )}
      </div>
      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
        <button className="pos-btn primary" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Logging…" : "Log check-in"}
        </button>
      </div>
    </div>
  );
}

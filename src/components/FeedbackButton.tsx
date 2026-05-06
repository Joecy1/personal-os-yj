import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { moduleFromRoute } from "@/lib/modules";
import { toast } from "sonner";

const KINDS = [
  { key: "broken", label: "Broken", color: "var(--coral)" },
  { key: "works", label: "Works", color: "var(--green)" },
  { key: "idea", label: "Idea", color: "var(--amber)" },
  { key: "question", label: "Question", color: "var(--purple)" },
] as const;

export default function FeedbackButton() {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const mod = moduleFromRoute(path);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("broken");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("normal");

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("feedback_items").insert({
        user_id: user.id,
        route: path,
        module_key: mod?.key ?? "",
        kind, severity, title, body, status: "open",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      setTitle(""); setBody(""); setOpen(false);
      toast.success("Feedback logged");
    },
  });

  if (!user || path === "/login" || path === "/onboarding" || path.startsWith("/feedback") || path.startsWith("/prd")) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Feedback on this page"
        style={{
          position: "fixed", right: 18, bottom: 18, zIndex: 50,
          width: 40, height: 40, borderRadius: "50%",
          background: "var(--ink)", color: "var(--cream)", border: "none", cursor: "pointer",
          fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
        }}
      >!</button>

      {open && (
        <div style={{ position: "fixed", right: 18, bottom: 68, width: 340, zIndex: 51, background: "#fff", border: "1px solid var(--rule)", borderRadius: 10, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}>
          <div className="font-mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 8 }}>
            Feedback · {mod?.label ?? path}
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
            {KINDS.map((k) => (
              <button key={k.key} className="opt-pill" onClick={() => setKind(k.key)} style={kind === k.key ? { background: k.color, borderColor: k.color, color: "#fff" } : {}}>
                {k.label}
              </button>
            ))}
          </div>
          <input className="pos-input" placeholder="Short title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="pos-input" rows={3} placeholder="What happened? What did you expect?" value={body} onChange={(e) => setBody(e.target.value)} style={{ marginTop: 8 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {(["low", "normal", "high"] as const).map((s) => (
              <button key={s} className="opt-pill" onClick={() => setSeverity(s)} style={severity === s ? { background: "var(--cream-2)", borderColor: "var(--ink-4)", color: "var(--ink)" } : {}}>{s}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="pos-btn primary" disabled={!title} onClick={() => submit.mutate()}>Log</button>
            <button className="pos-btn" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

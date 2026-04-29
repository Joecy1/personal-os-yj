import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [w1, setW1] = useState("");
  const [w2, setW2] = useState("");
  const [influence, setInfluence] = useState("Building reach, credibility, and the ability to shift how others think.");
  const [profit, setProfit] = useState("Generating surplus through value creation — services, products, and systems that convert capability into financial capital.");
  const [impact, setImpact] = useState("Creating change beyond yourself — contributions to institutions, communities, and systems that outlast individual transactions.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("name, onboarded").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data?.onboarded) nav({ to: "/" });
        if (data?.name) setName(data.name);
      });
    }
  }, [user, nav]);

  const seed = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await supabase.from("profiles").update({ name, onboarded: true }).eq("id", user.id);
      const entries: Array<{ user_id: string; index: string; content: string; type: string }> = [];
      if (w1.trim()) entries.push({ user_id: user.id, index: "W1", content: w1.trim(), type: "worldview" });
      if (w2.trim()) entries.push({ user_id: user.id, index: "W2", content: w2.trim(), type: "worldview" });
      if (entries.length) await supabase.from("philosophy_entries").insert(entries);

      // Update path descriptions
      await Promise.all([
        supabase.from("personal_map_paths").update({ description: influence }).eq("user_id", user.id).eq("path_type", "influence"),
        supabase.from("personal_map_paths").update({ description: profit }).eq("user_id", user.id).eq("path_type", "profit"),
        supabase.from("personal_map_paths").update({ description: impact }).eq("user_id", user.id).eq("path_type", "impact"),
      ]);

      // Seed starter quests
      await supabase.from("quests").insert([
        { user_id: user.id, title: "Morning review + intention set", type: "routine", xp_value: 30 },
        { user_id: user.id, title: "Deep work block · 90 min", type: "routine", xp_value: 80 },
        { user_id: user.id, title: "Move body · 30 min", type: "routine", xp_value: 50 },
      ]);

      toast.success("System ready.");
      nav({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
      <div className="font-serif" style={{ fontSize: 28, fontStyle: "italic", letterSpacing: "-0.02em", marginBottom: 6 }}>
        Let's seed your system.
      </div>
      <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", marginBottom: 32 }}>
        ONE-TIME SETUP · TAKES 2 MINUTES
      </div>

      <div className="pos-card" style={{ marginBottom: 16 }}>
        <div className="card-label">Identity</div>
        <label className="pos-label">Your name</label>
        <input className="pos-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
      </div>

      <div className="pos-card" style={{ marginBottom: 16 }}>
        <div className="card-label">Worldview anchors</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>Two beliefs that orient everything else.</div>
        <label className="pos-label">Anchor W1</label>
        <textarea className="pos-input" rows={2} value={w1} onChange={(e) => setW1(e.target.value)} placeholder="The belief that frames how you see the world…" />
        <label className="pos-label" style={{ marginTop: 12 }}>Anchor W2</label>
        <textarea className="pos-input" rows={2} value={w2} onChange={(e) => setW2(e.target.value)} placeholder="A second orienting truth…" />
      </div>

      <div className="pos-card" style={{ marginBottom: 24 }}>
        <div className="card-label">Three paths</div>
        <label className="pos-label" style={{ color: "var(--amber)" }}>Influence</label>
        <textarea className="pos-input" rows={2} value={influence} onChange={(e) => setInfluence(e.target.value)} />
        <label className="pos-label" style={{ marginTop: 12, color: "var(--teal)" }}>Profit</label>
        <textarea className="pos-input" rows={2} value={profit} onChange={(e) => setProfit(e.target.value)} />
        <label className="pos-label" style={{ marginTop: 12, color: "var(--purple)" }}>Impact</label>
        <textarea className="pos-input" rows={2} value={impact} onChange={(e) => setImpact(e.target.value)} />
      </div>

      <button disabled={busy} className="pos-btn primary" style={{ borderRadius: 6, padding: "12px 24px", justifyContent: "center" }} onClick={seed}>
        {busy ? "Seeding…" : "Enter Personal OS"}
      </button>
    </div>
  );
}

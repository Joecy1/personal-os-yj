import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/" });
  }, [user, loading, nav]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div className="font-serif" style={{ fontSize: 28, letterSpacing: "-0.02em", marginBottom: 4 }}>
          Personal<span style={{ color: "var(--amber)" }}>OS</span>
        </div>
        <div className="font-mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em", marginBottom: 32 }}>
          {mode === "signin" ? "WELCOME BACK" : "CREATE YOUR SYSTEM"}
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "signup" && (
            <div>
              <label className="pos-label">Name</label>
              <input className="pos-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="pos-label">Email</label>
            <input type="email" className="pos-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="pos-label">Password</label>
            <input type="password" className="pos-input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button disabled={busy} className="pos-btn primary" style={{ borderRadius: 6, padding: "10px 14px", justifyContent: "center", marginTop: 4 }}>
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>
          {mode === "signin" ? (
            <>No account yet? <button onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: "var(--ink)", cursor: "pointer", textDecoration: "underline" }}>Create one</button></>
          ) : (
            <>Already have one? <button onClick={() => setMode("signin")} style={{ background: "none", border: "none", color: "var(--ink)", cursor: "pointer", textDecoration: "underline" }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}

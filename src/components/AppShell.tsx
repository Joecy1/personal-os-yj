import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { longDate } from "@/lib/date";
import { useIsMobile } from "@/hooks/use-mobile";
import FeedbackButton from "@/components/FeedbackButton";

type BadgeKey = "campaigns" | "quests" | "ecosystem" | "relations" | "worldmaps" | "frameworks";
const sections: Array<{ label: string; items: Array<{ to: string; label: string; dot: string; badgeKey?: BadgeKey }> }> = [
  { label: "Today", items: [
    { to: "/", label: "Daily session", dot: "var(--amber)" },
    { to: "/diary", label: "Emotion diary", dot: "var(--coral)" },
    { to: "/motivation", label: "Motivation engine", dot: "var(--purple)" },
  ] },
  {
    label: "Execution",
    items: [
      { to: "/campaigns", label: "Campaigns", dot: "var(--teal)", badgeKey: "campaigns" },
      { to: "/quests", label: "Daily quests", dot: "var(--teal)", badgeKey: "quests" },
      { to: "/stats", label: "Stats", dot: "var(--teal)" },
      { to: "/progress", label: "Progress", dot: "var(--purple)" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { to: "/knowledge", label: "Knowledge vault", dot: "var(--amber)", badgeKey: "frameworks" },
    ],
  },
  {
    label: "World",
    items: [
      { to: "/ecosystem", label: "Ecosystem", dot: "var(--green)", badgeKey: "ecosystem" },
      { to: "/relations", label: "Relations", dot: "var(--green)", badgeKey: "relations" },
      { to: "/worldmap", label: "World map", dot: "var(--purple)", badgeKey: "worldmaps" },
    ],
  },
  {
    label: "Self model",
    items: [
      { to: "/map", label: "Personal map", dot: "var(--purple)" },
      { to: "/philosophy", label: "Philosophy", dot: "var(--purple)" },
      { to: "/manifesto", label: "Manifesto", dot: "var(--ink)" },
      { to: "/perma", label: "PERMA+4 (empirical)", dot: "var(--coral)" },
    ],
  },
  {
    label: "Build",
    items: [
      { to: "/prd", label: "PRD docs", dot: "var(--ink)" },
      { to: "/feedback", label: "Feedback", dot: "var(--coral)" },
    ],
  },
];

// Bottom-tab quick nav for mobile
const mobileTabs = [
  { to: "/", label: "Today", icon: "◐" },
  { to: "/quests", label: "Quests", icon: "◇" },
  { to: "/campaigns", label: "Camp", icon: "▲" },
  { to: "/map", label: "Map", icon: "◊" },
  { to: "/stats", label: "Stats", icon: "▦" },
];

function useBadges(userId: string | undefined) {
  return useQuery({
    queryKey: ["sidebar-badges", userId],
    enabled: !!userId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [c, q, e, comps, rp, wm, fw] = await Promise.all([
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("quests").select("id").eq("archived", false),
        supabase.from("ecosystem_entries").select("id", { count: "exact", head: true }),
        supabase.from("quest_completions").select("quest_id").eq("completed_at", today),
        supabase.from("relation_people").select("id", { count: "exact", head: true }),
        supabase.from("world_maps").select("id", { count: "exact", head: true }).eq("status", "complete"),
        supabase.from("user_frameworks").select("id", { count: "exact", head: true }).eq("status", "unlocked"),
      ]);
      const completedToday = new Set((comps.data ?? []).map((r) => r.quest_id));
      const incomplete = (q.data ?? []).filter((qq) => !completedToday.has(qq.id)).length;
      return { campaigns: c.count ?? 0, quests: incomplete, ecosystem: e.count ?? 0, relations: rp.count ?? 0, worldmaps: wm.count ?? 0, frameworks: fw.count ?? 0 };
    },
  });
}

function NavList({ path, badges, onNavigate }: { path: string; badges: any; onNavigate?: () => void }) {
  return (
    <>
      {sections.map((sec, i) => (
        <div key={sec.label}>
          {i > 0 && <div style={{ height: 1, background: "var(--rule)", margin: "4px 16px 16px" }} />}
          <div style={{ padding: "0 16px", marginBottom: 20 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-4)", padding: "0 8px", marginBottom: 6 }}>{sec.label}</div>
            {sec.items.map((it) => {
              const active = path === it.to;
              const badge = it.badgeKey ? badges?.[it.badgeKey] : undefined;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={onNavigate}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: active ? "9px 8px 9px 6px" : "9px 8px",
                    borderRadius: 6, marginBottom: 1, textDecoration: "none", color: "inherit",
                    background: active ? "var(--cream-2)" : "transparent",
                    borderLeft: active ? "2px solid var(--ink)" : "2px solid transparent",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: it.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: active ? "var(--ink)" : "var(--ink-2)", fontWeight: active ? 500 : 400, flex: 1 }}>{it.label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)", background: "var(--cream-3)", padding: "1px 6px", borderRadius: 10 }}>{badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: badges } = useBadges(user?.id);
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const initials = (user?.user_metadata?.name as string | undefined)?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "•";

  useEffect(() => { setDrawerOpen(false); }, [path]);

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--cream)" }}>
        {/* Mobile topbar */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, padding: "0 14px", borderBottom: "1px solid var(--rule)", background: "var(--cream)", flexShrink: 0 }}>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ width: 32, height: 32, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, background: "transparent", border: "none", padding: 6, cursor: "pointer" }}
          >
            <span style={{ height: 1.5, background: "var(--ink)" }} />
            <span style={{ height: 1.5, background: "var(--ink)" }} />
            <span style={{ height: 1.5, background: "var(--ink)" }} />
          </button>
          <div className="font-serif" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Personal<span style={{ color: "var(--amber)" }}>OS</span>
          </div>
          <button onClick={signOut} title="Sign out" style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--cream-3)", border: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, color: "var(--ink-2)", cursor: "pointer" }}>
            {initials}
          </button>
        </header>

        {/* Date strip + CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid var(--rule)", background: "var(--cream)", flexShrink: 0 }}>
          <span className="font-mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em" }}>{longDate()}</span>
          <Link to="/" className="pos-btn primary" style={{ fontSize: 11, padding: "5px 10px" }}>Start Pomodoro</Link>
        </div>

        {/* Main */}
        <main style={{ flex: 1, overflowY: "auto", position: "relative", paddingBottom: 64 }}>
          {children}
          <FeedbackButton />
        </main>

        {/* Bottom tab bar */}
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 60, display: "grid", gridTemplateColumns: `repeat(${mobileTabs.length}, 1fr)`, borderTop: "1px solid var(--rule)", background: "var(--cream)", zIndex: 30 }}>
          {mobileTabs.map((t) => {
            const active = path === t.to;
            return (
              <Link key={t.to} to={t.to} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, textDecoration: "none", color: active ? "var(--ink)" : "var(--ink-3)" }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>{t.icon}</span>
                <span className="font-mono" style={{ fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: active ? 600 : 400 }}>{t.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Drawer */}
        {drawerOpen && (
          <>
            <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 40 }} />
            <aside style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 260, background: "var(--cream)", zIndex: 41, overflowY: "auto", borderRight: "1px solid var(--rule)", paddingTop: 16 }}>
              <div style={{ padding: "0 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="font-serif" style={{ fontSize: 15, fontWeight: 700 }}>
                  Personal<span style={{ color: "var(--amber)" }}>OS</span>
                </div>
                <button onClick={() => setDrawerOpen(false)} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "var(--ink-2)" }}>×</button>
              </div>
              <NavList path={path} badges={badges} onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gridTemplateRows: "52px 1fr", height: "100vh", overflow: "hidden", background: "var(--cream)" }}>
      {/* Topbar */}
      <header style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--rule)", paddingRight: 24, background: "var(--cream)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", height: "100%", padding: "0 24px", borderRight: "1px solid var(--rule)", width: 220 }}>
          <div className="font-serif" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Personal<span style={{ color: "var(--amber)" }}>OS</span>
          </div>
        </div>
        <div style={{ flex: 1, padding: "0 24px" }}>
          <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em" }}>{longDate()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" className="pos-btn primary">Start Pomodoro</Link>
          <button onClick={signOut} title="Sign out" style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--cream-3)", border: "1px solid var(--rule)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, color: "var(--ink-2)", cursor: "pointer" }}>
            {initials}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <nav style={{ borderRight: "1px solid var(--rule)", padding: "16px 0", overflowY: "auto" }}>
        <NavList path={path} badges={badges} />
      </nav>

      {/* Main */}
      <main style={{ overflowY: "auto", position: "relative" }}>
        {children}
        <FeedbackButton />
      </main>
    </div>
  );
}

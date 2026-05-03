import { createFileRoute, Link } from "@tanstack/react-router";
import { Module, PageHeader } from "@/components/Module";

export const Route = createFileRoute("/_app/manifesto")({ component: ManifestoPage });

function ManifestoPage() {
  return (
    <Module>
      <PageHeader title="Manifesto" subtitle="What this Personal OS is for, and what it refuses to be" />

      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        <Section
          title="01 · Production over consumption"
          accent="var(--amber)"
          body={[
            "The default modern life is a feed: an unbroken loop of consumption with no surplus on the other side. This OS exists to invert that.",
            "Every consumption is coupled to a production. You may consume only after you produce. Reading earns writing. Watching earns making. Listening earns saying.",
          ]}
          link={{ to: "/desire", label: "See the coupling rule in Desire engine →" }}
        />

        <Section
          title="02 · Knowledge as foundation, not decoration"
          accent="var(--purple)"
          body={[
            "Frameworks are not collected — they are unlocked. Unlocking requires demonstrating that you can use them, not just recall them.",
            "Once a framework is yours, it surfaces inside other modules: in decompose, in maps, in daily review. Knowledge is only knowledge if it changes the next decision.",
          ]}
          link={{ to: "/knowledge", label: "Open the Knowledge vault →" }}
        />

        <Section
          title="03 · Anchored desire, not chased desire"
          accent="var(--coral)"
          body={[
            "Most desires are noise borrowed from someone else's life. The cycle here forces a question before the chase: who is the future self this desire serves?",
            "An idol is not a god. An idol is a vector — a set of traits to absorb, abandoned the moment you outgrow them.",
          ]}
          link={{ to: "/desire", label: "Set your anchor →" }}
        />

        <Section
          title="04 · Media diet is a moral choice"
          accent="var(--teal)"
          body={[
            "What you let into your attention shapes who you become more than what you say you believe. The ecosystem is a garden, not a feed.",
            "Curate slowly. Prune ruthlessly. The default is exclusion.",
          ]}
          link={{ to: "/ecosystem", label: "Tend your ecosystem →" }}
        />

        <Section
          title="05 · Impact lives in the open"
          accent="var(--green)"
          body={[
            "Private optimization is fine. Private impact is impossible. Campaigns and world maps exist so the work can be looked at — by you tomorrow, by others later.",
            "If it never leaves your head, it never happened.",
          ]}
          link={{ to: "/campaigns", label: "Run a campaign →" }}
        />

        <Section
          title="06 · The session is sacred"
          accent="var(--ink)"
          body={[
            "One daily session. Anchor, focus, framework, action, review. The rest is optional. Without the session, every other module turns into a museum.",
          ]}
          link={{ to: "/", label: "Start today's session →" }}
        />
      </div>
    </Module>
  );
}

function Section({ title, accent, body, link }: { title: string; accent: string; body: string[]; link?: { to: string; label: string } }) {
  return (
    <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 20 }}>
      <div className="font-mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: accent, marginBottom: 8 }}>{title}</div>
      {body.map((p, i) => (
        <p key={i} className="font-serif" style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink)", marginBottom: 10 }}>{p}</p>
      ))}
      {link && <Link to={link.to} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: accent, textDecoration: "none", letterSpacing: "0.04em" }}>{link.label}</Link>}
    </div>
  );
}

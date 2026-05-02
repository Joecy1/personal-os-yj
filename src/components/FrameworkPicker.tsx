import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "@tanstack/react-router";

export type UnlockedFramework = { id: string; slug: string; title: string; domain: string };

export function useUnlockedFrameworks(domainFilter?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unlocked-frameworks", user?.id, domainFilter ?? "all"],
    enabled: !!user,
    queryFn: async (): Promise<UnlockedFramework[]> => {
      const { data } = await supabase
        .from("user_frameworks")
        .select("framework_id, knowledge_frameworks(id, slug, title, domain)")
        .eq("status", "unlocked");
      const list: UnlockedFramework[] = ((data ?? []) as any[])
        .map((r) => r.knowledge_frameworks as UnlockedFramework | null)
        .filter((f): f is UnlockedFramework => !!f);
      if (domainFilter) return list.filter((f) => f.domain === domainFilter);
      return list;
    },
  });
}

export function FrameworkChips({
  selectedSlugs,
  onChange,
  domainFilter,
  emptyHint,
}: {
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  domainFilter?: string;
  emptyHint?: string;
}) {
  const { data: frameworks } = useUnlockedFrameworks(domainFilter);
  const list = frameworks ?? [];
  if (list.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--ink-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
        {emptyHint ?? "No unlocked frameworks yet."}{" "}
        <Link to="/knowledge" style={{ color: "var(--amber)" }}>Open vault →</Link>
      </div>
    );
  }
  const toggle = (slug: string) => {
    if (selectedSlugs.includes(slug)) onChange(selectedSlugs.filter((s) => s !== slug));
    else onChange([...selectedSlugs, slug]);
  };
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {list.map((f) => {
        const sel = selectedSlugs.includes(f.slug);
        return (
          <button
            key={f.slug}
            className="opt-pill"
            style={sel ? { background: "var(--amber-bg)", borderColor: "var(--amber)", color: "var(--amber)" } : {}}
            onClick={() => toggle(f.slug)}
            title={f.title}
          >
            {f.title}
          </button>
        );
      })}
    </div>
  );
}

export function FrameworkSelect({
  value,
  onChange,
  domainFilter,
  placeholder = "— none —",
}: {
  value: string | null | undefined;
  onChange: (slug: string | null) => void;
  domainFilter?: string;
  placeholder?: string;
}) {
  const { data: frameworks } = useUnlockedFrameworks(domainFilter);
  const list = frameworks ?? [];
  if (list.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--ink-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
        No unlocked frameworks yet. <Link to="/knowledge" style={{ color: "var(--amber)" }}>Open vault →</Link>
      </div>
    );
  }
  return (
    <select
      className="pos-input"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      style={{ cursor: "pointer" }}
    >
      <option value="">{placeholder}</option>
      {list.map((f) => (
        <option key={f.slug} value={f.slug}>{f.title}</option>
      ))}
    </select>
  );
}

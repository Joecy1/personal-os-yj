import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Module, PageHeader } from "@/components/Module";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/map")({ component: MapPage });

const COLORS: Record<string, string> = { influence: "var(--amber)", profit: "var(--teal)", impact: "var(--purple)" };

function MapPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: paths } = useQuery({
    queryKey: ["paths", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("personal_map_paths").select("*").order("path_type")).data ?? [],
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => { await supabase.from("personal_map_paths").update(patch).eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["paths"] }); toast.success("Saved"); },
  });

  return (
    <Module>
      <PageHeader title="Personal map" subtitle="Three paths from individual flourishing to success" />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(paths ?? []).map((p) => {
          const metrics = (Array.isArray(p.metrics) ? p.metrics : []) as { label: string; value: string }[];
          return (
            <div key={p.id} className="pos-card" style={{ position: "relative", overflow: "hidden", padding: "18px 20px" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: COLORS[p.path_type] }} />
              <div className="font-serif" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, textTransform: "capitalize" }}>{p.path_type}</div>
              <textarea defaultValue={p.description ?? ""} onBlur={(e) => update.mutate({ id: p.id, patch: { description: e.target.value } })} className="pos-input" rows={2} style={{ marginBottom: 12, border: "none", padding: 0, background: "transparent", fontSize: 12, color: "var(--ink-3)" }} />
              <div style={{ display: "flex", gap: 24 }}>
                {metrics.map((m, i) => (
                  <div key={i}>
                    <input
                      className="font-mono"
                      defaultValue={m.value}
                      onBlur={(e) => { const next = [...metrics]; next[i] = { ...next[i], value: e.target.value }; update.mutate({ id: p.id, patch: { metrics: next } }); }}
                      style={{ fontSize: 18, fontWeight: 500, color: "var(--ink)", border: "none", background: "transparent", width: 80, padding: 0 }}
                    />
                    <div style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Module>
  );
}

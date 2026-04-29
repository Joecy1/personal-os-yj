import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { today } from "@/lib/date";
import { toast } from "sonner";

export type Quest = { id: string; title: string; type: string; xp_value: number; campaign_id: string | null; archived: boolean };
export type Completion = { quest_id: string; completed_at: string };

export function useQuests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quests", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<{ quests: Quest[]; completedToday: Set<string> }> => {
      const [q, c] = await Promise.all([
        supabase.from("quests").select("*").eq("archived", false).order("created_at"),
        supabase.from("quest_completions").select("quest_id").eq("completed_at", today()),
      ]);
      if (q.error) throw q.error;
      return { quests: (q.data ?? []) as Quest[], completedToday: new Set((c.data ?? []).map((r) => r.quest_id)) };
    },
  });
}

export function useToggleQuest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ questId, xp, currentlyDone }: { questId: string; xp: number; currentlyDone: boolean }) => {
      if (!user) throw new Error("not signed in");
      const t = today();
      if (currentlyDone) {
        await supabase.from("quest_completions").delete().eq("quest_id", questId).eq("completed_at", t);
        // decrement xp
        const { data: stats } = await supabase.from("player_stats").select("*").eq("user_id", user.id).single();
        if (stats) {
          const newXp = Math.max(0, stats.xp_total - xp);
          const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);
          await supabase.from("player_stats").update({ xp_total: newXp, level: newLevel }).eq("user_id", user.id);
        }
      } else {
        await supabase.from("quest_completions").insert({ quest_id: questId, user_id: user.id, completed_at: t });
        const { data: stats } = await supabase.from("player_stats").select("*").eq("user_id", user.id).single();
        if (stats) {
          const newXp = stats.xp_total + xp;
          const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);
          // streak
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
          const yStr = yesterday.toISOString().slice(0, 10);
          let streak = stats.streak_current;
          if (stats.last_completion_date !== t) {
            streak = stats.last_completion_date === yStr ? streak + 1 : 1;
          }
          await supabase.from("player_stats").update({
            xp_total: newXp, level: newLevel,
            streak_current: streak,
            streak_best: Math.max(stats.streak_best, streak),
            last_completion_date: t,
          }).eq("user_id", user.id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quests"] });
      qc.invalidateQueries({ queryKey: ["player-stats"] });
      qc.invalidateQueries({ queryKey: ["sidebar-badges"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
}

export function usePlayerStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["player-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("player_stats").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });
}

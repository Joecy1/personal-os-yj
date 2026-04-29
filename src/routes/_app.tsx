import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  if (loading) return <div style={{ minHeight: "100vh" }} />;
  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }
  if (!profileLoading && profile && !profile.onboarded) {
    if (typeof window !== "undefined") window.location.href = "/onboarding";
    return null;
  }

  return <AppShell><Outlet /></AppShell>;
}

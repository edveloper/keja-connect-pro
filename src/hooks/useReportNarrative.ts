import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import {
  checkAiServiceHealth,
  generateFinancialNarrative,
  type FinancialNarrativeInput,
} from "@/lib/ai/ollama";

type ReportNarrative = Database["public"]["Tables"]["report_narratives"]["Row"];

interface GenerateNarrativePayload {
  monthKey: string;
  input: FinancialNarrativeInput;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export function useReportNarrative(monthKey: string) {
  return useQuery<ReportNarrative | null, Error>({
    queryKey: ["report-narrative", monthKey],
    enabled: !!monthKey,
    queryFn: async () => {
      const userId = await getUserIdOrNull();
      if (!userId) return null;

      const { data, error } = await supabase
        .from("report_narratives")
        .select("*")
        .eq("user_id", userId)
        .eq("month_key", monthKey)
        .maybeSingle();

      if (error) throw error;
      return (data as ReportNarrative | null) ?? null;
    },
    staleTime: 30_000,
  });
}

export function useAiServiceHealth() {
  return useQuery({
    queryKey: ["ai-service-health"],
    queryFn: checkAiServiceHealth,
    refetchInterval: 30_000,
    retry: false,
    staleTime: 10_000,
  });
}

export function useGenerateReportNarrative() {
  const queryClient = useQueryClient();

  return useMutation<ReportNarrative, Error, GenerateNarrativePayload>({
    mutationFn: async ({ monthKey, input }) => {
      const userId = await getUserIdOrNull();
      if (!userId) throw new Error("Not authenticated");

      const health = await checkAiServiceHealth();
      if (!health.ok) {
        throw new Error(health.error ?? "AI service is offline.");
      }

      const generated = await generateFinancialNarrative(input);

      const { data, error } = await supabase
        .from("report_narratives")
        .upsert(
          {
            user_id: userId,
            month_key: monthKey,
            input_json: input,
            narrative_text: generated.text,
            provider: generated.provider,
            model: generated.model,
          },
          { onConflict: "user_id,month_key" }
        )
        .select()
        .single();

      if (error) throw error;
      return data as ReportNarrative;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["report-narrative", data.month_key] });
      toast({ title: "AI summary updated", description: "Financial narrative generated successfully." });
    },
    onError: (error) => {
      toast({
        title: "AI summary unavailable",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

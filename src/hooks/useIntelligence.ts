import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

type RiskSnapshot = Database["public"]["Tables"]["tenant_risk_snapshots"]["Row"];
type ReminderQueueRow = Database["public"]["Tables"]["reminder_queue"]["Row"];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

async function getUserIdOrNull(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export function useTenantRiskSnapshots(monthKey: string | null) {
  return useQuery<RiskSnapshot[], Error>({
    queryKey: ["tenant-risk-snapshots", monthKey ?? "all-time"],
    enabled: !!monthKey,
    queryFn: async () => {
      const userId = await getUserIdOrNull();
      if (!userId || !monthKey) return [];

      const { data, error } = await supabase
        .from("tenant_risk_snapshots")
        .select("*")
        .eq("user_id", userId)
        .eq("month_key", monthKey)
        .order("risk_score", { ascending: false });

      if (error) throw error;
      return (data ?? []) as RiskSnapshot[];
    },
    staleTime: 30_000,
  });
}

export function useRiskSummary(monthKey: string | null) {
  const { data = [], ...rest } = useTenantRiskSnapshots(monthKey);

  const summary = useMemo(() => {
    const high = data.filter((r) => r.risk_level === "high").length;
    const medium = data.filter((r) => r.risk_level === "medium").length;
    const low = data.filter((r) => r.risk_level === "low").length;
    return { high, medium, low, total: data.length };
  }, [data]);

  return { ...rest, data, summary };
}

export function useReminderQueue(monthKey: string | null) {
  return useQuery<ReminderQueueRow[], Error>({
    queryKey: ["reminder-queue", monthKey ?? "all-time"],
    enabled: !!monthKey,
    queryFn: async () => {
      const userId = await getUserIdOrNull();
      if (!userId || !monthKey) return [];

      const { data, error } = await supabase
        .from("reminder_queue")
        .select("*")
        .eq("user_id", userId)
        .eq("month_key", monthKey)
        .order("priority", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ReminderQueueRow[];
    },
    staleTime: 30_000,
  });
}

export function useRunTenantRiskScoring() {
  const queryClient = useQueryClient();

  return useMutation<number, Error, string>({
    mutationFn: async (monthKey: string) => {
      const { data, error } = await supabase.rpc("calculate_tenant_risk", {
        p_month_key: monthKey,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: (count, monthKey) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-risk-snapshots", monthKey] });
      toast({
        title: "Risk scan complete",
        description: `Updated ${count} tenant risk profile(s).`,
      });
    },
    onError: (error) => {
      toast({
        title: "Risk scan failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useEnqueueRiskReminders() {
  const queryClient = useQueryClient();

  return useMutation<number, Error, string>({
    mutationFn: async (monthKey: string) => {
      const { data, error } = await supabase.rpc("enqueue_risk_reminders", {
        p_month_key: monthKey,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: (count, monthKey) => {
      queryClient.invalidateQueries({ queryKey: ["reminder-queue", monthKey] });
      toast({
        title: "Reminders queued",
        description: `Queued ${count} reminder item(s).`,
      });
    },
    onError: (error) => {
      toast({
        title: "Queue failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

interface UpdateReminderActionPayload {
  id: string;
  monthKey: string;
  action: "sent" | "snooze" | "cancel";
  snoozeHours?: number;
  notes?: string;
}

function computeReminderActionUpdate(payload: UpdateReminderActionPayload): Pick<
  ReminderQueueRow,
  "status" | "scheduled_for" | "sent_at" | "notes"
> {
  const now = new Date();
  if (payload.action === "sent") {
    return {
      status: "sent",
      sent_at: now.toISOString(),
      scheduled_for: null,
      notes: payload.notes ?? null,
    };
  }
  if (payload.action === "snooze") {
    const snoozeHours = Math.max(1, payload.snoozeHours ?? 24);
    const scheduledFor = new Date(now.getTime() + snoozeHours * 60 * 60 * 1000).toISOString();
    return {
      status: "scheduled",
      sent_at: null,
      scheduled_for: scheduledFor,
      notes: payload.notes ?? null,
    };
  }
  return {
    status: "cancelled",
    sent_at: null,
    scheduled_for: null,
    notes: payload.notes ?? null,
  };
}

export function useUpdateReminderAction() {
  const queryClient = useQueryClient();

  return useMutation<ReminderQueueRow, Error, UpdateReminderActionPayload, { previous?: ReminderQueueRow[] }>({
    mutationFn: async (payload) => {
      const userId = await getUserIdOrNull();
      if (!userId) throw new Error("Not authenticated");

      const updates = computeReminderActionUpdate(payload);
      const { data, error } = await supabase
        .from("reminder_queue")
        .update(updates)
        .eq("id", payload.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) throw error;
      return data as ReminderQueueRow;
    },
    onMutate: async (payload) => {
      const queryKey = ["reminder-queue", payload.monthKey];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ReminderQueueRow[]>(queryKey);
      const optimisticUpdate = computeReminderActionUpdate(payload);

      queryClient.setQueryData<ReminderQueueRow[]>(queryKey, (current = []) =>
        current.map((row) =>
          row.id === payload.id
            ? {
                ...row,
                ...optimisticUpdate,
                updated_at: new Date().toISOString(),
              }
            : row
        )
      );

      return { previous };
    },
    onError: (error, payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["reminder-queue", payload.monthKey], context.previous);
      }
      toast({
        title: "Reminder update failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
    onSuccess: (_data, payload) => {
      const actionLabel: Record<UpdateReminderActionPayload["action"], string> = {
        sent: "marked as sent",
        snooze: "snoozed",
        cancel: "cancelled",
      };
      toast({
        title: "Reminder updated",
        description: `Reminder ${actionLabel[payload.action]}.`,
      });
    },
    onSettled: (_data, _error, payload) => {
      queryClient.invalidateQueries({ queryKey: ["reminder-queue", payload.monthKey] });
    },
  });
}

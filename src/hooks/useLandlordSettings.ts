import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";

export interface LandlordSettings {
  /** Paybill, till or account details included in rent reminders. */
  payTo: string;
  /** Name used on exported documents. */
  businessName: string;
}

const EMPTY: LandlordSettings = { payTo: "", businessName: "" };

export function useLandlordSettings() {
  return useQuery<LandlordSettings, Error>({
    queryKey: ["landlord-settings"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) return EMPTY;

      const { data, error } = await supabase
        .from("landlord_settings")
        .select("pay_to, business_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return {
        payTo: data?.pay_to ?? "",
        businessName: data?.business_name ?? "",
      };
    },
  });
}

export function useSaveLandlordSettings() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, LandlordSettings>({
    mutationFn: async (settings) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.from("landlord_settings").upsert(
        {
          user_id: userId,
          pay_to: settings.payTo.trim() || null,
          business_name: settings.businessName.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord-settings"] });
      queryClient.invalidateQueries({ queryKey: ["setup-status"] });
      toast({ title: "Settings saved" });
    },
    onError: (error) => {
      toast({
        title: "Could not save settings",
        description: getSupabaseErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

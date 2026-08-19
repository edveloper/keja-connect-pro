import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTenants } from "@/hooks/useTenants";
import { normalizeMpesaCode } from "@/hooks/usePayments";
import { parseMpesaMessages } from "@/lib/mpesa-parser";
import { matchMpesaPayments, type MatchableTenant } from "@/lib/mpesa-match";
import { formatKES } from "@/lib/number-formatter";
import { currentDateKey, toMonthKey, parseDateKey } from "@/lib/month";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UNASSIGNED = "__unassigned__";

interface PostResult {
  posted: number;
  skipped: number;
  failed: Array<{ code: string; reason: string }>;
}

export function MpesaReconcileDialog({ open, onOpenChange }: Props) {
  const [text, setText] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [isPosting, setIsPosting] = useState(false);
  const [result, setResult] = useState<PostResult | null>(null);

  const { data: tenants = [] } = useTenants();
  const queryClient = useQueryClient();

  const matchableTenants = useMemo<MatchableTenant[]>(
    () =>
      tenants.map((t) => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        unitNumber: t.units?.unit_number ?? null,
        propertyName: t.units?.properties?.name ?? null,
      })),
    [tenants]
  );

  const parsed = useMemo(() => parseMpesaMessages(text), [text]);

  const matches = useMemo(
    () => matchMpesaPayments(parsed.payments, matchableTenants),
    [parsed.payments, matchableTenants]
  );

  // The user's explicit choice always wins over the automatic match.
  const resolved = useMemo(
    () =>
      matches.map((match) => {
        const override = assignments[match.payment.code];
        const tenantId =
          override === UNASSIGNED ? null : override ?? match.tenantId;
        return { ...match, tenantId };
      }),
    [matches, assignments]
  );

  const readyCount = resolved.filter((m) => m.tenantId).length;

  function reset() {
    setText("");
    setAssignments({});
    setResult(null);
  }

  async function handlePost() {
    setIsPosting(true);
    const outcome: PostResult = { posted: 0, skipped: 0, failed: [] };

    for (const match of resolved) {
      if (!match.tenantId) {
        outcome.skipped += 1;
        continue;
      }

      const paidOn = match.payment.paidOn ?? currentDateKey();

      const { error } = await supabase.rpc("record_payment_with_smart_allocation", {
        p_tenant_id: match.tenantId,
        p_amount: match.payment.amount,
        p_payment_month: toMonthKey(parseDateKey(paidOn)),
        p_mpesa_code: normalizeMpesaCode(match.payment.code),
        p_note: match.payment.senderName
          ? `M-Pesa from ${match.payment.senderName}`
          : "Imported from M-Pesa message",
        p_user_id: null,
        p_payment_date: parseDateKey(paidOn).toISOString(),
      });

      if (error) {
        outcome.failed.push({
          code: match.payment.code,
          reason:
            (error as { code?: string }).code === "23505"
              ? "Already recorded"
              : getSupabaseErrorMessage(error),
        });
      } else {
        outcome.posted += 1;
      }
    }

    setIsPosting(false);
    setResult(outcome);

    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["tenant-ledger"] });

    if (outcome.posted > 0) {
      toast({
        title: `${outcome.posted} payment${outcome.posted === 1 ? "" : "s"} recorded`,
        description:
          outcome.failed.length > 0
            ? `${outcome.failed.length} could not be recorded.`
            : undefined,
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record payments from M-Pesa</DialogTitle>
          <DialogDescription>
            Paste the M-Pesa messages from your phone. Each one is matched to a tenant by
            phone number, and you confirm before anything is recorded.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <Alert className="border-emerald-300 bg-emerald-50/60">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <AlertDescription className="text-sm">
                <span className="font-semibold">{result.posted} recorded.</span>{" "}
                {result.skipped > 0 && `${result.skipped} skipped (no tenant assigned). `}
                {result.failed.length > 0 && `${result.failed.length} could not be recorded.`}
              </AlertDescription>
            </Alert>

            {result.failed.length > 0 && (
              <div className="rounded-xl border border-border/60 divide-y">
                {result.failed.map((row) => (
                  <div key={row.code} className="flex justify-between gap-3 p-3 text-sm">
                    <span className="font-mono text-xs">{row.code}</span>
                    <span className="text-muted-foreground">{row.reason}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                Paste more
              </Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mpesa-text" className="text-xs font-bold">
                M-Pesa messages
              </Label>
              <Textarea
                id="mpesa-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder={
                  "TFF4XY9ABC Confirmed.You have received Ksh20,000.00 from JOHN KAMAU 254712345678 on 3/8/26 at 10:30 AM"
                }
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                You can paste several messages at once. Outgoing payments and airtime
                purchases are ignored.
              </p>
            </div>

            {parsed.skipped.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <span className="font-semibold">
                    {parsed.skipped.length} message{parsed.skipped.length === 1 ? "" : "s"} ignored:
                  </span>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {parsed.skipped.slice(0, 4).map((row, i) => (
                      <li key={i}>{row.reason}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {resolved.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">
                    {resolved.length} payment{resolved.length === 1 ? "" : "s"} found
                  </h3>
                  <Badge variant="outline">{readyCount} ready</Badge>
                </div>

                <div className="rounded-xl border border-border/60 divide-y">
                  {resolved.map((match) => {
                    const original = matches.find(
                      (m) => m.payment.code === match.payment.code
                    );
                    return (
                      <div key={match.payment.code} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">
                              {formatKES(match.payment.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {match.payment.senderName || "Unknown sender"}
                              {match.payment.phone ? ` · ${match.payment.phone}` : ""}
                              {match.payment.paidOn ? ` · ${match.payment.paidOn}` : ""}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {match.payment.code}
                            </p>
                          </div>
                          <Badge
                            variant={
                              match.tenantId
                                ? original?.confidence === "phone"
                                  ? "default"
                                  : "secondary"
                                : "destructive"
                            }
                            className="shrink-0"
                          >
                            {match.tenantId ? original?.confidence ?? "manual" : "unmatched"}
                          </Badge>
                        </div>

                        <Select
                          value={match.tenantId ?? UNASSIGNED}
                          onValueChange={(value) =>
                            setAssignments((prev) => ({
                              ...prev,
                              [match.payment.code]: value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Choose a tenant" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED}>Skip this payment</SelectItem>
                            {matchableTenants.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                {tenant.name}
                                {tenant.unitNumber ? ` — Unit ${tenant.unitNumber}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {original && (
                          <p className="text-[11px] text-muted-foreground">{original.reason}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              className="w-full h-11"
              disabled={readyCount === 0 || isPosting}
              onClick={handlePost}
            >
              {isPosting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                `Record ${readyCount} payment${readyCount === 1 ? "" : "s"}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default MpesaReconcileDialog;

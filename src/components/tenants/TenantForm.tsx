import React, { useMemo, useState } from "react";
import { currentDateKey } from "@/lib/month";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/phone-validation";
import { useUnits } from "@/hooks/useUnits";
import { useTenants } from "@/hooks/useTenants";
import { useUserProperties } from "@/hooks/useTenants";
import { toast } from "@/hooks/use-toast";
import { User, Phone, Plus, Calendar as CalendarIcon } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Tenant = Tables<"tenants">;

type TenantWithUnitInfo = Tenant & {
  units?: {
    properties?: { id: string } | null;
  } | null;
};

export type TenantFormPayload = {
  name: string;
  phone: string;
  rent_amount: number;
  unit_id: string;
  opening_balance: number;
  security_deposit: number;
  lease_start: string;
  is_prorated: boolean;
  first_month_override: number | null;
};

interface TenantFormProps {
  tenant?: TenantWithUnitInfo;
  onSubmit: (data: TenantFormPayload, addAnother?: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/** Parse a money input into whole shillings, defaulting to zero. */
function toShillings(value: string): number {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

interface UnitOption {
  id: string;
  property_id: string;
  unit_number: string;
}

export function TenantForm({ tenant, onSubmit, onCancel, isLoading }: TenantFormProps) {
  const [name, setName] = useState<string>(tenant?.name ?? "");
  const [phone, setPhone] = useState<string>(tenant?.phone ?? "");
  const [rentAmount, setRentAmount] = useState<string>(
    tenant?.rent_amount != null ? String(tenant.rent_amount) : ""
  );
  const [openingBalance, setOpeningBalance] = useState<string>(
    tenant?.opening_balance != null ? String(tenant.opening_balance) : "0"
  );
  const [securityDeposit, setSecurityDeposit] = useState<string>(
    tenant?.security_deposit != null ? String(tenant.security_deposit) : "0"
  );
  const [leaseStart, setLeaseStart] = useState<string>(
    tenant?.lease_start ?? currentDateKey()
  );

  const [isProrated, setIsProrated] = useState<boolean>(tenant?.is_prorated ?? false);
  const [firstMonthOverride, setFirstMonthOverride] = useState<string>(
    tenant?.first_month_override != null ? String(tenant.first_month_override) : ""
  );

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    tenant?.units?.properties?.id ?? ""
  );
  const [unitId, setUnitId] = useState<string | null>(tenant?.unit_id ?? null);

  const { data: properties } = useUserProperties();
  const { data: allUnits } = useUnits();
  const { data: allTenants } = useTenants();

  // Units already occupied by someone else. Two tenants on one unit used to be
  // possible, and the dashboard would then silently hide one of them.
  const occupiedUnitIds = useMemo(() => {
    const taken = new Set<string>();
    (allTenants ?? []).forEach((t) => {
      if (t.unit_id && t.id !== tenant?.id) taken.add(t.unit_id);
    });
    return taken;
  }, [allTenants, tenant?.id]);

  const filteredUnits = useMemo(() => {
    if (!selectedPropertyId || !allUnits) return [];
    const units = allUnits as unknown as Array<UnitOption & { is_available?: boolean }>;
    return units.filter((u) => {
      if (u.property_id !== selectedPropertyId) return false;
      // Always keep the unit this tenant already occupies, even if it was
      // marked unavailable, so editing them does not blank their own unit.
      if (u.id === tenant?.unit_id) return true;
      if (u.is_available === false) return false;
      return !occupiedUnitIds.has(u.id);
    });
  }, [selectedPropertyId, allUnits, occupiedUnitIds, tenant?.unit_id]);

  const phoneError = useMemo(() => {
    const value = phone.trim();
    if (value === "") return null;
    return isValidKenyanPhone(value)
      ? null
      : "Enter a Kenyan mobile number, e.g. 0712345678.";
  }, [phone]);

  const rentError = useMemo(() => {
    if (rentAmount.trim() === "") return null;
    const value = Number(rentAmount);
    if (!Number.isFinite(value) || value < 0) return "Enter a valid amount.";
    return null;
  }, [rentAmount]);

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (!unitId) return false;
    if (isProrated && firstMonthOverride.trim() === "") return false;
    if (phoneError || rentError) return false;
    return true;
  }, [name, unitId, isProrated, firstMonthOverride, phoneError, rentError]);

  const handleSubmit = (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter the tenant's name.",
        variant: "destructive",
      });
      return;
    }

    if (!unitId) {
      toast({
        title: "Missing unit",
        description: "Please select a unit.",
        variant: "destructive",
      });
      return;
    }

    if (isProrated && firstMonthOverride.trim() === "") {
      toast({
        title: "Missing first month charge",
        description: "You selected pro rata. Please enter the agreed first month charge.",
        variant: "destructive",
      });
      return;
    }

    if (phoneError) {
      toast({
        title: "Check the phone number",
        description: phoneError,
        variant: "destructive",
      });
      return;
    }

    const normalizedPhone = phone.trim() ? normalizeKenyanPhone(phone) : "";

    const payload: TenantFormPayload = {
      name: name.trim(),
      phone: normalizedPhone,
      // Whole shillings only: the ledger columns are INTEGER, so a fractional
      // value would be rejected or silently truncated by the database.
      rent_amount: toShillings(rentAmount),
      unit_id: unitId,
      opening_balance: toShillings(openingBalance),
      security_deposit: toShillings(securityDeposit),
      lease_start: leaseStart,
      is_prorated: Boolean(isProrated),
      first_month_override: isProrated ? toShillings(firstMonthOverride) || null : null,
    };

    onSubmit(payload, addAnother);
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col h-full max-h-[85vh]">
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        <div className="space-y-4">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Tenant details</Label>

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-11"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-11"
                type="tel"
                inputMode="tel"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? "tenant-phone-error" : undefined}
              />
            </div>
            {phoneError ? (
              <p id="tenant-phone-error" className="text-xs text-destructive">
                {phoneError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Used to match M-Pesa payments and send reminders.
              </p>
            )}
          </div>

          <div className="surface-panel p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold">First month charge</Label>
              <Switch checked={isProrated} onCheckedChange={(v) => setIsProrated(Boolean(v))} />
            </div>

            <div className="text-xs text-muted-foreground">
              If pro rata is enabled, enter the agreed first month charge below. No automatic calculation will be performed.
            </div>

            <div className="space-y-1 mt-2">
              <Label className="text-xs font-bold text-primary">First month charge (landlord input)</Label>
              <Input
                type="number"
                value={firstMonthOverride}
                onChange={(e) => setFirstMonthOverride(e.target.value)}
                className="h-9"
                placeholder={isProrated ? "Enter agreed first month amount" : "Leave blank to use monthly rent"}
                aria-disabled={!isProrated}
                disabled={!isProrated}
              />
            </div>

            <div className="relative mt-2">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-11" type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Monthly rent</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Security deposit</Label>
              <Input type="number" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50/90 p-3">
            <Label className="text-xs font-bold text-amber-700">Opening arrears</Label>
            <Input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="border-amber-200"
            />
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Select
              value={selectedPropertyId}
              onValueChange={(val) => {
                setSelectedPropertyId(val);
                setUnitId(null);
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select Property" />
              </SelectTrigger>
              <SelectContent>
                {properties?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={unitId ?? "none"}
              onValueChange={(v) => setUnitId(v === "none" ? null : v)}
              disabled={!selectedPropertyId}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {selectedPropertyId && filteredUnits.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    Every unit in this property is already occupied.
                  </div>
                )}
                {filteredUnits.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    Unit {u.unit_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-border/60 bg-background pt-4">
        <div className="flex flex-col gap-2">
        {!tenant && (
          <Button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            variant="outline"
            className="w-full h-12"
            disabled={isLoading || !canSave}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another
          </Button>
        )}

        <Button type="submit" disabled={isLoading || !canSave} className="w-full h-12 shadow-md">
          {isLoading ? "Saving..." : "Save tenant"}
        </Button>

        <Button type="button" variant="ghost" onClick={onCancel} className="w-full h-12">
          Cancel
        </Button>
        </div>
      </div>
    </form>
  );
}

export default TenantForm;

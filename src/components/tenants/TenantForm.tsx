import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/phone-validation";
import { useUnits } from "@/hooks/useUnits";
import { useUserProperties } from "@/hooks/useTenants";
import { cn } from "@/lib/utils";
import { User, Phone, Banknote, Building2, Home, Save, Plus, ShieldCheck, History, Calendar as CalendarIcon } from "lucide-react";
import { getDaysInMonth, differenceInDays, endOfMonth, parseISO } from "date-fns";

interface TenantFormProps {
  tenant?: any;
  onSubmit: (data: any, addAnother?: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TenantForm({ tenant, onSubmit, onCancel, isLoading }: TenantFormProps) {
  const [name, setName] = useState(tenant?.name || "");
  const [phone, setPhone] = useState(tenant?.phone || "");
  const [rentAmount, setRentAmount] = useState(tenant?.rent_amount?.toString() || "");
  const [openingBalance, setOpeningBalance] = useState(tenant?.opening_balance?.toString() || "0");
  const [securityDeposit, setSecurityDeposit] = useState(tenant?.security_deposit?.toString() || "0");
  const [leaseStart, setLeaseStart] = useState(tenant?.lease_start || new Date().toISOString().split('T')[0]);
  const [isProrated, setIsProrated] = useState(tenant?.is_prorated ?? true);
  const [firstMonthOverride, setFirstMonthOverride] = useState(tenant?.first_month_override?.toString() || "");
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(tenant?.units?.properties?.id || "");
  const [unitId, setUnitId] = useState<string | null>(tenant?.unit_id || null);

  const { data: properties } = useUserProperties();
  const { data: allUnits } = useUnits();

  // Auto-calculate suggested pro-rata amount
  useEffect(() => {
    if (isProrated && !tenant?.first_month_override && rentAmount && leaseStart) {
      const monthly = parseFloat(rentAmount);
      const start = parseISO(leaseStart);
      const daysInMonth = getDaysInMonth(start);
      const daysRemaining = differenceInDays(endOfMonth(start), start) + 1;
      const suggested = Math.round((monthly / daysInMonth) * daysRemaining);
      setFirstMonthOverride(suggested.toString());
    }
  }, [leaseStart, rentAmount, isProrated]);

  const filteredUnits = useMemo(() => {
    if (!selectedPropertyId || !allUnits) return [];
    return allUnits.filter((u: any) => u.property_id === selectedPropertyId);
  }, [selectedPropertyId, allUnits]);

  const handleSubmit = (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      phone: normalizeKenyanPhone(phone),
      rent_amount: parseInt(rentAmount) || 0,
      unit_id: unitId,
      opening_balance: parseInt(openingBalance) || 0,
      security_deposit: parseInt(securityDeposit) || 0,
      lease_start: leaseStart,
      is_prorated: isProrated,
      first_month_override: isProrated ? parseInt(firstMonthOverride) : null,
    }, addAnother);
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col h-full max-h-[85vh]">
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Tenant Information</Label>
          <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9 h-11" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9 h-11" type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>

          <div className="p-3 bg-muted/30 rounded-lg space-y-3">
            <div className="flex items-center justify-between"><Label className="text-xs font-bold">Pro-rata First Month</Label><Switch checked={isProrated} onCheckedChange={setIsProrated} /></div>
            <div className="relative"><CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9 h-11" type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} required /></div>
            {isProrated && (
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-primary">First Month Charge (Editable)</Label>
                <Input type="number" value={firstMonthOverride} onChange={(e) => setFirstMonthOverride(e.target.value)} className="h-9 border-primary/30" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-[10px] font-bold">Monthly Rent</Label><Input type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} required /></div>
            <div className="space-y-1"><Label className="text-[10px] font-bold">Security Deposit</Label><Input type="number" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} /></div>
          </div>

          <div className="space-y-1 bg-amber-50 p-3 rounded-lg"><Label className="text-[10px] font-bold text-amber-700">Opening Arrears</Label><Input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="border-amber-200" /></div>

          <div className="space-y-3 pt-2 border-t">
            <Select value={selectedPropertyId} onValueChange={(val) => { setSelectedPropertyId(val); setUnitId(null); }}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select Property" /></SelectTrigger>
              <SelectContent>{properties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={unitId || "none"} onValueChange={(v) => setUnitId(v === "none" ? null : v)} disabled={!selectedPropertyId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Select Unit" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Unassigned</SelectItem>{filteredUnits.map((u: any) => (<SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 pt-4 bg-white border-t mt-auto">
        {!tenant && <Button type="button" onClick={(e) => handleSubmit(e, true)} variant="outline" className="w-full h-12"><Plus className="h-4 w-4 mr-2" />Add Another</Button>}
        <Button type="submit" disabled={isLoading || !unitId} className="w-full h-12 shadow-md">{isLoading ? "Saving..." : "Save Tenant"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="w-full h-12">Cancel</Button>
      </div>
    </form>
  );
}
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/phone-validation";
import { useUnits } from "@/hooks/useUnits";
import { useUserProperties } from "@/hooks/useTenants";
import { cn } from "@/lib/utils";
import type { Tables } from '@/integrations/supabase/types';
import { AlertCircle, User, Phone, Banknote, Building2, Home, Save, Plus, ShieldCheck, History } from "lucide-react";

type Tenant = Tables<'tenants'> & { 
  opening_balance?: number; 
  security_deposit?: number; 
};

interface TenantFormProps {
  tenant?: any;
  onSubmit: (data: { 
    name: string; 
    phone: string; 
    rent_amount: number; 
    unit_id: string | null;
    opening_balance: number;
    security_deposit: number;
  }, addAnother?: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TenantForm({ tenant, onSubmit, onCancel, isLoading }: TenantFormProps) {
  const [name, setName] = useState(tenant?.name || "");
  const [phone, setPhone] = useState(tenant?.phone || "");
  const [rentAmount, setRentAmount] = useState(tenant?.rent_amount?.toString() || "");
  const [openingBalance, setOpeningBalance] = useState(tenant?.opening_balance?.toString() || "0");
  const [securityDeposit, setSecurityDeposit] = useState(tenant?.security_deposit?.toString() || "0");
  const [phoneError, setPhoneError] = useState("");
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(tenant?.units?.properties?.id || "");
  const [unitId, setUnitId] = useState<string | null>(tenant?.unit_id || null);

  const { data: properties } = useUserProperties();
  const { data: allUnits } = useUnits();

  const filteredUnits = useMemo(() => {
    if (!selectedPropertyId || !allUnits) return [];
    return allUnits
      .filter((u: any) => u.property_id === selectedPropertyId)
      .sort((a: any, b: any) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }));
  }, [selectedPropertyId, allUnits]);

  const validatePhone = (value: string) => {
    if (!value) { setPhoneError("Phone number is required"); return false; }
    if (!isValidKenyanPhone(value)) { setPhoneError("Invalid format"); return false; }
    setPhoneError(""); return true;
  };

  const handleSubmit = (e: React.FormEvent, addAnother = false) => {
    e.preventDefault();
    if (!name.trim() || !validatePhone(phone)) return;
    
    onSubmit({
      name: name.trim(),
      phone: normalizeKenyanPhone(phone),
      rent_amount: parseInt(rentAmount) || 0,
      unit_id: unitId,
      opening_balance: parseInt(openingBalance) || 0,
      security_deposit: parseInt(securityDeposit) || 0,
    }, addAnother);
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col h-full max-h-[85vh]">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Tenant Information</Label>
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-11" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className={cn("pl-9 h-11", phoneError && "border-destructive")} type="tel" placeholder="Mobile Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              {phoneError && <p className="text-[10px] text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> {phoneError}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Monthly Rent</Label>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-11" type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Security Deposit</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-11" type="number" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-1 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
            <Label className="text-[10px] font-bold uppercase text-amber-700">Opening Arrears (Prior to App)</Label>
            <div className="relative">
              <History className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600" />
              <Input className="pl-9 h-11 border-amber-200 focus-visible:ring-amber-500" type="number" placeholder="0" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
            </div>
            <p className="text-[9px] text-amber-600 italic mt-1">If they already owe you money, enter it here.</p>
          </div>

          <div className="space-y-3 pt-2 border-t border-muted">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Property Assignment</Label>
            <Select value={selectedPropertyId} onValueChange={(val) => { setSelectedPropertyId(val); setUnitId(null); }}>
              <SelectTrigger className="h-11"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><SelectValue placeholder="Select Property" /></div></SelectTrigger>
              <SelectContent>{properties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={unitId || "none"} onValueChange={(v) => setUnitId(v === "none" ? null : v)} disabled={!selectedPropertyId}>
              <SelectTrigger className={cn("h-11", unitId && "border-primary/50 bg-primary/5")}><div className="flex items-center gap-2"><Home className={cn("h-4 w-4", unitId ? "text-primary" : "text-muted-foreground")} /><SelectValue placeholder="Select Unit" /></div></SelectTrigger>
              <SelectContent><SelectItem value="none">Unassigned</SelectItem>{filteredUnits.map((u: any) => (<SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Static Footer (Buttons) */}
      <div className="flex flex-col gap-2 pt-4 bg-white border-t mt-auto">
        {!tenant && (
          <Button type="button" onClick={(e) => handleSubmit(e, true)} disabled={isLoading || !unitId} variant="outline" className="w-full h-12 border-primary/50"><Plus className="h-4 w-4 mr-2" />Save & Add Another</Button>
        )}
        <Button type="submit" disabled={isLoading || !unitId} className="w-full h-12 shadow-md"><Save className="h-4 w-4 mr-2" />{isLoading ? "Saving..." : tenant ? "Update Details" : "Save & Close"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="w-full h-12 text-muted-foreground">Cancel</Button>
      </div>
    </form>
  );
}
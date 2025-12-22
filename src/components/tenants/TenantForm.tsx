import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/phone-validation";
import { useUnits } from "@/hooks/useUnits";
import { useUserProperties } from "@/hooks/useTenants";
import { cn } from "@/lib/utils"; // <--- Add this line here
import type { Tables } from '@/integrations/supabase/types';
import { AlertCircle, User, Phone, Banknote, Building2, Home } from "lucide-react";

type Tenant = Tables<'tenants'>;

interface TenantFormProps {
  tenant?: Tenant & { units?: { id: string; unit_number: string; properties?: { id: string; name: string } | null } | null };
  onSubmit: (data: { name: string; phone: string; rent_amount: number; unit_id: string | null }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TenantForm({ tenant, onSubmit, onCancel, isLoading }: TenantFormProps) {
  const [name, setName] = useState(tenant?.name || "");
  const [phone, setPhone] = useState(tenant?.phone || "");
  const [rentAmount, setRentAmount] = useState(tenant?.rent_amount?.toString() || "");
  const [phoneError, setPhoneError] = useState("");
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(tenant?.units?.properties?.id || "");
  const [unitId, setUnitId] = useState<string | null>(tenant?.unit_id || null);

  const { data: properties } = useUserProperties();
  const { data: allUnits } = useUnits();

  const filteredUnits = useMemo(() => {
    if (!selectedPropertyId || !allUnits) return [];
    return allUnits.filter((u: any) => u.property_id === selectedPropertyId);
  }, [selectedPropertyId, allUnits]);

  const validatePhone = (value: string) => {
    if (!value) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (!isValidKenyanPhone(value)) {
      setPhoneError("Invalid Kenyan format");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !validatePhone(phone)) return;
    
    onSubmit({
      name: name.trim(),
      phone: normalizeKenyanPhone(phone),
      rent_amount: parseInt(rentAmount) || 0,
      unit_id: unitId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-full overflow-x-hidden">
      <div className="space-y-3">
        {/* Basic Info Group */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Tenant Information</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-11" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              className={cn("pl-9 h-11", phoneError && "border-destructive")} 
              type="tel" 
              placeholder="M-Pesa Number (07...)" 
              value={phone} 
              onChange={(e) => { setPhone(e.target.value); if (phoneError) validatePhone(e.target.value); }} 
            />
            {phoneError && <p className="text-[10px] text-destructive mt-1 ml-1 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> {phoneError}</p>}
          </div>

          <div className="relative">
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-11" type="number" placeholder="Monthly Rent" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} required />
          </div>
        </div>

        {/* Assignment Group */}
        <div className="space-y-2 pt-2 border-t border-muted">
          <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">House Assignment</Label>
          
          <div className="grid grid-cols-1 gap-3">
            <Select value={selectedPropertyId} onValueChange={(val) => { setSelectedPropertyId(val); setUnitId(null); }}>
              <SelectTrigger className="h-11">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="Select Property" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {properties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={unitId || "none"} onValueChange={(v) => setUnitId(v === "none" ? null : v)} disabled={!selectedPropertyId}>
              <SelectTrigger className={cn("h-11", unitId && "border-primary/50 bg-primary/5")}>
                <div className="flex items-center gap-2">
                  <Home className={cn("h-4 w-4", unitId ? "text-primary" : "text-muted-foreground")} />
                  <SelectValue placeholder="Select Unit" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {filteredUnits.map((u: any) => <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-4">
        <Button type="submit" disabled={isLoading || !unitId} className="w-full h-12 order-1 sm:order-2 shadow-lg">
          {isLoading ? "Saving..." : tenant ? "Save Changes" : "Assign Tenant"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="w-full h-12 order-2 sm:order-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}
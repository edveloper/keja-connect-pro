import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/phone-validation";
import { useUnits } from "@/hooks/useUnits";
import { useUserProperties } from "@/hooks/useTenants";
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
  
  // State for the two-step selection
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    tenant?.units?.properties?.id || ""
  );
  const [unitId, setUnitId] = useState<string | null>(tenant?.unit_id || null);

  const { data: properties } = useUserProperties();
  const { data: allUnits } = useUnits();

  // Filter units based on selected property
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
      setPhoneError("Use 07xx..., 01xx..., or 254...");
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-semibold">Tenant Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="name"
            placeholder="e.g., John Kamau"
            className="pl-9"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
      </div>
      
      {/* Phone Field */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-semibold">M-Pesa Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="0712 345 678"
            className={`pl-9 ${phoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (phoneError) validatePhone(e.target.value);
            }}
          />
        </div>
        {phoneError && (
          <p className="text-[11px] text-destructive flex items-center gap-1 font-medium">
            <AlertCircle className="h-3 w-3" /> {phoneError}
          </p>
        )}
      </div>
      
      {/* Rent Field */}
      <div className="space-y-2">
        <Label htmlFor="rent" className="text-sm font-semibold">Monthly Rent (KES)</Label>
        <div className="relative">
          <Banknote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="rent"
            type="number"
            placeholder="Amount in KES"
            className="pl-9"
            value={rentAmount}
            onChange={(e) => setRentAmount(e.target.value)}
            required
          />
        </div>
      </div>

      <hr className="my-2 border-muted" />
      
      {/* STEP 1: Property Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> 1. Select Property
        </Label>
        <Select 
          value={selectedPropertyId} 
          onValueChange={(val) => {
            setSelectedPropertyId(val);
            setUnitId(null); // Reset unit when property changes
          }}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Choose which property..." />
          </SelectTrigger>
          <SelectContent>
            {properties?.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* STEP 2: Unit Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Home className="h-4 w-4 text-primary" /> 2. Assign House/Unit
        </Label>
        <Select 
          value={unitId || "none"} 
          onValueChange={(v) => setUnitId(v === "none" ? null : v)}
          disabled={!selectedPropertyId}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder={selectedPropertyId ? "Select unit number" : "Pick a property first"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-muted-foreground italic">None (Unassigned)</SelectItem>
            {filteredUnits.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>
                Unit {u.unit_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!selectedPropertyId && (
          <p className="text-[10px] text-muted-foreground italic">Please select a property to see its units.</p>
        )}
      </div>
      
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !unitId} className="flex-1 shadow-md">
          {isLoading ? "Saving..." : tenant ? "Update Details" : "Add Tenant"}
        </Button>
      </div>
    </form>
  );
}
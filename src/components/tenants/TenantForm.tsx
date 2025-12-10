import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/phone-validation";
import { useUnits } from "@/hooks/useUnits";
import type { Tables } from '@/integrations/supabase/types';
import { AlertCircle } from "lucide-react";

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
  const [unitId, setUnitId] = useState<string | null>(tenant?.unit_id || null);
  const [phoneError, setPhoneError] = useState("");
  
  const { data: units } = useUnits();
  
  // Group units by property
  const unitsByProperty = units?.reduce((acc, unit) => {
    const propertyName = (unit.properties as { name: string } | null)?.name || "Unknown Property";
    if (!acc[propertyName]) {
      acc[propertyName] = [];
    }
    acc[propertyName].push(unit);
    return acc;
  }, {} as Record<string, typeof units>);

  const validatePhone = (value: string) => {
    if (!value) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (!isValidKenyanPhone(value)) {
      setPhoneError("Enter a valid Kenyan phone (e.g., 0712345678)");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    if (!validatePhone(phone)) return;
    
    const rent = parseInt(rentAmount) || 0;
    
    onSubmit({
      name: name.trim(),
      phone: normalizeKenyanPhone(phone),
      rent_amount: rent,
      unit_id: unitId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          placeholder="e.g., John Kamau"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          placeholder="e.g., 0712345678"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (phoneError) validatePhone(e.target.value);
          }}
          onBlur={() => validatePhone(phone)}
          className={phoneError ? "border-destructive" : ""}
        />
        {phoneError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {phoneError}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Kenyan format: 07XX, 01XX, or +254
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="rent">Monthly Rent (KES)</Label>
        <Input
          id="rent"
          type="number"
          placeholder="e.g., 25000"
          value={rentAmount}
          onChange={(e) => setRentAmount(e.target.value)}
          min="0"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="unit">Assign to Unit</Label>
        <Select value={unitId || "none"} onValueChange={(v) => setUnitId(v === "none" ? null : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a unit (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No unit assigned</SelectItem>
            {unitsByProperty && Object.entries(unitsByProperty).map(([property, propertyUnits]) => (
              <div key={property}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                  {property}
                </div>
                {propertyUnits?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    Unit {unit.unit_number}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : tenant ? "Update" : "Add Tenant"}
        </Button>
      </div>
    </form>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { NUMBERING_STYLES, NumberingStyle } from "@/hooks/useProperties";

interface UnitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { unit_number: string; property_id: string }) => void;
  propertyId: string;
  propertyName: string;
  numberingStyle?: NumberingStyle;
  isLoading?: boolean;
}

export function UnitForm({
  open,
  onOpenChange,
  onSubmit,
  propertyId,
  propertyName,
  numberingStyle = "numbers",
  isLoading,
}: UnitFormProps) {
  const [unitNumber, setUnitNumber] = useState("");

  const styleInfo = NUMBERING_STYLES.find((s) => s.value === numberingStyle);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNumber.trim()) return;
    onSubmit({ unit_number: unitNumber.trim(), property_id: propertyId });
    setUnitNumber("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 rounded-2xl border border-border/70 bg-card/95 p-5 shadow-card backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="tracking-tight">Add Unit to {propertyName}</DialogTitle>
          {styleInfo && (
            <DialogDescription className="text-sm">
              Format: <span className="font-medium">{styleInfo.example}</span>
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="surface-panel space-y-2 p-3">
            <Label htmlFor="unit-number">Unit Number *</Label>
            <Input
              id="unit-number"
              className="h-11"
              placeholder={styleInfo?.hint || "e.g., A1, 101"}
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !unitNumber.trim()}>
            {isLoading ? "Adding..." : "Add Unit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

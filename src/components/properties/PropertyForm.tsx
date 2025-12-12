import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NUMBERING_STYLES, NumberingStyle } from "@/hooks/useProperties";

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; address?: string; numbering_style: NumberingStyle; unit_count?: number }) => void;
  isLoading?: boolean;
  defaultValues?: { name: string; address?: string; numbering_style?: NumberingStyle };
  title?: string;
}

// Generate unit numbers based on numbering style
export function generateUnitNumbers(style: NumberingStyle, count: number): string[] {
  const units: string[] = [];
  
  for (let i = 1; i <= count; i++) {
    switch (style) {
      case 'numbers':
        units.push(String(i));
        break;
      case 'letters':
        // A, B, C, ... Z, AA, AB, ...
        units.push(numberToLetters(i));
        break;
      case 'block_unit':
        // A1, A2, A3, ... B1, B2, ...
        const blockIndex = Math.ceil(i / 10);
        const unitInBlock = ((i - 1) % 10) + 1;
        units.push(`${numberToLetters(blockIndex)}${unitInBlock}`);
        break;
      case 'floor_unit':
        // 1A, 1B, ... 2A, 2B, ...
        const floorNum = Math.ceil(i / 4);
        const unitOnFloor = ((i - 1) % 4) + 1;
        units.push(`${floorNum}${numberToLetters(unitOnFloor)}`);
        break;
      default:
        units.push(String(i));
    }
  }
  
  return units;
}

function numberToLetters(n: number): string {
  let result = '';
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

export function PropertyForm({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  defaultValues,
  title = "Add New Property",
}: PropertyFormProps) {
  const [name, setName] = useState(defaultValues?.name || "");
  const [address, setAddress] = useState(defaultValues?.address || "");
  const [numberingStyle, setNumberingStyle] = useState<NumberingStyle>(
    defaultValues?.numbering_style || "numbers"
  );
  const [unitCount, setUnitCount] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const count = unitCount ? parseInt(unitCount, 10) : undefined;
    onSubmit({
      name: name.trim(),
      address: address.trim() || undefined,
      numbering_style: numberingStyle,
      unit_count: count && count > 0 ? count : undefined,
    });
    setName("");
    setAddress("");
    setNumberingStyle("numbers");
    setUnitCount("");
  };

  const previewUnits = unitCount && parseInt(unitCount, 10) > 0 
    ? generateUnitNumbers(numberingStyle, Math.min(parseInt(unitCount, 10), 5))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="property-name">Property Name *</Label>
            <Input
              id="property-name"
              placeholder="e.g., Sunrise Apartments"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="property-address">Address (Optional)</Label>
            <Input
              id="property-address"
              placeholder="e.g., Kilimani, Nairobi"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numbering-style">Unit Numbering Style *</Label>
            <Select value={numberingStyle} onValueChange={(v) => setNumberingStyle(v as NumberingStyle)}>
              <SelectTrigger id="numbering-style">
                <SelectValue placeholder="Select numbering style" />
              </SelectTrigger>
              <SelectContent>
                {NUMBERING_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    <div className="flex flex-col items-start">
                      <span>{style.label}</span>
                      <span className="text-xs text-muted-foreground">{style.example}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit-count">Number of Units (Optional)</Label>
            <Input
              id="unit-count"
              type="number"
              min="0"
              max="100"
              placeholder="e.g., 10"
              value={unitCount}
              onChange={(e) => setUnitCount(e.target.value)}
            />
            {previewUnits.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Preview: {previewUnits.join(", ")}
                {parseInt(unitCount, 10) > 5 && "..."}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !name.trim()}>
            {isLoading ? "Saving..." : "Save Property"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

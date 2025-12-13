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

export interface BlockConfig {
  block: string;
  unitCount: number;
}

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { 
    name: string; 
    address?: string; 
    numbering_style: NumberingStyle; 
    unit_count?: number;
    block_configs?: BlockConfig[];
  }) => void;
  isLoading?: boolean;
  defaultValues?: { name: string; address?: string; numbering_style?: NumberingStyle };
  title?: string;
}

// Generate unit numbers based on numbering style and block configs
export function generateUnitNumbers(
  style: NumberingStyle, 
  count: number, 
  blockConfigs?: BlockConfig[]
): string[] {
  const units: string[] = [];
  
  // For block_unit style with block configs, use the configs
  if (style === 'block_unit' && blockConfigs && blockConfigs.length > 0) {
    blockConfigs.forEach(config => {
      for (let i = 1; i <= config.unitCount; i++) {
        units.push(`${config.block}${i}`);
      }
    });
    return units;
  }
  
  for (let i = 1; i <= count; i++) {
    switch (style) {
      case 'numbers':
        units.push(String(i));
        break;
      case 'letters':
        units.push(numberToLetters(i));
        break;
      case 'block_unit':
        // Default: A1-A10, B1-B10, etc.
        const blockIndex = Math.ceil(i / 10);
        const unitInBlock = ((i - 1) % 10) + 1;
        units.push(`${numberToLetters(blockIndex)}${unitInBlock}`);
        break;
      case 'floor_unit':
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
  const [blockConfigs, setBlockConfigs] = useState<BlockConfig[]>([{ block: "A", unitCount: 10 }]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    let count: number | undefined;
    let configs: BlockConfig[] | undefined;
    
    if (numberingStyle === 'block_unit') {
      // Use block configs
      configs = blockConfigs.filter(b => b.unitCount > 0);
      count = configs.reduce((sum, b) => sum + b.unitCount, 0);
    } else {
      count = unitCount ? parseInt(unitCount, 10) : undefined;
    }
    
    onSubmit({
      name: name.trim(),
      address: address.trim() || undefined,
      numbering_style: numberingStyle,
      unit_count: count && count > 0 ? count : undefined,
      block_configs: configs,
    });
    setName("");
    setAddress("");
    setNumberingStyle("numbers");
    setUnitCount("");
    setBlockConfigs([{ block: "A", unitCount: 10 }]);
  };

  const addBlock = () => {
    const lastBlock = blockConfigs[blockConfigs.length - 1]?.block || "@";
    const nextBlock = String.fromCharCode(lastBlock.charCodeAt(0) + 1);
    setBlockConfigs([...blockConfigs, { block: nextBlock, unitCount: 10 }]);
  };

  const removeBlock = (index: number) => {
    if (blockConfigs.length > 1) {
      setBlockConfigs(blockConfigs.filter((_, i) => i !== index));
    }
  };

  const updateBlockConfig = (index: number, field: keyof BlockConfig, value: string | number) => {
    const updated = [...blockConfigs];
    if (field === 'block') {
      updated[index].block = (value as string).toUpperCase();
    } else {
      updated[index].unitCount = parseInt(value as string, 10) || 0;
    }
    setBlockConfigs(updated);
  };

  const previewUnits = numberingStyle === 'block_unit' 
    ? generateUnitNumbers(numberingStyle, 0, blockConfigs).slice(0, 6)
    : unitCount && parseInt(unitCount, 10) > 0 
      ? generateUnitNumbers(numberingStyle, Math.min(parseInt(unitCount, 10), 5))
      : [];

  const totalUnits = numberingStyle === 'block_unit'
    ? blockConfigs.reduce((sum, b) => sum + (b.unitCount || 0), 0)
    : parseInt(unitCount, 10) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
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
          
          {/* Block configuration for block_unit style */}
          {numberingStyle === 'block_unit' ? (
            <div className="space-y-3">
              <Label>Units per Block</Label>
              <div className="space-y-2">
                {blockConfigs.map((config, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      className="w-16"
                      placeholder="A"
                      value={config.block}
                      onChange={(e) => updateBlockConfig(index, 'block', e.target.value)}
                      maxLength={2}
                    />
                    <span className="text-muted-foreground">:</span>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      placeholder="10"
                      value={config.unitCount || ""}
                      onChange={(e) => updateBlockConfig(index, 'unitCount', e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">units</span>
                    {blockConfigs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBlock(index)}
                        className="px-2 text-destructive hover:text-destructive"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addBlock} className="w-full">
                + Add Block
              </Button>
              {totalUnits > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total: {totalUnits} units • Preview: {previewUnits.join(", ")}{totalUnits > 6 && "..."}
                </p>
              )}
            </div>
          ) : (
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
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading || !name.trim()}>
            {isLoading ? "Saving..." : "Save Property"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

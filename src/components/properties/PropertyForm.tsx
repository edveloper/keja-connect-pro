import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NUMBERING_STYLES, NumberingStyle } from "@/hooks/useProperties";

export interface BlockConfig { block: string; unitCount: number; }

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { 
    name: string; address?: string; numbering_style: NumberingStyle; 
    unit_count?: number; block_configs?: BlockConfig[];
  }) => void;
  isLoading?: boolean;
  defaultValues?: { name: string; address?: string; numbering_style?: NumberingStyle };
  title?: string;
}

export function generateUnitNumbers(style: NumberingStyle, count: number, blockConfigs?: BlockConfig[]): string[] {
  const units: string[] = [];
  if (style === 'block_unit' && blockConfigs && blockConfigs.length > 0) {
    blockConfigs.forEach(config => {
      for (let i = 1; i <= config.unitCount; i++) { units.push(`${config.block}${i}`); }
    });
    return units;
  }
  for (let i = 1; i <= count; i++) {
    switch (style) {
      case 'numbers': units.push(String(i)); break;
      case 'letters': units.push(String.fromCharCode(65 + (i - 1))); break;
      case 'block_unit':
        const bIdx = Math.ceil(i / 10);
        const uInB = ((i - 1) % 10) + 1;
        units.push(`${String.fromCharCode(64 + bIdx)}${uInB}`);
        break;
      case 'floor_unit':
        const floor = Math.ceil(i / 4);
        const uInF = String.fromCharCode(65 + ((i - 1) % 4));
        units.push(`${floor}${uInF}`);
        break;
      default: units.push(String(i));
    }
  }
  return units;
}

export function PropertyForm({ open, onOpenChange, onSubmit, isLoading, defaultValues, title = "Add Property" }: PropertyFormProps) {
  const [name, setName] = useState(defaultValues?.name || "");
  const [address, setAddress] = useState(defaultValues?.address || "");
  const [numberingStyle, setNumberingStyle] = useState<NumberingStyle>(defaultValues?.numbering_style || "numbers");
  const [unitCount, setUnitCount] = useState<string>("");
  const [blockConfigs, setBlockConfigs] = useState<BlockConfig[]>([{ block: "A", unitCount: 10 }]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const configs = numberingStyle === 'block_unit' ? blockConfigs.filter(b => b.unitCount > 0) : undefined;
    const count = numberingStyle === 'block_unit' ? configs?.reduce((s, b) => s + b.unitCount, 0) : (unitCount ? parseInt(unitCount, 10) : undefined);
    
    onSubmit({ name: name.trim(), address: address.trim() || undefined, numbering_style: numberingStyle, unit_count: count, block_configs: configs });
    setName(""); setAddress(""); setUnitCount(""); setNumberingStyle("numbers"); setBlockConfigs([{ block: "A", unitCount: 10 }]);
  };

  const totalUnits = numberingStyle === 'block_unit' ? blockConfigs.reduce((s, b) => s + (b.unitCount || 0), 0) : parseInt(unitCount, 10) || 0;
  const preview = numberingStyle === 'block_unit' ? generateUnitNumbers(numberingStyle, 0, blockConfigs).slice(0, 6) : generateUnitNumbers(numberingStyle, Math.min(totalUnits, 5));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-border/70 bg-card/95 p-5 shadow-card backdrop-blur-md">
        <DialogHeader><DialogTitle className="tracking-tight">{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          
          <div className="surface-panel space-y-2 p-3">
            <Label className="text-xs text-muted-foreground">Quick Formats</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" className="text-[10px] h-7 px-1" onClick={() => { setNumberingStyle('numbers'); setUnitCount("10"); }}>1, 2, 3...</Button>
              <Button type="button" variant="outline" className="text-[10px] h-7 px-1" onClick={() => { setNumberingStyle('block_unit'); setBlockConfigs([{block:"A", unitCount:5},{block:"B", unitCount:5}]); }}>A1, B1...</Button>
              <Button type="button" variant="outline" className="text-[10px] h-7 px-1" onClick={() => { setNumberingStyle('floor_unit'); setUnitCount("8"); }}>1A, 2A...</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Property Name</Label>
            <Input id="name" className="h-11" placeholder="e.g. Blue Sky Apartments" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Style</Label>
            <Select value={numberingStyle} onValueChange={(v) => setNumberingStyle(v as NumberingStyle)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NUMBERING_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex flex-col"><span className="text-sm">{s.label}</span><span className="text-[10px] opacity-70">{s.example}</span></div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {numberingStyle === 'block_unit' ? (
            <div className="surface-panel space-y-2 p-3">
              {blockConfigs.map((c, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input className="w-12 h-8" value={c.block} onChange={(e) => { const u = [...blockConfigs]; u[i].block = e.target.value.toUpperCase(); setBlockConfigs(u); }} maxLength={1} />
                  <Input type="number" className="h-8" value={c.unitCount || ""} onChange={(e) => { const u = [...blockConfigs]; u[i].unitCount = parseInt(e.target.value); setBlockConfigs(u); }} />
                </div>
              ))}
              <Button type="button" variant="link" className="text-xs p-0 h-4" onClick={() => setBlockConfigs([...blockConfigs, {block: "C", unitCount: 5}])}>+ Add Block</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Number of Units</Label>
              <Input className="h-11" type="number" value={unitCount} onChange={(e) => setUnitCount(e.target.value)} placeholder="10" />
            </div>
          )}

          {preview.length > 0 && (
            <div className="text-[11px] p-2 bg-accent/50 rounded-md border border-border">
              <span className="font-semibold block mb-1">Preview:</span>
              <span className="text-muted-foreground">{preview.join(", ")}{totalUnits > 5 ? "..." : ""}</span>
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading || !name.trim()}>Save Property</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ExpenseCategory, useCreateCategory } from "@/hooks/useExpenses";
import { Plus, X, Check, Building2, Home, Tag } from "lucide-react";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  properties: { id: string; name: string }[];
  units: { id: string; unit_number: string; property_id: string }[];
  onSubmit: (data: {
    property_id: string;
    unit_id?: string | null;
    category_id: string;
    amount: number;
    description?: string;
    expense_date?: string;
  }) => void;
  isLoading?: boolean;
}

export function ExpenseForm({
  open,
  onOpenChange,
  categories,
  properties,
  units,
  onSubmit,
  isLoading,
}: ExpenseFormProps) {
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState<string>("none");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const createCategory = useCreateCategory();

  const filteredUnits = units.filter(u => u.property_id === propertyId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !categoryId || !amount) return;
    
    onSubmit({
      property_id: propertyId,
      unit_id: unitId === "none" ? null : unitId,
      category_id: categoryId,
      amount: parseInt(amount, 10),
      description: description.trim() || undefined,
      expense_date: expenseDate,
    });
    
    setPropertyId("");
    setUnitId("none");
    setCategoryId("");
    setAmount("");
    setDescription("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategory.mutate(newCategoryName.trim(), {
      onSuccess: (data) => {
        setCategoryId(data.id);
        setNewCategoryName("");
        setShowNewCategory(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Optimized padding for mobile screens */}
      <DialogContent className="max-w-md w-[95vw] rounded-2xl p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl">Record Expense</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Fill in the details for your property expense.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Property */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Property
              </Label>
              <Select value={propertyId} onValueChange={(v) => { setPropertyId(v); setUnitId("none"); }}>
                <SelectTrigger className="h-11 sm:h-10">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unit */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Home className="h-3 w-3" /> Unit
              </Label>
              <Select value={unitId} onValueChange={setUnitId} disabled={!propertyId}>
                <SelectTrigger className="h-11 sm:h-10">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Property-wide</SelectItem>
                  {filteredUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" /> Category
            </Label>
            {showNewCategory ? (
              <div className="flex gap-2 animate-in fade-in slide-in-from-left-2">
                <Input
                  className="h-11 sm:h-10"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                />
                <Button type="button" size="icon" onClick={handleCreateCategory} disabled={createCategory.isPending}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowNewCategory(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-11 sm:h-10 flex-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 sm:h-10 sm:w-10" onClick={() => setShowNewCategory(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Amount (KES)</Label>
              <Input type="number" className="h-11 sm:h-10" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Date</Label>
              <Input type="date" className="h-11 sm:h-10" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
            <Textarea 
              placeholder="What was this for?" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={2}
              className="resize-none"
            />
          </div>

          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading || !propertyId || !categoryId || !amount}>
            {isLoading ? "Saving..." : "Save Expense"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
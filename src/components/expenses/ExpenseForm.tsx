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
import { Plus } from "lucide-react";

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
    
    // Reset form
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
          <DialogDescription>
            Add a new expense for your property. Fill in the required fields below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Selection */}
          <div className="space-y-2">
            <Label>Property *</Label>
            <Select value={propertyId} onValueChange={(v) => { setPropertyId(v); setUnitId("none"); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Selection (Optional) */}
          {propertyId && (
            <div className="space-y-2">
              <Label>Unit (Optional)</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Property-wide expense" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Property-wide</SelectItem>
                  {filteredUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Category *</Label>
            {showNewCategory ? (
              <div className="flex gap-2">
                <Input
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleCreateCategory}
                  disabled={createCategory.isPending}
                >
                  Add
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowNewCategory(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setShowNewCategory(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount (KES) *</Label>
            <Input
              type="number"
              min="1"
              placeholder="e.g., 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              placeholder="e.g., Plumber fixed kitchen sink"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !propertyId || !categoryId || !amount}
          >
            {isLoading ? "Saving..." : "Save Expense"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
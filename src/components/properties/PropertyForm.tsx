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

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; address?: string }) => void;
  isLoading?: boolean;
  defaultValues?: { name: string; address?: string };
  title?: string;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), address: address.trim() || undefined });
    setName("");
    setAddress("");
  };

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
          <Button type="submit" className="w-full" disabled={isLoading || !name.trim()}>
            {isLoading ? "Saving..." : "Save Property"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

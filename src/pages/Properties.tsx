import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { mockProperties, mockUnits, mockTenants } from "@/stores/mockData";
import { Building2, Plus, Home, Users, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Properties() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState("");
  const [newPropertyAddress, setNewPropertyAddress] = useState("");

  const handleAddProperty = () => {
    if (!newPropertyName.trim()) {
      toast({ title: "Error", description: "Property name is required", variant: "destructive" });
      return;
    }
    
    toast({ 
      title: "Property Added", 
      description: `"${newPropertyName}" has been created. Connect Supabase to persist data.` 
    });
    setNewPropertyName("");
    setNewPropertyAddress("");
    setIsAddOpen(false);
  };

  return (
    <PageContainer title="Properties" subtitle="Manage your properties and units">
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button className="w-full mb-6 h-12 text-base font-semibold">
            <Plus className="h-5 w-5 mr-2" />
            Add Property
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Name</Label>
              <Input
                id="name"
                placeholder="e.g., Sunrise Apartments"
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                placeholder="e.g., Kilimani, Nairobi"
                value={newPropertyAddress}
                onChange={(e) => setNewPropertyAddress(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleAddProperty}>
              Create Property
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {mockProperties.map((property, index) => {
          const propertyUnits = mockUnits.filter(u => u.property_id === property.id);
          const tenantCount = mockTenants.filter(t => 
            propertyUnits.some(u => u.id === t.unit_id)
          ).length;
          
          return (
            <Card 
              key={property.id} 
              className="p-4 animate-slide-up cursor-pointer hover:shadow-md transition-all"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{property.name}</h3>
                  {property.address && (
                    <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Home className="h-4 w-4" />
                      {propertyUnits.length} units
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {tenantCount} tenants
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}

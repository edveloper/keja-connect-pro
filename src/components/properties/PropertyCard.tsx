import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Plus, Home, Users, ChevronDown, Trash2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;
type Unit = Tables<"units">;

interface PropertyCardProps {
  property: Property;
  units: Unit[];
  tenantCounts: Record<string, number>;
  onAddUnit: (propertyId: string, propertyName: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onDeleteProperty: (propertyId: string) => void;
  index: number;
}

export function PropertyCard({
  property,
  units,
  tenantCounts,
  onAddUnit,
  onDeleteUnit,
  onDeleteProperty,
  index,
}: PropertyCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [deletePropertyOpen, setDeletePropertyOpen] = useState(false);

  const propertyUnits = units.filter((u) => u.property_id === property.id);
  const totalTenants = propertyUnits.reduce(
    (sum, unit) => sum + (tenantCounts[unit.id] || 0),
    0
  );

  return (
    <>
      <Card
        className="animate-slide-up overflow-hidden"
        style={{ animationDelay: `${index * 75}ms` }}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {property.name}
                  </h3>
                  {property.address && (
                    <p className="text-sm text-muted-foreground truncate">
                      {property.address}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Home className="h-4 w-4" />
                      {propertyUnits.length} units
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {totalTenants} tenants
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Units</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddUnit(property.id, property.name)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Unit
                </Button>
              </div>
              {propertyUnits.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No units yet. Add your first unit.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {propertyUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{unit.unit_number}</span>
                        {tenantCounts[unit.id] ? (
                          <Badge variant="secondary" className="text-xs">
                            {tenantCounts[unit.id]} tenant
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Vacant
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteUnitId(unit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeletePropertyOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Property
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Delete Unit Dialog */}
      <AlertDialog open={!!deleteUnitId} onOpenChange={() => setDeleteUnitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this unit. Any tenants assigned to this unit will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteUnitId) onDeleteUnit(deleteUnitId);
                setDeleteUnitId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Property Dialog */}
      <AlertDialog open={deletePropertyOpen} onOpenChange={setDeletePropertyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{property.name}" and all its units. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDeleteProperty(property.id);
                setDeletePropertyOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

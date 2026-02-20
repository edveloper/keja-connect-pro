import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Building2, Plus, Home, Users, ChevronDown, Trash2, Pencil } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;
type Unit = Tables<"units">;

interface PropertyCardProps {
  property: Property;
  units: Unit[];
  tenantCounts: Record<string, number>;
  onAddUnit: (propertyId: string, propertyName: string, numberingStyle?: string) => void;
  onEditProperty: (property: Property) => void;
  onEditUnit: (unitId: string, unitNumber: string) => void;
  onToggleUnitAvailability: (unitId: string, isAvailable: boolean) => void;
  onDeleteUnit: (unitId: string) => void;
  onDeleteProperty: (propertyId: string) => void;
  index: number;
}

export function PropertyCard({
  property,
  units,
  tenantCounts,
  onAddUnit,
  onEditProperty,
  onEditUnit,
  onToggleUnitAvailability,
  onDeleteUnit,
  onDeleteProperty,
  index,
}: PropertyCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [deletePropertyOpen, setDeletePropertyOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitNumber, setEditingUnitNumber] = useState("");

  // Natural sorting for unit numbers within this property.
  const propertyUnits = useMemo(() => {
    return units
      .filter((u) => u.property_id === property.id)
      .sort((a, b) => 
        a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [units, property.id]);

  const totalTenants = propertyUnits.reduce(
    (sum, unit) => sum + (tenantCounts[unit.id] || 0),
    0
  );
  const locationLine = [
    property.street_address || property.address,
    property.neighborhood,
    property.town_city,
    property.county,
  ]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Card
        className="animate-slide-up overflow-hidden border-border/50"
        style={{ animationDelay: `${index * 75}ms` }}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div
              className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onDoubleClick={(e) => {
                e.stopPropagation();
                onEditProperty(property);
              }}
              title="Double-click to edit property"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate text-base">
                    {property.name}
                  </h3>
                  {locationLine && (
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {locationLine}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Home className="h-3.5 w-3.5" />
                      {propertyUnits.length} units
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {totalTenants} tenants
                    </span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditProperty(property);
                  }}
                  aria-label={`Edit ${property.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Unit List</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddUnit(property.id, property.name, property.numbering_style || undefined);
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Unit
                </Button>
              </div>
              
              {propertyUnits.length === 0 ? (
                <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed">
                  <p className="text-xs text-muted-foreground">No units added yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {propertyUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/50 shadow-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {editingUnitId === unit.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingUnitNumber}
                              onChange={(e) => setEditingUnitNumber(e.target.value)}
                              className="h-7 w-20 text-xs"
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!editingUnitNumber.trim()) return;
                                onEditUnit(unit.id, editingUnitNumber.trim());
                                setEditingUnitId(null);
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-foreground truncate">#{unit.unit_number}</span>
                        )}
                        {!unit.is_available ? (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 uppercase border-amber-300 text-amber-700 bg-amber-50">
                            Unavailable
                          </Badge>
                        ) : tenantCounts[unit.id] ? (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 uppercase">
                            Full
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 uppercase text-success border-success/30 bg-success/5">
                            Vacant
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingUnitId(unit.id);
                            setEditingUnitNumber(unit.unit_number);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleUnitAvailability(unit.id, !unit.is_available);
                          }}
                        >
                          {unit.is_available ? "Mark Unavailable" : "Mark Available"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteUnitId(unit.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-9 text-xs font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletePropertyOpen(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete Property
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* AlertDialogs remain the same... */}
      <AlertDialog open={!!deleteUnitId} onOpenChange={() => setDeleteUnitId(null)}>
        <AlertDialogContent className="max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete this unit. Tenants will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <AlertDialogCancel className="w-full rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

      <AlertDialog open={deletePropertyOpen} onOpenChange={setDeletePropertyOpen}>
        <AlertDialogContent className="max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{property.name}" and all units.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <AlertDialogCancel className="w-full rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDeleteProperty(property.id);
                setDeletePropertyOpen(false);
              }}
            >
              Delete Property
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

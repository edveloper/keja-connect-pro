import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ShowMore, useProgressiveList } from "@/components/ui/show-more";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ChevronDown, Trash2, Pencil, MoreVertical, DoorOpen, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKES } from "@/lib/number-formatter";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;
type Unit = Tables<"units">;

/** Who is in each unit, so the list can answer "who lives in A3?". */
export interface UnitOccupant {
  id: string;
  name: string;
  rent: number;
  owes: number;
}

interface PropertyCardProps {
  property: Property;
  units: Unit[];
  occupantsByUnit: Map<string, UnitOccupant>;
  onAddUnit: (propertyId: string, propertyName: string, numberingStyle?: string) => void;
  onEditProperty: (property: Property) => void;
  onEditUnit: (unitId: string, unitNumber: string) => void;
  onToggleUnitAvailability: (unitId: string, isAvailable: boolean) => void;
  onDeleteUnit: (unitId: string) => void;
  onDeleteProperty: (propertyId: string) => void;
  onOpenTenant?: (tenantId: string) => void;
}

export function PropertyCard({
  property,
  units,
  occupantsByUnit,
  onAddUnit,
  onEditProperty,
  onEditUnit,
  onToggleUnitAvailability,
  onDeleteUnit,
  onDeleteProperty,
  onOpenTenant,
}: PropertyCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [deletePropertyOpen, setDeletePropertyOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitNumber, setEditingUnitNumber] = useState("");

  const propertyUnits = useMemo(
    () =>
      units
        .filter((u) => u.property_id === property.id)
        .sort((a, b) =>
          a.unit_number.localeCompare(b.unit_number, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        ),
    [units, property.id]
  );

  const unitPage = useProgressiveList(propertyUnits, { resetKey: property.id });

  const stats = useMemo(() => {
    let occupied = 0;
    let rentRoll = 0;
    let arrears = 0;
    propertyUnits.forEach((u) => {
      const occupant = occupantsByUnit.get(u.id);
      if (!occupant) return;
      occupied += 1;
      rentRoll += occupant.rent;
      arrears += Math.max(0, occupant.owes);
    });
    return { occupied, rentRoll, arrears, vacant: propertyUnits.length - occupied };
  }, [propertyUnits, occupantsByUnit]);

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
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="flex items-start gap-2 p-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{property.name}</h3>
            {locationLine && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{locationLine}</p>
            )}
          </div>

          {/* Editing a property used to require a double-click on the card, with
              a tooltip nobody sees. On a phone a double-tap is zoom, so on the
              main device the action did not exist at all. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                aria-label={`Actions for ${property.name}`}
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEditProperty(property)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit property
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onAddUnit(property.id, property.name, property.numbering_style || undefined)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add units
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeletePropertyOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete property
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* What this building is actually doing, without opening it. */}
        <dl className="grid grid-cols-3 gap-px bg-border border-y border-border">
          <div className="bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">Occupied</dt>
            <dd className="text-sm font-semibold tabular-nums mt-0.5">
              {stats.occupied} of {propertyUnits.length}
            </dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">Rent roll</dt>
            <dd className="text-sm font-semibold tabular-nums mt-0.5">
              {formatKES(stats.rentRoll)}
            </dd>
          </div>
          <div className="bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">Arrears</dt>
            <dd
              className={cn(
                "text-sm font-semibold tabular-nums mt-0.5",
                stats.arrears > 0 && "text-destructive"
              )}
            >
              {formatKES(stats.arrears)}
            </dd>
          </div>
        </dl>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/40 transition-colors">
            <span className="text-sm font-medium">
              {isOpen ? "Hide" : "Show"} {propertyUnits.length}{" "}
              {propertyUnits.length === 1 ? "unit" : "units"}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                isOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-t border-border">
              {propertyUnits.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    No units in this property yet.
                  </p>
                  <Button
                    size="sm"
                    onClick={() =>
                      onAddUnit(property.id, property.name, property.numbering_style || undefined)
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add units
                  </Button>
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-border">
                    {unitPage.visible.map((unit) => {
                      const occupant = occupantsByUnit.get(unit.id);
                      const isEditing = editingUnitId === unit.id;

                      return (
                        <li key={unit.id} className="flex items-center gap-3 px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Input
                                value={editingUnitNumber}
                                onChange={(e) => setEditingUnitNumber(e.target.value)}
                                className="h-9 flex-1 min-w-0"
                                autoFocus
                                aria-label="Unit number"
                              />
                              <Button
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                aria-label="Save unit number"
                                onClick={() => {
                                  if (!editingUnitNumber.trim()) return;
                                  onEditUnit(unit.id, editingUnitNumber.trim());
                                  setEditingUnitId(null);
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 shrink-0"
                                aria-label="Cancel"
                                onClick={() => setEditingUnitId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-semibold text-sm w-14 shrink-0 tabular-nums">
                                {unit.unit_number}
                              </span>

                              <div className="min-w-0 flex-1">
                                {occupant ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpenTenant?.(occupant.id)}
                                    className="text-sm truncate text-left hover:underline underline-offset-2 max-w-full"
                                  >
                                    {occupant.name}
                                  </button>
                                ) : (
                                  <span
                                    className={cn(
                                      "text-sm",
                                      unit.is_available
                                        ? "text-success"
                                        : "text-muted-foreground"
                                    )}
                                  >
                                    {unit.is_available ? "Vacant" : "Not available"}
                                  </span>
                                )}
                                {occupant && occupant.owes > 0 && (
                                  <span className="block text-xs text-destructive tabular-nums">
                                    owes {formatKES(occupant.owes)}
                                  </span>
                                )}
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 shrink-0 text-muted-foreground"
                                    aria-label={`Actions for unit ${unit.unit_number}`}
                                  >
                                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingUnitId(unit.id);
                                      setEditingUnitNumber(unit.unit_number);
                                    }}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Rename unit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      onToggleUnitAvailability(unit.id, !unit.is_available)
                                    }
                                  >
                                    <DoorOpen className="mr-2 h-4 w-4" />
                                    {unit.is_available
                                      ? "Mark not available"
                                      : "Mark available"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteUnitId(unit.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete unit
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {unitPage.hasMore && (
                    <div className="px-4 py-3 border-t border-border">
                      <ShowMore
                        remaining={unitPage.remaining}
                        noun="unit"
                        onClick={unitPage.showMore}
                      />
                    </div>
                  )}

                  <div className="px-4 py-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        onAddUnit(property.id, property.name, property.numbering_style || undefined)
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                      Add more units
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <AlertDialog
        open={Boolean(deleteUnitId)}
        onOpenChange={(open) => !open && setDeleteUnitId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this unit?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUnitId && occupantsByUnit.get(deleteUnitId)
                ? `${occupantsByUnit.get(deleteUnitId)?.name} is living here. Move them out first, or their record goes too.`
                : "This removes the unit permanently."}
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
              Delete unit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletePropertyOpen} onOpenChange={setDeletePropertyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {property.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {propertyUnits.length > 0
                ? `This removes the property and all ${propertyUnits.length} of its units${
                    stats.occupied > 0
                      ? `, including ${stats.occupied} occupied by tenants whose records will go with them`
                      : ""
                  }.`
                : "This removes the property permanently."}
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
              Delete property
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PropertyCard;

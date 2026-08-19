import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { PropertyForm, generateUnitNumbers, BlockConfig } from "@/components/properties/PropertyForm";
import { UnitForm } from "@/components/properties/UnitForm";
import { PropertyCard, type UnitOccupant } from "@/components/properties/PropertyCard";
import { useTenantBalances } from "@/hooks/useTenantBalances";
import { formatKES } from "@/lib/number-formatter";
import { cn } from "@/lib/utils";
import { useProperties, useCreateProperty, useDeleteProperty, useUpdateProperty, NumberingStyle } from "@/hooks/useProperties";
import { useUnits, useCreateUnit, useDeleteUnit, useBulkCreateUnits, useUpdateUnit } from "@/hooks/useUnits";
import { useTenants } from "@/hooks/useTenants";
import { Plus, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/integrations/supabase/types";

type Property = Tables<"properties">;

export default function Properties() {
  const navigate = useNavigate();
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // ?new=1 lets the setup checklist land the user straight in the form.
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setIsAddPropertyOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("new");
        return next;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams]);
  const [addUnitTarget, setAddUnitTarget] = useState<{ id: string; name: string; numberingStyle?: string } | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: units, isLoading: unitsLoading } = useUnits();
  const { data: tenants } = useTenants();
  
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();
  const createUnit = useCreateUnit();
  const bulkCreateUnits = useBulkCreateUnits();
  const deleteUnit = useDeleteUnit();
  const updateUnit = useUpdateUnit();

  // Natural Sorting for Units
  const sortedUnits = useMemo(() => {
    if (!units) return [];
    return [...units].sort((a, b) => 
      a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [units]);

  const rentByTenant = useMemo(() => {
    const map = new Map<string, number>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.rent_amount ?? 0));
    return map;
  }, [tenants]);

  const { data: balances } = useTenantBalances(rentByTenant);

  /**
   * Who is in each unit. The list used to show only a count and a Full/Vacant
   * badge, so it could not answer the question a landlord actually opens this
   * screen with: who lives in A3?
   */
  const occupantsByUnit = useMemo(() => {
    const map = new Map<string, UnitOccupant>();
    (tenants ?? []).forEach((t) => {
      if (!t.unit_id) return;
      map.set(t.unit_id, {
        id: t.id,
        name: t.name,
        rent: t.rent_amount ?? 0,
        owes: balances?.get(t.id)?.balance ?? 0,
      });
    });
    return map;
  }, [tenants, balances]);

  const portfolio = useMemo(() => {
    let occupied = 0;
    let rentRoll = 0;
    let arrears = 0;
    occupantsByUnit.forEach((o) => {
      occupied += 1;
      rentRoll += o.rent;
      arrears += Math.max(0, o.owes);
    });
    return { occupied, rentRoll, arrears, units: units?.length ?? 0 };
  }, [occupantsByUnit, units]);

  const handleAddProperty = (data: { 
    name: string; 
    address?: string; 
    street_address?: string;
    neighborhood?: string;
    town_city?: string;
    county?: string;
    landmark?: string;
    postal_code?: string;
    numbering_style: NumberingStyle; 
    unit_count?: number;
    block_configs?: BlockConfig[];
  }) => {
    createProperty.mutate(
      {
        name: data.name,
        address: data.address,
        street_address: data.street_address,
        neighborhood: data.neighborhood,
        town_city: data.town_city,
        county: data.county,
        landmark: data.landmark,
        postal_code: data.postal_code,
        numbering_style: data.numbering_style,
      },
      {
        onSuccess: (newProperty) => {
          if (data.unit_count && data.unit_count > 0) {
            const unitNumbers = generateUnitNumbers(data.numbering_style, data.unit_count, data.block_configs);
            const unitsToCreate = unitNumbers.map((unit_number) => ({
              property_id: newProperty.id,
              unit_number,
            }));
            bulkCreateUnits.mutate(unitsToCreate, {
              onSuccess: () => setIsAddPropertyOpen(false),
            });
          } else {
            setIsAddPropertyOpen(false);
          }
        },
      }
    );
  };

  const handleAddUnit = (data: { unit_number: string; property_id: string }) => {
    createUnit.mutate(data, {
      onSuccess: () => setAddUnitTarget(null),
    });
  };

  const isLoading = propertiesLoading || unitsLoading;
  const isCreating = createProperty.isPending || bulkCreateUnits.isPending;

  return (
    <PageContainer title="Properties" subtitle="Buildings, units and who is in them">
      {(properties?.length ?? 0) > 0 && (
        <section className="surface-panel mb-4 overflow-hidden">
          <dl className="grid grid-cols-3 gap-px bg-border">
            <div className="bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">Units</dt>
              <dd className="text-sm font-semibold tabular-nums mt-0.5">
                {portfolio.occupied} of {portfolio.units} let
              </dd>
            </div>
            <div className="bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">Rent roll</dt>
              <dd className="text-sm font-semibold tabular-nums mt-0.5">
                {formatKES(portfolio.rentRoll)}
              </dd>
            </div>
            <div className="bg-card px-4 py-3">
              <dt className="text-xs text-muted-foreground">Arrears</dt>
              <dd
                className={cn(
                  "text-sm font-semibold tabular-nums mt-0.5",
                  portfolio.arrears > 0 && "text-destructive"
                )}
              >
                {formatKES(portfolio.arrears)}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <Button className="w-full mb-5" onClick={() => setIsAddPropertyOpen(true)}>
        <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
        Add property
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : properties?.length === 0 ? (
        <div className="surface-panel text-center py-12 px-4">
          <Building2 className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-semibold">No properties yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Start with the building or plot your houses are in.
          </p>
          <Button onClick={() => setIsAddPropertyOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add your first property
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {properties?.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              units={sortedUnits}
              occupantsByUnit={occupantsByUnit}
              onAddUnit={(id, name, numberingStyle) => setAddUnitTarget({ id, name, numberingStyle })}
              onEditProperty={(p) => setEditingProperty(p)}
              onEditUnit={(unitId, unitNumber) => updateUnit.mutate({ id: unitId, unit_number: unitNumber })}
              onToggleUnitAvailability={(unitId, isAvailable) => updateUnit.mutate({ id: unitId, is_available: isAvailable })}
              onDeleteUnit={(uId) => deleteUnit.mutate(uId)}
              onDeleteProperty={(pId) => deleteProperty.mutate(pId)}
              onOpenTenant={(tenantId) => navigate(`/tenants?tenantId=${tenantId}`)}
            />
          ))}
        </div>
      )}

      <PropertyForm
        open={isAddPropertyOpen}
        onOpenChange={setIsAddPropertyOpen}
        onSubmit={handleAddProperty}
        isLoading={isCreating}
      />

      {editingProperty && (
        <PropertyForm
          open={!!editingProperty}
          onOpenChange={(open) => {
            if (!open) setEditingProperty(null);
          }}
          defaultValues={{
            name: editingProperty.name,
            address: editingProperty.address ?? "",
            street_address: editingProperty.street_address ?? "",
            neighborhood: editingProperty.neighborhood ?? "",
            town_city: editingProperty.town_city ?? "",
            county: editingProperty.county ?? "",
            landmark: editingProperty.landmark ?? "",
            postal_code: editingProperty.postal_code ?? "",
            numbering_style: (editingProperty.numbering_style as NumberingStyle) ?? "numbers",
          }}
          title="Edit property"
          onSubmit={(data) => {
            updateProperty.mutate(
              {
                id: editingProperty.id,
                name: data.name,
                address: data.address,
                street_address: data.street_address,
                neighborhood: data.neighborhood,
                town_city: data.town_city,
                county: data.county,
                landmark: data.landmark,
                postal_code: data.postal_code,
                numbering_style: data.numbering_style,
              },
              {
                onSuccess: () => setEditingProperty(null),
              }
            );
          }}
          isLoading={updateProperty.isPending}
        />
      )}

      {addUnitTarget && (
        <UnitForm
          open={!!addUnitTarget}
          onOpenChange={() => setAddUnitTarget(null)}
          onSubmit={handleAddUnit}
          propertyId={addUnitTarget.id}
          propertyName={addUnitTarget.name}
          numberingStyle={addUnitTarget.numberingStyle as NumberingStyle}
          isLoading={createUnit.isPending}
        />
      )}
    </PageContainer>
  );
}

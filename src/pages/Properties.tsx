import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { PropertyForm, generateUnitNumbers, BlockConfig } from "@/components/properties/PropertyForm";
import { UnitForm } from "@/components/properties/UnitForm";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { useProperties, useCreateProperty, useDeleteProperty, NumberingStyle } from "@/hooks/useProperties";
import { useUnits, useCreateUnit, useDeleteUnit, useBulkCreateUnits } from "@/hooks/useUnits";
import { useTenants } from "@/hooks/useTenants";
import { Plus, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Properties() {
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [addUnitTarget, setAddUnitTarget] = useState<{ id: string; name: string; numberingStyle?: string } | null>(null);

  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: units, isLoading: unitsLoading } = useUnits();
  const { data: tenants } = useTenants();
  
  const createProperty = useCreateProperty();
  const deleteProperty = useDeleteProperty();
  const createUnit = useCreateUnit();
  const bulkCreateUnits = useBulkCreateUnits();
  const deleteUnit = useDeleteUnit();

  // Calculate tenant counts per unit
  const tenantCounts: Record<string, number> = {};
  tenants?.forEach((tenant) => {
    if (tenant.unit_id) {
      tenantCounts[tenant.unit_id] = (tenantCounts[tenant.unit_id] || 0) + 1;
    }
  });

  const handleAddProperty = (data: { 
    name: string; 
    address?: string; 
    numbering_style: NumberingStyle; 
    unit_count?: number;
    block_configs?: BlockConfig[];
  }) => {
    createProperty.mutate(
      { name: data.name, address: data.address, numbering_style: data.numbering_style },
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
    <PageContainer title="Properties" subtitle="Manage your properties and units">
      <Button
        className="w-full mb-6 h-12 text-base font-semibold"
        onClick={() => setIsAddPropertyOpen(true)}
      >
        <Plus className="h-5 w-5 mr-2" />
        Add Property
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : properties?.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-4 rounded-full bg-muted inline-block mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No properties yet</h3>
          <p className="text-muted-foreground mt-1">
            Add your first property to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {properties?.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              units={units || []}
              tenantCounts={tenantCounts}
              onAddUnit={(id, name, numberingStyle) => setAddUnitTarget({ id, name, numberingStyle })}
              onDeleteUnit={(unitId) => deleteUnit.mutate(unitId)}
              onDeleteProperty={(propertyId) => deleteProperty.mutate(propertyId)}
              index={index}
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

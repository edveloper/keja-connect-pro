// src/components/tenants/types.ts

export interface PaymentDialogTenant {
  tenant_id: string;
  tenant_name: string;
  unit_number: string;
  property_name: string | null;
  balance: number;
}

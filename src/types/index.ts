export interface Property {
  id: string;
  name: string;
  address?: string;
  created_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  unit_id: string;
  name: string;
  phone: string;
  rent_amount: number;
  created_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  payment_date: string;
  payment_month: string; // Format: "2024-01"
  mpesa_code?: string;
  created_at: string;
}

export interface UnitWithDetails extends Unit {
  property?: Property;
  tenant?: Tenant;
  current_month_payment?: Payment;
}

export interface ParsedPayment {
  phone: string;
  amount: number;
  mpesaCode?: string;
  rawText: string;
}

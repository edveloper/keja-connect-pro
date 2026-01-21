// src/types/index.ts
// ============================================================================
// KEJA-CONNECT: Complete TypeScript Types
// ============================================================================
// This replaces your existing src/types/index.ts
// It includes both basic types and extended types for dashboard/UI

import type { Database } from '@/integrations/supabase/types';

// ============================================================================
// BASE TYPES (from Supabase schema)
// ============================================================================

// Extract table types from Supabase generated types
export type Property = Database['public']['Tables']['properties']['Row'];
export type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
export type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export type Unit = Database['public']['Tables']['units']['Row'];
export type UnitInsert = Database['public']['Tables']['units']['Insert'];
export type UnitUpdate = Database['public']['Tables']['units']['Update'];

export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
export type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export type Charge = Database['public']['Tables']['charges']['Row'];
export type ChargeInsert = Database['public']['Tables']['charges']['Insert'];
export type ChargeUpdate = Database['public']['Tables']['charges']['Update'];

export type PaymentAllocation = Database['public']['Tables']['payment_allocations']['Row'];
export type PaymentAllocationInsert = Database['public']['Tables']['payment_allocations']['Insert'];
export type PaymentAllocationUpdate = Database['public']['Tables']['payment_allocations']['Update'];

export type Expense = Database['public']['Tables']['expenses']['Row'];
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];

export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];
export type ExpenseCategoryInsert = Database['public']['Tables']['expense_categories']['Insert'];
export type ExpenseCategoryUpdate = Database['public']['Tables']['expense_categories']['Update'];

// ============================================================================
// CHARGE TYPES
// ============================================================================

export type ChargeType = 'rent' | 'opening_balance' | 'utility' | 'penalty' | 'maintenance' | 'other';

export interface ChargeWithDetails extends Charge {
  tenant?: Tenant;
  is_paid?: boolean;
  allocated_amount?: number;
  remaining_amount?: number;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface PaymentWithAllocations extends Payment {
  allocations: PaymentAllocation[];
  tenant?: Tenant;
  unit?: Unit;
}

export interface PaymentAllocationWithDetails extends PaymentAllocation {
  payment?: Payment;
  charge?: Charge;
}

// ============================================================================
// TENANT BALANCE & LEDGER
// ============================================================================

export interface TenantBalance {
  tenant_id: string;
  tenant_name: string;
  total_charges: number;
  total_allocated: number;
  balance: number;
  charges_breakdown?: ChargeBreakdown[];
  allocations_breakdown?: AllocationBreakdown[];
}

export interface ChargeBreakdown {
  id: string;
  type: ChargeType;
  amount: number;
  charge_month: string;
  note: string | null;
  allocated_amount?: number;
  remaining_amount?: number;
}

export interface AllocationBreakdown {
  id: string;
  payment_id: string;
  amount: number;
  applied_month: string;
  payment_date?: string;
}

export interface TenantLedgerEntry {
  date: string;
  type: 'charge' | 'payment';
  description: string;
  charge_amount?: number;
  payment_amount?: number;
  balance: number;
  reference?: string; // charge_id or payment_id
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overpaid';

export interface DashboardUnit {
  // Unit info
  id: string;
  unit_number: string;
  property_id: string;
  property_name: string;
  
  // Tenant info
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  rent_amount: number | null;
  
  // Financial status
  payment_status: PaymentStatus;
  total_charges: number;
  total_allocated: number;
  balance: number;
  
  // Current month specific
  current_month_charges?: number;
  current_month_allocated?: number;
}

export interface DashboardStats {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  
  // Financial
  totalCharges: number;
  totalAllocated: number;
  totalBalance: number;
  totalDeposits: number;
  
  // Current month specific
  currentMonthCharges?: number;
  currentMonthAllocated?: number;
  currentMonthBalance?: number;
}

export interface DashboardResult {
  units: DashboardUnit[];
  stats: DashboardStats;
}

// ============================================================================
// EXTENDED TYPES (with relations)
// ============================================================================

export interface UnitWithDetails extends Unit {
  property?: Property;
  tenant?: Tenant;
  tenants?: Tenant[]; // For historical tenants
}

export interface TenantWithDetails extends Tenant {
  unit?: Unit;
  property?: Property;
  balance?: TenantBalance;
  recent_payments?: Payment[];
}

export interface PropertyWithDetails extends Property {
  units?: UnitWithDetails[];
  total_units?: number;
  occupied_units?: number;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface TenantFormData {
  name: string;
  phone: string;
  unit_id: string;
  rent_amount: number;
  lease_start: string;
  security_deposit?: number;
  opening_balance?: number;
  first_month_override?: number;
  is_prorated?: boolean;
}

export interface PaymentFormData {
  tenant_id: string;
  amount: number;
  payment_month: string;
  payment_date?: string;
  mpesa_code?: string;
  note?: string;
}

export interface ChargeFormData {
  tenant_id: string;
  amount: number;
  charge_month: string;
  type: ChargeType;
  note?: string;
}

export interface PropertyFormData {
  name: string;
  address?: string;
  numbering_style?: string;
}

export interface UnitFormData {
  property_id: string;
  unit_number: string;
}

export interface ExpenseFormData {
  property_id: string;
  unit_id?: string;
  category_id: string;
  amount: number;
  expense_date: string;
  expense_month: string;
  description?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface BalanceCalculationResult {
  total_charges: number;
  total_allocated: number;
  balance: number;
  charges_breakdown: ChargeBreakdown[];
  allocations_breakdown: AllocationBreakdown[];
}

export interface PaymentAllocationResult {
  payment_id: string;
  allocations: {
    charge_id: string | null;
    charge_month: string;
    charge_type: ChargeType | 'credit';
    amount_allocated: number;
  }[];
  remaining_credit: number;
}

export interface DashboardSummaryResult {
  total_units: number;
  occupied_units: number;
  total_charges: number;
  total_allocated: number;
  total_balance: number;
  total_deposits: number;
  tenants_breakdown: {
    tenant_id: string;
    tenant_name: string;
    total_charges: number;
    total_allocated: number;
    balance: number;
  }[];
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface MonthlyFinancialReport {
  month: string;
  revenue: {
    rent_collected: number;
    other_income: number;
    total: number;
  };
  expenses: {
    by_category: Record<string, number>;
    total: number;
  };
  profit: {
    gross: number;
    net: number;
  };
  outstanding: {
    total_arrears: number;
    tenants_with_arrears: number;
  };
}

export interface TenantReport {
  tenant_id: string;
  tenant_name: string;
  unit_number: string;
  property_name: string;
  lease_start: string;
  rent_amount: number;
  security_deposit: number;
  balance: number;
  payment_history: {
    month: string;
    charged: number;
    paid: number;
    balance: number;
  }[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface ParsedMpesaPayment {
  phone: string;
  amount: number;
  mpesaCode?: string;
  rawText: string;
}

export interface MonthOption {
  value: string; // Format: 'YYYY-MM'
  label: string; // Format: 'January 2024'
}

export interface FilterOptions {
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CHARGE_TYPES: Record<ChargeType, string> = {
  rent: 'Rent',
  opening_balance: 'Opening Balance',
  utility: 'Utility',
  penalty: 'Penalty/Late Fee',
  maintenance: 'Maintenance',
  other: 'Other',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
  overpaid: 'Overpaid',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  unpaid: 'bg-red-100 text-red-800 border-red-200',
  overpaid: 'bg-blue-100 text-blue-800 border-blue-200',
};
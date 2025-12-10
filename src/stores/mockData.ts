import { Property, Unit, Tenant, Payment, UnitWithDetails } from "@/types";

// Mock data for demo purposes - will be replaced with Supabase
export const mockProperties: Property[] = [
  { id: "1", name: "Sunrise Apartments", address: "Kilimani, Nairobi", created_at: new Date().toISOString() },
  { id: "2", name: "Green Valley Flats", address: "Westlands, Nairobi", created_at: new Date().toISOString() },
];

export const mockUnits: Unit[] = [
  { id: "u1", property_id: "1", unit_number: "A1", created_at: new Date().toISOString() },
  { id: "u2", property_id: "1", unit_number: "A2", created_at: new Date().toISOString() },
  { id: "u3", property_id: "1", unit_number: "A3", created_at: new Date().toISOString() },
  { id: "u4", property_id: "1", unit_number: "B1", created_at: new Date().toISOString() },
  { id: "u5", property_id: "2", unit_number: "101", created_at: new Date().toISOString() },
  { id: "u6", property_id: "2", unit_number: "102", created_at: new Date().toISOString() },
];

export const mockTenants: Tenant[] = [
  { id: "t1", unit_id: "u1", name: "John Kamau", phone: "0712345678", rent_amount: 25000, created_at: new Date().toISOString() },
  { id: "t2", unit_id: "u2", name: "Mary Wanjiku", phone: "0723456789", rent_amount: 25000, created_at: new Date().toISOString() },
  { id: "t3", unit_id: "u4", name: "Peter Ochieng", phone: "0734567890", rent_amount: 30000, created_at: new Date().toISOString() },
  { id: "t4", unit_id: "u5", name: "Jane Muthoni", phone: "0745678901", rent_amount: 35000, created_at: new Date().toISOString() },
  { id: "t5", unit_id: "u6", name: "David Kiprop", phone: "0756789012", rent_amount: 35000, created_at: new Date().toISOString() },
];

// Current month format
const currentMonth = new Date().toISOString().slice(0, 7);

export const mockPayments: Payment[] = [
  { id: "p1", tenant_id: "t1", amount: 25000, payment_date: new Date().toISOString(), payment_month: currentMonth, mpesa_code: "RLC123ABC", created_at: new Date().toISOString() },
  { id: "p2", tenant_id: "t4", amount: 35000, payment_date: new Date().toISOString(), payment_month: currentMonth, mpesa_code: "RLC456DEF", created_at: new Date().toISOString() },
];

export function getUnitsWithDetails(): UnitWithDetails[] {
  return mockUnits.map(unit => {
    const property = mockProperties.find(p => p.id === unit.property_id);
    const tenant = mockTenants.find(t => t.unit_id === unit.id);
    const currentMonthPayment = tenant 
      ? mockPayments.find(p => p.tenant_id === tenant.id && p.payment_month === currentMonth)
      : undefined;
    
    return {
      ...unit,
      property,
      tenant,
      current_month_payment: currentMonthPayment,
    };
  });
}

export function getStats() {
  const units = getUnitsWithDetails();
  const occupiedUnits = units.filter(u => u.tenant);
  const paidUnits = occupiedUnits.filter(u => u.current_month_payment);
  
  return {
    totalUnits: units.length,
    occupiedUnits: occupiedUnits.length,
    paidUnits: paidUnits.length,
    arrearsUnits: occupiedUnits.length - paidUnits.length,
    totalCollected: mockPayments
      .filter(p => p.payment_month === currentMonth)
      .reduce((sum, p) => sum + p.amount, 0),
  };
}

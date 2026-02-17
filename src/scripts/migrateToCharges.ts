// src/scripts/migrateToCharges.ts
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, parseISO, differenceInMonths, format } from 'date-fns';

interface MigrationResult {
  tenantId: string;
  tenantName: string;
  openingBalanceCharge?: string;
  rentChargesCreated: number;
  paymentsAllocated: number;
  errors: string[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

export async function migrateToChargesSystem(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  try {
    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 2. Get all tenants for this user's properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('user_id', user.id);

    if (!properties || properties.length === 0) {
      console.log('No properties found');
      return results;
    }

    const propertyIds = properties.map(p => p.id);

    const { data: units } = await supabase
      .from('units')
      .select('id')
      .in('property_id', propertyIds);

    if (!units || units.length === 0) {
      console.log('No units found');
      return results;
    }

    const unitIds = units.map(u => u.id);

    const { data: tenants } = await supabase
      .from('tenants')
      .select('*')
      .in('unit_id', unitIds);

    if (!tenants || tenants.length === 0) {
      console.log('No tenants found');
      return results;
    }

    // 3. For each tenant, create charges and allocate payments
    for (const tenant of tenants) {
      const result: MigrationResult = {
        tenantId: tenant.id,
        tenantName: tenant.name,
        rentChargesCreated: 0,
        paymentsAllocated: 0,
        errors: [],
      };

      try {
        // A. Create opening balance charge if exists
        if (tenant.opening_balance && tenant.opening_balance > 0) {
          const leaseMonth = tenant.lease_start 
            ? format(parseISO(tenant.lease_start), 'yyyy-MM')
            : format(new Date(), 'yyyy-MM');

          const { data: obCharge, error: obError } = await supabase.rpc(
            'create_opening_balance_charge',
            {
              p_tenant_id: tenant.id,
              p_amount: tenant.opening_balance,
              p_effective_month: leaseMonth,
              p_note: 'Opening balance - migrated from legacy system'
            }
          );

          if (obError) {
            // Check if it's because opening balance already exists
            if (!obError.message.includes('already exists')) {
              result.errors.push(`Opening balance: ${obError.message}`);
            }
          } else {
            result.openingBalanceCharge = obCharge ?? undefined;
          }
        }

        // B. Generate rent charges from lease start to current month
        if (tenant.lease_start) {
          const leaseStart = parseISO(tenant.lease_start);
          const currentMonth = startOfMonth(new Date());
          const monthsToGenerate = differenceInMonths(currentMonth, startOfMonth(leaseStart)) + 1;

          for (let i = 0; i < monthsToGenerate; i++) {
            const targetDate = new Date(leaseStart);
            targetDate.setMonth(targetDate.getMonth() + i);
            const targetMonth = format(targetDate, 'yyyy-MM');

            // Determine amount for this month
            let chargeAmount = tenant.rent_amount;
            
            // First month special handling
            if (i === 0 && tenant.first_month_override) {
              chargeAmount = tenant.first_month_override;
            }

            // Check if charge already exists
            const { data: existingCharge } = await supabase
              .from('charges')
              .select('id')
              .eq('tenant_id', tenant.id)
              .eq('charge_month', targetMonth)
              .eq('type', 'rent')
              .single();

            if (!existingCharge) {
              const { error: chargeError } = await supabase
                .from('charges')
                .insert({
                  tenant_id: tenant.id,
                  amount: chargeAmount,
                  charge_month: targetMonth,
                  type: 'rent',
                  note: i === 0 ? 'First month rent (migrated)' : 'Monthly rent (migrated)'
                });

              if (chargeError) {
                result.errors.push(`Charge ${targetMonth}: ${chargeError.message}`);
              } else {
                result.rentChargesCreated++;
              }
            }
          }
        }

        // C. Get all payments for this tenant
        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('payment_month', { ascending: true });

        if (payments && payments.length > 0) {
          // D. For each payment, create allocations using smart allocation
          for (const payment of payments) {
            // Check if allocations already exist for this payment
            const { data: existingAllocations } = await supabase
              .from('payment_allocations')
              .select('id')
              .eq('payment_id', payment.id);

            if (!existingAllocations || existingAllocations.length === 0) {
              // Use the smart allocation function to allocate this payment
              const { error: allocError } = await supabase.rpc(
                'record_payment_with_smart_allocation',
                {
                  p_tenant_id: payment.tenant_id,
                  p_amount: payment.amount,
                  p_payment_month: payment.payment_month,
                  p_payment_date: payment.payment_date,
                  p_mpesa_code: payment.mpesa_code,
                  p_note: payment.note,
                  p_user_id: user.id
                }
              );

              if (allocError) {
                result.errors.push(`Payment ${payment.id}: ${allocError.message}`);
              } else {
                result.paymentsAllocated++;
              }
            }
          }
        }

      } catch (err: unknown) {
        result.errors.push(`General error: ${getErrorMessage(err)}`);
      }

      results.push(result);
    }

    return results;

  } catch (err: unknown) {
    console.error('Migration failed:', err);
    throw err;
  }
}

// Helper function to run migration from console
export async function runMigration() {
  console.log('🚀 Starting migration to charges-based system...');
  
  try {
    const results = await migrateToChargesSystem();
    
    console.log('\n✅ Migration complete!\n');
    console.log('📊 Results:');
    
    results.forEach(result => {
      console.log(`\n👤 ${result.tenantName} (${result.tenantId})`);
      if (result.openingBalanceCharge) {
        console.log(`   ✓ Opening balance charge created`);
      }
      console.log(`   ✓ Rent charges created: ${result.rentChargesCreated}`);
      console.log(`   ✓ Payments allocated: ${result.paymentsAllocated}`);
      if (result.errors.length > 0) {
        console.log(`   ⚠️  Errors:`, result.errors);
      }
    });

    const totalCharges = results.reduce((sum, r) => sum + r.rentChargesCreated, 0);
    const totalAllocations = results.reduce((sum, r) => sum + r.paymentsAllocated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log('\n📈 Summary:');
    console.log(`   Total tenants migrated: ${results.length}`);
    console.log(`   Total charges created: ${totalCharges}`);
    console.log(`   Total payment allocations: ${totalAllocations}`);
    console.log(`   Total errors: ${totalErrors}`);

  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

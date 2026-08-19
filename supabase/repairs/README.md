# Data repairs

Scripts in this folder are **not** migrations. `supabase db push` ignores them.
They rewrite existing financial records, so each one is run deliberately, once,
after you have read what it does and looked at its preview output.

Run them only after the three `20260817*` migrations have been applied.

| Script | What it does | When you need it |
| --- | --- | --- |
| `01_shift_charge_months.sql` | Moves every existing `charge_month` and `applied_month` forward by one month | If your data was created before the F1 timezone fix — which is all data created by the app to date |
| `02_remove_future_charges.sql` | Deletes rent charges dated after the current month | If a tenant statement shows a month that has not happened yet |

> **Run `01` at most once.** The billing migration already backfills correct
> months, so shifting again moves those rows into the future. If you see a
> future month on a statement, that is what happened — run `02` to clear it.

## Do you need `01_shift_charge_months.sql`?

Every rent charge the app has ever written was labelled one month early, because
month keys were derived with `toISOString()` in a UTC+3 timezone. Balances are
internally consistent (charges and allocations were both shifted by the same
amount), but the month labels are wrong: a January charge is filed under
December, and the current month is always missing.

The new billing job will correctly add the months that are missing. It will not
relabel the ones that are already there. So without this repair you will have
both the old shifted rows and the new correct ones, and a tenant's ledger will
show roughly double the months it should.

Run the preview first. If the "before" column matches what you know about your
tenants' actual lease months, you do not need the repair. If everything is
consistently one month early, run it.

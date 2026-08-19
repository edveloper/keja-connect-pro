import { useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { MonthSelector } from "@/components/layout/MonthSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Wallet, Search, X } from "lucide-react";

import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import {
  useExpenses,
  useExpenseCategories,
  useCreateExpense,
  useDeleteExpense,
} from "@/hooks/useExpenses";
import { useProperties } from "@/hooks/useProperties";
import { useUnits } from "@/hooks/useUnits";

import { formatKES } from "@/lib/number-formatter";
import { toMonthKey, parseDateKey } from "@/lib/month";
import { format } from "date-fns";

export default function Expenses() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");

  const monthKey = selectedDate ? toMonthKey(selectedDate) : null;

  const { data: expenses, isLoading } = useExpenses(monthKey);
  const { data: categories } = useExpenseCategories();
  const { data: properties } = useProperties();
  const { data: units } = useUnits();

  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const dateLabel = selectedDate ? format(selectedDate, "MMMM yyyy") : "All time";

  const rows = useMemo(
    () =>
      (expenses ?? []).map((e) => ({
        id: e.id,
        amount: Number(e.amount) || 0,
        date: e.expense_date,
        category: e.expense_categories?.name ?? "Other",
        property: e.properties?.name ?? null,
        unit: e.units?.unit_number ?? null,
        description: e.description ?? "",
      })),
    [expenses]
  );

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  /** Where the money actually went, largest first. */
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.category, (map.get(r.category) ?? 0) + r.amount));
    return [...map.entries()]
      .map(([name, amount]) => ({ name, amount, share: total > 0 ? amount / total : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [rows, total]);

  const propertyNames = useMemo(() => {
    const names = new Set<string>();
    rows.forEach((r) => r.property && names.add(r.property));
    return [...names].sort();
  }, [rows]);

  const visible = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
        if (propertyFilter !== "all" && r.property !== propertyFilter) return false;
        if (!term) return true;
        return (
          r.description.toLowerCase().includes(term) ||
          r.category.toLowerCase().includes(term) ||
          (r.unit ?? "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [rows, searchTerm, categoryFilter, propertyFilter]);

  const page = useProgressiveList(visible, {
    resetKey: `${monthKey}-${searchTerm}-${categoryFilter}-${propertyFilter}`,
  });

  const filteredTotal = visible.reduce((sum, r) => sum + r.amount, 0);
  const isFiltered =
    categoryFilter !== "all" || propertyFilter !== "all" || searchTerm.trim() !== "";

  return (
    <PageContainer title="Expenses" subtitle={dateLabel}>
      <MonthSelector value={selectedDate} onChange={setSelectedDate} allTimeLabel="All time" />

      {/* Recording a cost is the most repeated action on this screen, so it
          sits above the summary rather than tucked into its corner. */}
      <Button className="w-full h-12 mb-4" onClick={() => setIsAddOpen(true)}>
        <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
        Add an expense
      </Button>

      <section className="surface-panel p-4 mb-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Spent {selectedDate ? "this month" : "in total"}</p>
            <p className="text-2xl font-bold tabular-nums mt-1">{formatKES(total)}</p>
          </div>
          <p className="text-sm text-muted-foreground shrink-0">
            {rows.length} {rows.length === 1 ? "entry" : "entries"}
          </p>
        </div>

        {byCategory.length > 0 && (
          <dl className="mt-4 pt-4 border-t border-border space-y-2">
            {byCategory.slice(0, 4).map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <dt className="text-sm min-w-0 flex-1 truncate">{c.name}</dt>
                {/* A share bar, so the biggest cost is obvious without reading. */}
                <div className="h-1.5 w-16 bg-muted rounded-sm overflow-hidden shrink-0">
                  <div
                    className="h-full bg-foreground/60"
                    style={{ width: `${Math.round(c.share * 100)}%` }}
                  />
                </div>
                <dd className="text-sm font-semibold tabular-nums shrink-0 w-24 text-right">
                  {formatKES(c.amount)}
                </dd>
              </div>
            ))}
            {byCategory.length > 4 && (
              <p className="text-xs text-muted-foreground pt-1">
                and {byCategory.length - 4} more{" "}
                {byCategory.length - 4 === 1 ? "category" : "categories"}
              </p>
            )}
          </dl>
        )}
      </section>

      {rows.length > 0 && (
        <div className="space-y-3 mb-5">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search description, category or unit"
              className="pl-10 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-xs" aria-label="Filter by category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {byCategory.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {propertyNames.length > 1 && (
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="h-9 text-xs" aria-label="Filter by property">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All properties</SelectItem>
                  {propertyNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {isFiltered && (
            <p className="text-xs text-muted-foreground">
              {visible.length} of {rows.length} shown ·{" "}
              <span className="font-semibold tabular-nums">{formatKES(filteredTotal)}</span>
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </>
        ) : visible.length === 0 ? (
          <div className="surface-panel px-6 py-12 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" aria-hidden="true" />
            {rows.length === 0 ? (
              <>
                <p className="text-sm font-semibold">
                  Nothing recorded {selectedDate ? "this month" : "yet"}
                </p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  Repairs, water, security, garbage — logging them is what makes your net
                  income figure real.
                </p>
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add an expense
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Nothing matches</p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  Try a different search, or clear the filters.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                    setPropertyFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {page.visible.map((row) => (
              <div
                key={row.id}
                className="border border-border rounded-lg bg-card px-4 py-3 flex items-start gap-3 transition-colors hover:border-foreground/25"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{row.category}</span>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {format(parseDateKey(row.date), "d MMM")}
                    </span>
                  </div>
                  {row.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {row.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {row.unit ? `Unit ${row.unit}` : "Whole property"}
                    {row.property ? ` · ${row.property}` : ""}
                  </p>
                </div>

                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {formatKES(row.amount)}
                </span>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 -mr-2 text-muted-foreground hover:text-destructive"
                  onClick={() => setExpenseToDelete(row.id)}
                  disabled={deleteExpense.isPending}
                  aria-label={`Remove ${row.category} expense`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}

            {page.hasMore && (
              <ShowMore
                remaining={page.remaining}
                noun="expense"
                onClick={page.showMore}
                className="w-full mt-2"
              />
            )}
          </>
        )}
      </div>

      <ExpenseForm
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        categories={categories || []}
        properties={properties || []}
        units={units || []}
        onSubmit={(data) => createExpense.mutate(data, { onSuccess: () => setIsAddOpen(false) })}
        isLoading={createExpense.isPending}
      />

      <AlertDialog
        open={Boolean(expenseToDelete)}
        onOpenChange={(open) => !open && setExpenseToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              It comes off your totals for {dateLabel}, so your net income figure will change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!expenseToDelete) return;
                deleteExpense.mutate(expenseToDelete, {
                  onSettled: () => setExpenseToDelete(null),
                });
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

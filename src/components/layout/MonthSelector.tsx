import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, format, subMonths } from "date-fns";
import { toMonthKey, currentMonthKey } from "@/lib/month";

interface Props {
  /** The month being viewed, or null for the all-time view. */
  value: Date | null;
  onChange: (value: Date | null) => void;
  /** Label for the all-time view, e.g. "All-Time Expenses". */
  allTimeLabel?: string;
}

/**
 * Month navigator shared by the Dashboard, Reports and Expenses pages.
 *
 * Forward navigation stops at the current month: future months have no charges
 * and no payments, so every figure reads zero and every tenant looks paid.
 */
export function MonthSelector({ value, onChange, allTimeLabel = "All-Time Overview" }: Props) {
  const label = value ? format(value, "MMMM yyyy") : allTimeLabel;
  const atCurrentMonth = value ? toMonthKey(value) >= currentMonthKey() : false;

  return (
    <div className="surface-panel flex items-center justify-between mb-6 p-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(value ? subMonths(value, 1) : new Date())}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5 text-muted-foreground" />
      </Button>

      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <h2 className="font-bold text-sm sm:text-base text-foreground">{label}</h2>
        </div>
        <button
          type="button"
          onClick={() => onChange(value ? null : new Date())}
          className="text-xs text-primary font-bold uppercase tracking-wider mt-0.5 hover:underline"
        >
          {value ? "Switch to All-Time" : "Back to Monthly View"}
        </button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        disabled={atCurrentMonth}
        onClick={() => onChange(value ? addMonths(value, 1) : new Date())}
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Button>
    </div>
  );
}

export default MonthSelector;

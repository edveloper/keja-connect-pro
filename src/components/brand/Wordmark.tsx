import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** Show the strapline underneath. */
  withTagline?: boolean;
}

/**
 * The RentKonnect wordmark.
 *
 * The K is set in the accent and slightly heavier, so the spelling reads as a
 * deliberate mark rather than a typo — the two K's become a repeated form
 * instead of an oddity to explain.
 */
export function Wordmark({ className, withTagline = false }: Props) {
  return (
    <div className={cn("select-none", className)}>
      <p className="font-bold tracking-tight leading-none text-foreground">
        Rent<span className="text-primary">K</span>onne<span className="text-primary">c</span>t
      </p>
      {withTagline && (
        <p className="eyebrow mt-2">Every shilling accounted for</p>
      )}
    </div>
  );
}

/**
 * Square mark for tight spaces — the two K forms locked together.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-foreground text-background font-bold",
        className
      )}
      aria-hidden="true"
    >
      <span className="text-primary">R</span>K
    </span>
  );
}

export default Wordmark;

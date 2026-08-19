import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Building2, DoorOpen, Users, Smartphone, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { SetupStatus } from "@/hooks/useSetupStatus";
import type { LucideIcon } from "lucide-react";

interface Props {
  status: SetupStatus;
  /** Called when the landlord dismisses the card. */
  onDismiss?: () => void;
}

interface Step {
  n: 1 | 2 | 3 | 4;
  icon: LucideIcon;
  title: string;
  detail: string;
  cta: string;
  route: string;
  optional?: boolean;
}

const STEPS: Step[] = [
  {
    n: 1,
    icon: Building2,
    title: "Add a property",
    detail: "The building or plot your houses are in. You can add more later.",
    cta: "Add property",
    route: "/properties?new=1",
  },
  {
    n: 2,
    icon: DoorOpen,
    title: "Add the units",
    detail: "The individual houses. RentKonnect can number them for you in one go.",
    cta: "Add units",
    route: "/properties",
  },
  {
    n: 3,
    icon: Users,
    title: "Add your first tenant",
    detail:
      "Their rent and lease start date. Rent is then charged automatically every month, including any months already gone by.",
    cta: "Add tenant",
    route: "/tenants?new=1",
  },
  {
    n: 4,
    icon: Smartphone,
    title: "Say where tenants should pay",
    detail:
      "A paybill, a till, or just your M-Pesa number. It gets added to the end of every rent reminder so tenants do not have to ask.",
    cta: "Add payment details",
    route: "/settings",
    optional: true,
  },
];

/**
 * The first thing a new landlord sees, in place of a dashboard full of zeroes.
 *
 * Three required steps and one optional one. The card is dismissible, and the
 * caller removes it entirely once a tenant exists — a permanent nag about an
 * optional step would be worse than not asking at all, and plenty of small
 * landlords collect rent on a personal number and have no paybill to enter.
 */
export function SetupChecklist({ status, onDismiss }: Props) {
  const navigate = useNavigate();

  const done = (step: Step) => {
    if (step.n === 1) return status.properties > 0;
    if (step.n === 2) return status.units > 0;
    if (step.n === 3) return status.tenants > 0;
    return status.hasPayTo;
  };

  const required = STEPS.filter((s) => !s.optional);
  const requiredDone = required.filter(done).length;

  return (
    <Card className="p-5 mb-6 relative">
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-9 w-9 text-muted-foreground"
          onClick={onDismiss}
          aria-label="Hide setup guide"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <div className="mb-4 pr-8">
        <h2 className="text-lg font-bold tracking-tight">
          {status.isEmpty ? "Let's get you set up" : "Nearly there"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {status.isEmpty
            ? "Three steps and RentKonnect starts tracking rent for you. It takes a few minutes."
            : `${requiredDone} of ${required.length} steps done.`}
        </p>
      </div>

      <ol className="space-y-1">
        {STEPS.map((step) => {
          const isDone = done(step);
          const isCurrent = !isDone && step.n === status.currentStep;

          return (
            <li
              key={step.n}
              className={cn(
                "flex gap-3 rounded-lg p-3 transition-colors",
                isCurrent && "bg-accent/60"
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                  isDone
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary/15 text-primary ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                )}
                aria-hidden="true"
              >
                {isDone ? <Check className="h-4 w-4" /> : step.n}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isDone && "text-muted-foreground line-through decoration-1"
                  )}
                >
                  {step.title}
                  {step.optional && !isDone && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      optional
                    </span>
                  )}
                </p>

                {!isDone && <p className="text-sm text-muted-foreground mt-0.5">{step.detail}</p>}

                {isCurrent && (
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <Button size="sm" className="h-9" onClick={() => navigate(step.route)}>
                      <step.icon className="h-4 w-4 mr-1.5" />
                      {step.cta}
                    </Button>
                    {step.optional && onDismiss && (
                      <Button variant="ghost" size="sm" className="h-9" onClick={onDismiss}>
                        Skip
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {status.isEmpty && (
        <div className="mt-4 pt-4 border-t border-border/60">
          <p className="text-sm text-muted-foreground mb-2">
            Already keeping records in a spreadsheet?
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Import a spreadsheet instead
          </Button>
        </div>
      )}
    </Card>
  );
}

export default SetupChecklist;

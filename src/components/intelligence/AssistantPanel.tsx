import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AssistantActionItem } from "@/lib/assistantQueue";

interface AssistantPanelProps {
  title?: string;
  subtitle?: string;
  stats?: Array<{ label: string; value: string }>;
  actions: AssistantActionItem[];
  onAction: (route: string) => void;
  storageKey?: string;
}

function priorityVariant(priority: AssistantActionItem["priority"]): "destructive" | "secondary" | "outline" {
  if (priority === "high") return "destructive";
  if (priority === "medium") return "secondary";
  return "outline";
}

export function AssistantPanel({
  title = "Landlord Assistant",
  subtitle = "Prioritized actions for today",
  stats = [],
  actions,
  onAction,
  storageKey,
}: AssistantPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setDismissedIds(parsed);
    } catch {
      // no-op: ignore malformed localStorage
    }
  }, [storageKey]);

  const visibleActions = useMemo(
    () => actions.filter((action) => !dismissedIds.includes(action.id)),
    [actions, dismissedIds]
  );

  const persistDismissedIds = (next: string[]) => {
    setDismissedIds(next);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const dismissAction = (id: string) => {
    if (dismissedIds.includes(id)) return;
    persistDismissedIds([...dismissedIds, id]);
  };

  const clearDismissed = () => {
    persistDismissedIds([]);
  };

  return (
    <Card className="p-4 sm:p-5 border-border/70">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
            Intelligence Actions
          </p>
          <h3 className="font-bold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{visibleActions.length} action(s)</Badge>
          {dismissedIds.length > 0 ? (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={clearDismissed}>
              Show Dismissed
            </Button>
          ) : null}
        </div>
      </div>

      {stats.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-border/60 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-sm font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        {visibleActions.map((action) => (
          <div
            key={action.id}
            className="rounded-xl border border-border/60 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold truncate">{action.title}</p>
                <Badge variant={priorityVariant(action.priority)}>{action.priority}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{action.detail}</p>
            </div>
            <div className="flex w-full sm:w-auto gap-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onAction(action.route)}
              >
                {action.ctaLabel}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => dismissAction(action.id)}
              >
                Done
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

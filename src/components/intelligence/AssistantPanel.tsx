import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssistantActionItem } from "@/lib/assistantQueue";

interface AssistantPanelProps {
  actions: AssistantActionItem[];
  onAction: (route: string) => void;
  storageKey?: string;
}

/**
 * The to-do list, as a plain list.
 *
 * The previous version led with an "Intelligence Actions" eyebrow and the
 * subtitle "Prioritized actions for today", counted items as "3 action(s)", and
 * printed the raw priority enum — "high", "medium", "low" — straight onto
 * badges for the user to read. All of it vendor voice rather than landlord
 * voice.
 */
export function AssistantPanel({ actions, onAction, storageKey }: AssistantPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setDismissedIds(parsed);
    } catch {
      // Malformed storage is not worth failing over.
    }
  }, [storageKey]);

  const visible = useMemo(
    () => actions.filter((a) => !dismissedIds.includes(a.id)),
    [actions, dismissedIds]
  );

  const persist = (next: string[]) => {
    setDismissedIds(next);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
  };

  if (visible.length === 0) {
    return (
      <div className="border border-border rounded-lg p-5 text-center">
        <p className="text-sm font-medium">Nothing outstanding</p>
        <p className="text-xs text-muted-foreground mt-1">
          You have cleared everything on this list.
        </p>
        {dismissedIds.length > 0 && (
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => persist([])}>
            Bring back hidden items
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
      {visible.map((action) => (
        <div
          key={action.id}
          className={cn(
            "p-4 border-l-2",
            action.priority === "high"
              ? "border-l-destructive"
              : action.priority === "medium"
                ? "border-l-warning"
                : "border-l-border"
          )}
        >
          <p className="text-sm font-semibold">{action.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{action.detail}</p>

          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={() => onAction(action.route)}>
              {action.ctaLabel}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => persist([...dismissedIds, action.id])}
            >
              Hide
            </Button>
          </div>
        </div>
      ))}

      {dismissedIds.length > 0 && (
        <div className="p-3 bg-muted/40">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => persist([])}>
            Bring back {dismissedIds.length} hidden{" "}
            {dismissedIds.length === 1 ? "item" : "items"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default AssistantPanel;

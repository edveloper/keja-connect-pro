export type AssistantPriority = "high" | "medium" | "low";

export interface AssistantActionItem {
  id: string;
  priority: AssistantPriority;
  title: string;
  detail: string;
  ctaLabel: string;
  route: string;
}

interface BuildAssistantQueueParams {
  collectionRate: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalBalance: number;
  pendingReminders: number;
  highRiskCount: number;
  topOverdueTenantId?: string;
}

export function buildAssistantQueue(params: BuildAssistantQueueParams): AssistantActionItem[] {
  const items: AssistantActionItem[] = [];

  if (params.highRiskCount > 0) {
    items.push({
      id: "high-risk-tenants",
      priority: "high",
      title: "Review high-risk tenants",
      detail: `${params.highRiskCount} tenant(s) are marked high risk this period.`,
      ctaLabel: "Open Reports",
      route: "/reports",
    });
  }

  if (params.pendingReminders > 0) {
    items.push({
      id: "pending-reminders",
      priority: "high",
      title: "Clear pending reminders",
      detail: `${params.pendingReminders} reminder(s) are still pending.`,
      ctaLabel: "Open Queue",
      route: "/reports",
    });
  }

  if (params.totalBalance > 0 && params.topOverdueTenantId) {
    items.push({
      id: "largest-overdue-balance",
      priority: "high",
      title: "Follow up overdue tenant",
      detail: `Outstanding balances need follow-up. Focus on the highest overdue tenant first.`,
      ctaLabel: "Open Tenant",
      route: `/tenants?tenantId=${params.topOverdueTenantId}`,
    });
  }

  if (params.collectionRate < 70 && params.occupiedUnits > 0) {
    items.push({
      id: "collection-efficiency",
      priority: "medium",
      title: "Collections below target",
      detail: `Collection efficiency is ${params.collectionRate.toFixed(0)}%, below a 70% target.`,
      ctaLabel: "Review Reports",
      route: "/reports",
    });
  }

  if (params.vacantUnits > 0) {
    items.push({
      id: "vacant-units",
      priority: "low",
      title: "Vacant units available",
      detail: `${params.vacantUnits} vacant unit(s) can be marketed or assigned.`,
      ctaLabel: "Open Properties",
      route: "/properties",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "all-clear",
      priority: "low",
      title: "No urgent actions",
      detail: "Your key risk and collection signals look stable for now.",
      ctaLabel: "View Dashboard",
      route: "/",
    });
  }

  return items.slice(0, 5);
}

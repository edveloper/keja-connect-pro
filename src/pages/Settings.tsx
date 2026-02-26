import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Smartphone, FileSpreadsheet, BarChart3 } from "lucide-react";
import { OnboardingImportPanel } from "@/components/settings/OnboardingImportPanel";
import { useNavigate } from "react-router-dom";

const settingsItems = [
  { icon: FileSpreadsheet, label: "Onboarding Imports", description: "Map columns and import existing sheets", route: "/settings" },
  { icon: BarChart3, label: "Reports & Documents", description: "Summary, statement, operations and loan packs", route: "/reports" },
  { icon: User, label: "Account", description: "Manage profile and workspace ownership", route: "/about" },
  { icon: Bell, label: "Notifications", description: "Reminder and follow-up workflow controls", route: "/reports" },
  { icon: Shield, label: "Security", description: "RLS-backed data isolation with Supabase", route: "/privacy" },
  { icon: Smartphone, label: "M-Pesa Settings", description: "Configure payment reference workflows", route: "/help" },
  { icon: HelpCircle, label: "Help & Support", description: "Guides for onboarding and monthly operations", route: "/help" },
];

export default function Settings() {
  const navigate = useNavigate();

  return (
    <PageContainer title="Settings" subtitle="Onboarding, exports and workspace controls">
      <div className="mb-4">
        <OnboardingImportPanel />
      </div>

      <div className="space-y-3">
        {settingsItems.map((item, index) => (
          <Card 
            key={item.label}
            className="p-4 animate-slide-up cursor-pointer hover:shadow-md transition-all"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => navigate(item.route)}
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-muted text-muted-foreground">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 mt-6 bg-accent/50 border-accent">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Data & Compliance Readiness</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Use Reports exports to generate audit trails, lender packs, and monthly evidence files.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => navigate("/reports")}>
            Open Reports Exports
          </Button>
        </div>
      </Card>

      <Button 
        variant="ghost" 
        className="w-full mt-6 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-5 w-5 mr-2" />
        Sign Out
      </Button>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Keja-Connect v1.1.0
      </p>
    </PageContainer>
  );
}

import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Smartphone } from "lucide-react";

const settingsItems = [
  { icon: User, label: "Account", description: "Manage your profile" },
  { icon: Bell, label: "Notifications", description: "SMS & push alerts" },
  { icon: Database, label: "Data & Backup", description: "Export your data" },
  { icon: Shield, label: "Security", description: "Password & login" },
  { icon: Smartphone, label: "M-Pesa Settings", description: "Configure SMS parsing" },
  { icon: HelpCircle, label: "Help & Support", description: "FAQs and contact" },
];

export default function Settings() {
  return (
    <PageContainer title="Settings" subtitle="Manage your account">
      <div className="space-y-3">
        {settingsItems.map((item, index) => (
          <Card 
            key={item.label}
            className="p-4 animate-slide-up cursor-pointer hover:shadow-md transition-all"
            style={{ animationDelay: `${index * 50}ms` }}
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
            <h3 className="font-semibold text-foreground">Connect Database</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connect Supabase to persist your data and enable multi-device sync.
            </p>
          </div>
          <Button variant="outline" className="w-full">
            Setup Supabase
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
        Keja-Connect v1.0.0
      </p>
    </PageContainer>
  );
}

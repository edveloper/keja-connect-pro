import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Wallet, Phone } from "lucide-react";

export default function Help() {
  return (
    <PageContainer title="Help & Support" subtitle="Managing your properties">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Property Setup</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Add your properties with actual addresses. Within each property, add units (e.g., A1, B2) to keep your collection organized.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Users className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Tenant Payments</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The app tracks every Shilling. If a tenant pays more than the rent, it reflects as an overpayment. Partial payments are tracked as arrears automatically.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Wallet className="h-5 w-5 text-red-500" />
            <CardTitle className="text-lg">Tracking Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Log property-wide fixes (like roofing) or unit-specific repairs. Your Reports page will calculate Net Income by subtracting these from collected rent.
          </CardContent>
        </Card>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
          <Phone className="h-8 w-8 mx-auto text-primary mb-2" />
          <h3 className="font-bold text-foreground">Need Assistance?</h3>
          <p className="text-sm text-muted-foreground mb-4">In case of any issues or feature requests, get in touch.</p>
          <a href="mailto:your-email@example.com" className="text-primary font-semibold hover:underline">
            support@kejaconnect.com
          </a>
        </div>
      </div>
    </PageContainer>
  );
}
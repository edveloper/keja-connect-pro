import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Wallet, Phone } from "lucide-react";

export default function Help() {
  return (
    <>
      {/* SEO METADATA */}
      <Helmet>
        <title>Help & Support | Keja-Connect</title>
        <meta
          name="description"
          content="Learn how to use Keja-Connect to manage properties, track tenant payments, record expenses, and get landlord support in Kenya."
        />
      </Helmet>

      <PageContainer title="Help & Support" subtitle="Managing your properties">
        <div className="space-y-6">

          {/* SEO INTRO CONTENT */}
          <section className="text-sm text-muted-foreground leading-relaxed">
            <p>
              The Keja-Connect Help & Support page provides guidance for Kenyan
              landlords on how to effectively manage rental properties, track
              tenant payments, and monitor expenses. Whether you are setting up
              your first property or reconciling rent collections, this guide
              walks you through the core features of the platform.
            </p>
          </section>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Property Setup</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Add your properties using real physical addresses. Within each
              property, create individual units (for example A1, B2, or Shop 3)
              to keep rent collection, tenant allocation, and expense tracking
              well organized.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Users className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Tenant Payments</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Keja-Connect tracks every shilling paid by tenants. Overpayments
              are automatically reflected as credit balances, while partial
              payments are logged as arrears to help landlords maintain accurate
              rent records.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Wallet className="h-5 w-5 text-red-500" />
              <CardTitle className="text-lg">Tracking Expenses</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Record both property-wide expenses such as renovations and
              unit-specific repairs. The Reports section automatically calculates
              net income by deducting expenses from collected rent, giving you a
              clear financial overview.
            </CardContent>
          </Card>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
            <Phone className="h-8 w-8 mx-auto text-primary mb-2" />
            <h3 className="font-bold text-foreground">Need Assistance?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you experience technical issues or have feature requests,
              support is available.
            </p>
            <a
              href="mailto:support@kejaconnect.com"
              className="text-primary font-semibold hover:underline"
            >
              support@kejaconnect.com
            </a>
          </div>
        </div>
      </PageContainer>
    </>
  );
}

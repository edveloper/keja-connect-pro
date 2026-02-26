import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ShieldCheck, Users, MapPin, BarChart3, Wallet, FileSpreadsheet, Landmark } from "lucide-react";

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Keja-Connect | Built for Kenyan Landlords</title>
        <meta
          name="description"
          content="Learn about Keja-Connect, a property management platform built to help Kenyan landlords manage tenants, rent payments, and expenses with confidence."
        />
      </Helmet>

      <PageContainer
        title="About Keja-Connect"
        subtitle="Built for practical property management"
      >
        <div className="space-y-5">
          <Card className="surface-panel">
            <CardContent className="pt-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Keja-Connect is a landlord-focused platform designed for the Kenyan rental market.
                It brings property setup, tenant records, rent collection, and expense tracking into
                one workflow so owners can run operations with less admin overhead and clearer numbers.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-primary" />
                  What We Solve
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Spreadsheets, fragmented payment logs, and inconsistent reporting are replaced with a
                single source of truth for rental operations.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Who It Is For
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Individual landlords, small portfolios, and property managers who need accurate records
                without a complex enterprise setup.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-4 w-4 text-primary" />
                  Financial Clarity
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Monitor collections, arrears, overpayments, and expenses in real time, then export
                summaries, statements, operations packs, and loan packs for easier month-end review.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  Local Context
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                The product reflects common Kenya-based rental workflows, including mobile-money aligned
                collection practices and flexible monthly payment behavior.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Faster Onboarding
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Import existing spreadsheets with column mapping, so landlords can migrate from
                statements and legacy sheets without retyping data.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Landmark className="h-4 w-4 text-primary" />
                  Lender-Ready Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Export loan-ready evidence with rent rolls, arrears, income and cost histories in
                structured formats for financiers and auditors.
              </CardContent>
            </Card>
          </div>

          <Card className="surface-panel">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Product Principles
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Reliable records over guesswork.</p>
              <p>Simple workflows over unnecessary complexity.</p>
              <p>Actionable reporting over raw data dumps.</p>
              <p className="pt-1 flex items-center gap-2 text-foreground font-medium">
                <BarChart3 className="h-4 w-4 text-primary" />
                Keja-Connect helps you stay operationally clear, month after month.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}

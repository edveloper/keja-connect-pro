import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Users, Wallet, FileSpreadsheet, Phone, ArrowRight, Landmark } from "lucide-react";

export default function Help() {
  return (
    <>
      <Helmet>
        <title>Help & Support | Keja-Connect</title>
        <meta
          name="description"
          content="Learn how to use Keja-Connect to manage properties, track tenant payments, record expenses, and generate financial reports."
        />
      </Helmet>

      <PageContainer title="Help & Support" subtitle="Guides for everyday operations">
        <div className="space-y-5">
          <Card className="surface-panel">
            <CardContent className="pt-6 text-sm text-muted-foreground leading-relaxed">
              This guide covers the recommended workflow: set up properties and units, add tenants,
              record rent payments, log expenses, and review reports for month-end decisions.
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  1. Onboard Existing Data
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Go to Settings and use Onboarding Import. You can import standard tabs
                (`Properties`, `Units`, `Tenants`) or use Manual Heading Mapping for statement-style sheets.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  2. Validate Tenant Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                After import, review unit-to-tenant mappings and rent values. Any missing property column
                can be handled with a default property name during mapping.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  3. Record Collections & Costs
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Record tenant collections as they happen, then log property expenses in the same period
                so your net position is always current.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  4. Export Reports & Packs
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Use Reports to export Summary, Statement, Operations Pack, and Loan Pack. These include
                rent roll, arrears, collections, expenses, and risk/reminder intelligence.
              </CardContent>
            </Card>

            <Card className="elevate">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" />
                  5. Loan / Compliance Use Cases
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                For loan applications, use Loan Pack and Statement together. For monthly compliance and audits,
                export Operations Pack plus Summary for the exact reporting period.
              </CardContent>
            </Card>
          </div>

          <Card className="surface-panel border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Need direct support?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    For technical issues or feature requests, contact support and include steps to reproduce
                    where possible.
                  </p>
                  <a
                    href="mailto:support@kejaconnect.com"
                    className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-primary hover:underline"
                  >
                    support@kejaconnect.com <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="help-1">
                  <AccordionTrigger>How do I set up a new month properly?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Confirm the month selector on Dashboard, then record all payments and expenses against
                    that same month. This keeps reports and balances accurate.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-2">
                  <AccordionTrigger>Can I track partial payments and arrears?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes. Keja-Connect supports partial payments, arrears, and overpayments automatically
                    through tenant balance updates.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-3">
                  <AccordionTrigger>What should I export at month-end?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Export Summary + Operations Pack for management review. Export Statement for detailed
                    transaction evidence. Export Loan Pack when sharing with lenders.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-5">
                  <AccordionTrigger>Can I import statement-style spreadsheets?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes. Use Manual Heading Mapping in Settings. Choose the sheet, set the header row,
                    map tenant/unit/rent/balance columns, and set a default property name if needed.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-4">
                  <AccordionTrigger>Why do totals sometimes look different across pages?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Usually it is a date filter difference (monthly vs all-time). Check the active period
                    selector at the top of each page.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}

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
                  <AccordionTrigger>Do I need to do anything at the start of a month?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    No. Rent is charged to every active tenant automatically on the 1st, and
                    anything unpaid carries forward as arrears. Just record payments as they
                    come in.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-2">
                  <AccordionTrigger>How are part payments applied?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Always to the oldest unpaid month first. If a tenant owes for June and July
                    and pays one month's rent, it clears June. Pay more than is owed and the
                    extra is held as credit against next month. The payment dialog shows you
                    exactly which months a payment will clear before you save it.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-3">
                  <AccordionTrigger>What should I export at month-end?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    The Operations Pack — rent roll, arrears, every payment and every cost for
                    the month. If you are applying for a loan, use the Lender Pack instead: it
                    covers twelve months and shows your average monthly net income, which is
                    what a bank asks for.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-mpesa">
                  <AccordionTrigger>How do I record payments from M-Pesa?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Copy the confirmation messages from your phone and paste them into "Record
                    payments from M-Pesa" on the Dashboard. Each one is matched to a tenant by
                    phone number, and you confirm every row before anything is saved. You can
                    paste several at once, and outgoing payments or airtime purchases are
                    ignored. Keja-Connect does not connect to M-Pesa directly.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-duplicate">
                  <AccordionTrigger>What if I record the same payment twice?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    If you entered the M-Pesa code, it will be refused and you will be told when
                    it was first recorded. Without a code there is nothing to match on, so enter
                    the code whenever you have it.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="help-moveout">
                  <AccordionTrigger>A tenant is moving out. Delete them?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Use Move Out, not Delete. Moving out keeps their payment history, stops
                    billing them, and frees the unit. Deleting erases every charge and payment
                    on their record, which changes the totals in months you have already closed.
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

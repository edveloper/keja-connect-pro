import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";

/**
 * Task-shaped rather than feature-shaped.
 *
 * The previous version opened with numbered vendor headings — "1. Onboard
 * Existing Data", "2. Validate Tenant Assignments" — which assumed the reader
 * had arrived holding a spreadsheet, and rendered literal markdown backticks
 * on screen. A landlord opens Help with a specific question, so the page is now
 * a list of questions.
 */

const GETTING_STARTED: Array<{ step: string; title: string; detail: string }> = [
  {
    step: "1",
    title: "Add a property, then its units",
    detail:
      "The property is the building or plot. The units are the individual houses — RentKonnect can number a whole block for you in one go.",
  },
  {
    step: "2",
    title: "Add your tenants",
    detail:
      "Give each one their rent and the date their lease started. Rent is then charged automatically every month, including the months already gone by, so arrears show up straight away.",
  },
  {
    step: "3",
    title: "Record payments as they come in",
    detail:
      "Paste the M-Pesa messages from your phone, or enter a payment by hand. Either way the money goes against the oldest unpaid month first.",
  },
];

const QUESTIONS: Array<{ q: string; a: string }> = [
  {
    q: "Do I need to do anything at the start of a month?",
    a: "No. Rent is charged to every active tenant automatically on the 1st, and anything unpaid carries forward as arrears. Just record payments as they arrive.",
  },
  {
    q: "How are part payments applied?",
    a: "Always to the oldest unpaid month first. If a tenant owes for June and July and pays one month's rent, it clears June. Pay more than is owed and the extra is held as credit against next month. The payment dialog shows you exactly which months a payment will clear before you save it.",
  },
  {
    q: "How do I record payments from M-Pesa?",
    a: "Copy the confirmation messages from your phone and paste them into 'Paste M-Pesa' on the Dashboard or the Tenants screen. Each one is matched to a tenant by phone number, and you confirm every row before anything is saved. You can paste several at once. Outgoing payments and airtime purchases are ignored. RentKonnect does not connect to M-Pesa directly.",
  },
  {
    q: "What if I record the same payment twice?",
    a: "If you entered the M-Pesa code, it will be refused and you will be told when it was first recorded. Without a code there is nothing to match on, so enter the code whenever you have it.",
  },
  {
    q: "A tenant is moving out. Should I delete them?",
    a: "Use Move out, not Delete. Moving out keeps their payment history, stops billing them, and frees the unit. Deleting erases every charge and payment on their record, which changes the totals in months you have already closed.",
  },
  {
    q: "Can I bring in records from a spreadsheet?",
    a: "Yes. Settings has a spreadsheet import. Sheets named Properties, Units or Tenants are picked up automatically; for anything else you map the columns yourself. Rent, arrears and lease dates all come across.",
  },
  {
    q: "Why do the Dashboard and Reports show different figures?",
    a: "They answer different questions. 'Collected' on the rent roll means money applied to that month's rent, so a payment clearing June's arrears counts towards June. 'Cash received' means money that arrived in the period, whatever it paid off. Both are on the Reports screen, labelled.",
  },
  {
    q: "What should I send my bank?",
    a: "The Lender Pack, under Documents on the Reports screen. It covers twelve months of collections and costs and shows your average monthly net income, which is what a bank underwrites against. A single month is not enough.",
  },
];

export default function Help() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Help | RentKonnect</title>
        <meta
          name="description"
          content="How to set up RentKonnect, record rent from M-Pesa, chase arrears and export statements for a bank."
        />
      </Helmet>

      <PageContainer title="Help" subtitle="How the app works">
        <div className="space-y-6 pb-8">
          <section>
            <h2 className="eyebrow mb-3">Starting out</h2>
            <ol className="space-y-3">
              {GETTING_STARTED.map((item) => (
                <li key={item.step} className="surface-panel p-4 flex gap-3">
                  <span
                    className="h-6 w-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    {item.step}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="block text-sm text-muted-foreground mt-1">
                      {item.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="eyebrow mb-3">Common questions</h2>
            <div className="surface-panel px-4">
              <Accordion type="single" collapsible className="w-full">
                {QUESTIONS.map((item, i) => (
                  <AccordionItem
                    key={item.q}
                    value={`q-${i}`}
                    className={i === QUESTIONS.length - 1 ? "border-b-0" : undefined}
                  >
                    <AccordionTrigger className="text-sm text-left">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          <section className="surface-panel p-5 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Still stuck, or something not working as described?
            </p>
            <Button onClick={() => navigate("/contact")}>Get in touch</Button>
          </section>
        </div>
      </PageContainer>
    </>
  );
}

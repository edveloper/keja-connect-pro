import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>About RentKonnect | Rent Tracking for Kenyan Landlords</title>
        <meta
          name="description"
          content="Why RentKonnect exists, what it does, and what it deliberately does not do. Built by one developer for Kenyan landlords managing their own units."
        />
      </Helmet>

      <PageContainer title="About" subtitle="What this is, and what it isn't">
        <div className="space-y-6 pb-8 text-sm leading-relaxed">
          <section className="surface-panel p-5 space-y-3">
            {/*
              TODO (Eddie): replace this paragraph with your own reason for
              building it — the specific frustration, the number of units, the
              estate. One true sentence about where this came from will do more
              for trust than anything else on the page.
            */}
            <p>
              Most Kenyan landlords run their units from a notebook or a WhatsApp thread. It
              works until a tenant is three months behind and nobody can agree on what was
              paid or when. RentKonnect exists to keep that record straight.
            </p>
            <p className="text-muted-foreground">
              It is built and maintained by one developer, Eddie Ezekiel Ochieng. If you find
              something wrong, you are writing to the person who can fix it.
            </p>
          </section>

          <section>
            <h2 className="eyebrow mb-3">What it does</h2>
            <dl className="surface-panel divide-y divide-border overflow-hidden">
              {[
                {
                  t: "Bills rent automatically",
                  d: "Every active tenant is charged on the 1st, whether or not you open the app. Arrears carry forward month to month.",
                },
                {
                  t: "Records payments from M-Pesa",
                  d: "Paste the confirmation messages from your phone. Each is matched to a tenant by phone number and you confirm before anything is saved. The same code cannot be recorded twice.",
                },
                {
                  t: "Applies money to the oldest debt first",
                  d: "A part payment clears the oldest unpaid month, not the current one. Pay ahead and the credit carries to next month's rent.",
                },
                {
                  t: "Shows each tenant's full statement",
                  d: "Month by month: billed, paid, balance carried forward, and which months each payment actually settled. Enough to end an argument.",
                },
                {
                  t: "Sends reminders on WhatsApp",
                  d: "Written for you with the amount and your payment details, sent from your own number so it lands in a conversation the tenant recognises.",
                },
                {
                  t: "Exports what a bank asks for",
                  d: "Twelve months of collections, costs and average monthly net income, as Excel or a printable PDF.",
                },
              ].map((item) => (
                <div key={item.t} className="px-4 py-3.5">
                  <dt className="font-semibold">{item.t}</dt>
                  <dd className="text-muted-foreground mt-1">{item.d}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="eyebrow mb-3">What it doesn't do</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                It does not connect to M-Pesa directly. You paste the messages; there is no
                Daraja integration and no automatic bank feed.
              </li>
              <li>
                It does not collect rent for you, hold your money, or touch your paybill.
              </li>
              <li>
                It does not give tenants a login. This is a tool for the landlord, and
                everything a tenant sees comes from you.
              </li>
              <li>
                It is not accounting software. It tracks rent and property costs, not payroll,
                VAT, or anything you would file with KRA.
              </li>
            </ul>
          </section>

          <section className="surface-panel p-5">
            <h2 className="eyebrow mb-2">Your data</h2>
            <p className="text-muted-foreground">
              Every record is scoped to your account at the database level, not just in the
              app, so no other landlord can read or change your figures. It is never sold or
              shared.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => navigate("/privacy")}>
                Read the privacy page
              </Button>
              <Button size="sm" onClick={() => navigate("/contact")}>
                Get in touch
              </Button>
            </div>
          </section>
        </div>
      </PageContainer>
    </>
  );
}

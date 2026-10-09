import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { PublicFooter } from "@/components/layout/PublicFooter";

/**
 * What a signed-out visitor sees at the root.
 *
 * It used to be an immediate redirect to the sign-in form, which asks a landlord
 * who has never heard of this to produce a password for it. Now they are told
 * what it is first. Same column width as the app, so it reads as the same thing.
 */

const QUESTIONS = [
  {
    q: "Who still owes rent this month?",
    a: "Every tenant's balance on one screen, with arrears carried forward month to month and the oldest debt always cleared first.",
  },
  {
    q: "Has this payment been recorded already?",
    a: "Paste the M-Pesa confirmation from your phone. It is matched to the tenant by phone number, and the same code can never be recorded twice.",
  },
  {
    q: "What did the building actually make?",
    a: "Collections, costs and what was left, month by month, so the figure you quote is the figure that is true.",
  },
  {
    q: "What will the bank want to see?",
    a: "Twelve months of collections, costs and average monthly net income, as Excel or a printable PDF.",
  },
];

const STEPS = [
  { t: "Add your property", d: "Name it and add its units, with the rent for each." },
  { t: "Add your tenants", d: "Who lives where, their phone number and their rent. Billing starts on the 1st." },
  { t: "Paste payments as they come", d: "Copy the M-Pesa message, paste it in, confirm. That is the whole routine." },
];

const PLANS = [
  {
    name: "Basic",
    price: "KSh 400",
    lines: ["Up to 10 units", "Billing, arrears and M-Pesa matching", "WhatsApp reminders", "The last 12 months"],
  },
  {
    name: "Business",
    price: "KSh 900",
    lines: [
      "Units without limit, across several properties",
      "Everything in Basic",
      "Expenses and net income",
      "Bank and lender exports, all your history",
    ],
  },
];

const FAQ = [
  {
    q: "Does it connect to my M-Pesa or bank?",
    a: "No. You paste the confirmation messages yourself. RentKonnect never touches your money, your PIN or your paybill.",
  },
  {
    q: "Do my tenants get a login?",
    a: "No. It is a tool for the landlord. Anything a tenant sees, such as a reminder, comes from you, sent from your own WhatsApp.",
  },
  {
    q: "Can another landlord see my figures?",
    a: "No. Every record is tied to your account inside the database itself, not just in the app.",
  },
  {
    q: "What happens when the paid plans start?",
    a: "You will be told before anything changes, and landlords already using RentKonnect keep the price they joined on.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. Open it in your phone's browser and add it to your home screen, and it behaves like any other app.",
  },
];

export default function Landing() {
  return (
    <>
      <Helmet>
        <title>RentKonnect | Rent Tracking for Kenyan Landlords</title>
        <meta
          name="description"
          content="Know who has paid and who owes what. RentKonnect bills rent automatically, records M-Pesa payments you paste in, and exports the twelve-month history a bank asks for. Free while we are getting started."
        />
      </Helmet>

      <div className="app-shell min-h-screen flex flex-col">
        {/* Brand band, the same ink as the sign-in page. */}
        <header className="bg-foreground text-background">
          <div className="mx-auto w-full max-w-md px-6 h-14 flex items-center justify-between">
            <Wordmark className="text-xl [&_p:first-child]:text-background" />
            <Link to="/auth" className="text-sm font-semibold text-background/90 hover:text-background">
              Sign in
            </Link>
          </div>

          <div className="mx-auto w-full max-w-md px-6 pt-8 pb-12 space-y-5">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest bg-background/10 rounded-full px-3 py-1">
              Free while we are getting started
            </span>
            <h1 className="text-4xl font-bold tracking-tight leading-[1.05]">
              Know who has paid.
            </h1>
            <p className="text-background/75 leading-relaxed">
              Rent tracking for Kenyan landlords. RentKonnect bills every tenant on the 1st, records
              the M-Pesa payments you paste in, and shows exactly who owes what.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-background hover:bg-background/10 hover:text-background">
                <a href="#how">How it works</a>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md px-6 space-y-12 pt-10 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="eyebrow">The questions at month end</h2>
            <div className="space-y-3">
              {QUESTIONS.map((item) => (
                <div key={item.q} className="surface-panel p-4">
                  <h3 className="font-semibold text-base">{item.q}</h3>
                  <p className="text-muted-foreground mt-1">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="how" className="space-y-3 scroll-mt-6">
            <h2 className="eyebrow">Three steps and you are running</h2>
            <ol className="surface-panel divide-y divide-border overflow-hidden">
              {STEPS.map((step, i) => (
                <li key={step.t} className="flex gap-4 px-4 py-3.5">
                  <span className="font-bold text-primary tabular-nums">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{step.t}</p>
                    <p className="text-muted-foreground mt-0.5">{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="eyebrow">What it costs</h2>
            <p>
              Everything is free while RentKonnect is getting started. When the paid plans arrive,
              landlords already with us keep their price, and nobody is ever locked out of their own
              records.
            </p>
            <div className="space-y-3">
              {PLANS.map((plan) => (
                <div key={plan.name} className="surface-panel p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-base">{plan.name}</span>
                    <span>
                      <span className="text-xl font-bold tabular-nums">{plan.price}</span>
                      <span className="text-xs text-muted-foreground ml-1">a month</span>
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {plan.lines.map((line) => (
                      <li key={line} className="flex gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs mt-3 font-medium text-muted-foreground">Not yet. Free for now.</p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-panel p-5 space-y-2">
            <h2 className="eyebrow">Put it on your home screen</h2>
            <p className="text-muted-foreground">
              RentKonnect runs in your phone&apos;s browser. Add it to your home screen and it opens
              like any other app, without a download from a store.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="eyebrow">Questions</h2>
            <dl className="surface-panel divide-y divide-border overflow-hidden">
              {FAQ.map((item) => (
                <div key={item.q} className="px-4 py-3.5">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="text-muted-foreground mt-1">{item.a}</dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground">
              More in <Link to="/help" className="text-foreground underline">Help</Link>, or read{" "}
              <Link to="/about" className="text-foreground underline">what RentKonnect does and doesn&apos;t do</Link>.
            </p>
          </section>

          <section className="text-center space-y-3 pt-2">
            <p className="text-base font-semibold">Start with one building. It takes a few minutes.</p>
            <Button asChild size="lg">
              <Link to="/auth">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </section>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}

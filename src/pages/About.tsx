import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>About Keja-Connect | Rent Tracking for Kenyan Landlords</title>
        <meta
          name="description"
          content="Why Keja-Connect exists, what it does, and what it deliberately does not do. Built by one developer for Kenyan landlords managing their own units."
        />
      </Helmet>

      <PageContainer title="About" subtitle="What this is, and what it isn't">
        <div className="space-y-5 pb-24">
          <Card>
            <CardContent className="pt-6 space-y-4 text-sm leading-relaxed">
              {/*
                TODO (Eddie): replace this paragraph with your own reason for
                building it — the specific frustration, the number of units, the
                estate. One true sentence about where this came from will do
                more for trust than anything else on the page.
              */}
              <p>
                Most Kenyan landlords run their units from a notebook or a WhatsApp thread.
                It works until a tenant is three months behind and nobody can agree on what
                was paid or when. Keja-Connect exists to keep that record straight.
              </p>
              <p className="text-muted-foreground">
                It is built and maintained by one developer, Eddie Ezekiel Ochieng. If you
                find something wrong, you are writing to the person who can fix it.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="font-bold text-sm mb-3">What it does</h2>
              <ul className="space-y-3 text-sm">
                <li>
                  <span className="font-semibold">Bills rent automatically.</span>{" "}
                  <span className="text-muted-foreground">
                    Every active tenant is charged on the 1st, whether or not you open the
                    app. Arrears carry forward month to month.
                  </span>
                </li>
                <li>
                  <span className="font-semibold">Records payments from M-Pesa.</span>{" "}
                  <span className="text-muted-foreground">
                    Paste the confirmation messages from your phone. Each one is matched to a
                    tenant by phone number and you confirm before anything is saved. The same
                    code cannot be recorded twice.
                  </span>
                </li>
                <li>
                  <span className="font-semibold">Applies money to the oldest debt first.</span>{" "}
                  <span className="text-muted-foreground">
                    A part payment clears the oldest unpaid month, not the current one. Pay
                    ahead and the credit is carried forward to next month's rent.
                  </span>
                </li>
                <li>
                  <span className="font-semibold">Shows each tenant's full statement.</span>{" "}
                  <span className="text-muted-foreground">
                    Month by month: billed, paid, balance carried forward — and which months
                    each payment actually settled. Enough to end an argument.
                  </span>
                </li>
                <li>
                  <span className="font-semibold">Sends reminders on WhatsApp.</span>{" "}
                  <span className="text-muted-foreground">
                    The message is written for you with the amount and your paybill. It sends
                    from your own number, so it lands in a conversation the tenant recognises.
                  </span>
                </li>
                <li>
                  <span className="font-semibold">Exports what a bank asks for.</span>{" "}
                  <span className="text-muted-foreground">
                    Twelve months of collections, costs and average monthly net income, as
                    Excel or a printable PDF.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="font-bold text-sm mb-3">What it doesn't do</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  It does not connect to M-Pesa directly. You paste the messages; there is no
                  Daraja integration and no automatic bank feed.
                </li>
                <li>
                  It does not collect rent on your behalf, hold your money, or touch your
                  paybill.
                </li>
                <li>
                  It does not give tenants a login. This is a tool for the landlord, and
                  everything a tenant sees comes from you.
                </li>
                <li>
                  It is not accounting software. It tracks rent and property costs — not
                  payroll, VAT, or anything you would file with KRA.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="font-bold text-sm mb-3">Your data</h2>
              <p className="text-sm text-muted-foreground">
                Every record is scoped to your account at the database level, not just in the
                app — no other landlord can read or change your tenants, payments or figures
                even if they go looking. Your data is never sold or shared.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate("/privacy")}
              >
                Read the privacy policy
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Something wrong, missing, or slower than it should be?
              </p>
              <Button onClick={() => navigate("/contact")}>Get in touch</Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}

import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/**
 * Written as prose rather than six icon-and-numbered-heading cards.
 *
 * The previous version read "1. Data We Store", "2. Protection & Access",
 * "3. Confidentiality" — numbered as though it were a sequence, and phrased in
 * the voice of a compliance department. A landlord reading this wants to know
 * two things: what happens to their records, and what they themselves are on
 * the hook for.
 */
export default function Privacy() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Privacy | RentKonnect</title>
        <meta
          name="description"
          content="What RentKonnect stores, who can see it, and what you are responsible for as a landlord holding tenant data."
        />
      </Helmet>

      <PageContainer title="Privacy" subtitle="What we hold and who can see it">
        <div className="space-y-6 pb-8 text-sm leading-relaxed">
          <section className="surface-panel p-5">
            <p>
              You are storing other people's personal details here — names, phone numbers, and
              a record of what they owe. This page says plainly what happens to that
              information.
            </p>
          </section>

          <section>
            <h2 className="eyebrow mb-2">What is stored</h2>
            <p className="text-muted-foreground">
              Your properties and units, your tenants' names and phone numbers, the rent
              charged each month, every payment recorded, and your expenses. Your email
              address, because that is how you sign in.
            </p>
          </section>

          <section>
            <h2 className="eyebrow mb-2">What is not stored</h2>
            <p className="text-muted-foreground">
              No M-Pesa PIN, no bank login, no card details. RentKonnect never connects to
              your money — when you paste an M-Pesa message, only the amount, the code and the
              sender are read from it. National ID numbers are not collected, and there is no
              field to put one in.
            </p>
          </section>

          <section>
            <h2 className="eyebrow mb-2">Who can see it</h2>
            <p className="text-muted-foreground">
              Only you. Every record is scoped to your account inside the database itself, not
              just in the app, so another landlord cannot read your figures even if they go
              looking for them. Your data is never sold, shared, or used to advertise anything
              to you.
            </p>
          </section>

          <section>
            <h2 className="eyebrow mb-2">Your side of it</h2>
            <p className="text-muted-foreground">
              Holding tenant details makes you responsible for them under Kenya's Data
              Protection Act. In practice that means: collect only what you need to run the
              tenancy, keep it accurate, do not pass it to anyone who has no reason to see it,
              and remove it when the tenancy is long over. This is a description of the duty,
              not legal advice — if you manage at scale, take proper counsel.
            </p>
          </section>

          <section>
            <h2 className="eyebrow mb-2">Removing data</h2>
            <p className="text-muted-foreground">
              Moving a tenant out keeps their history so your past months still add up.
              Deleting a tenant erases them and everything attached to them, permanently and
              immediately. If you want your whole account removed, ask and it will be done.
            </p>
          </section>

          <section className="surface-panel p-5">
            <p className="mb-3">
              Anything here unclear, or something you want removed?
            </p>
            <Button onClick={() => navigate("/contact")}>Get in touch</Button>
          </section>
        </div>
      </PageContainer>
    </>
  );
}

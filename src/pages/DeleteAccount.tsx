import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";

const EMAIL = "enquiries@eddie-ezekiel.com";
const REQUEST_SUBJECT = encodeURIComponent("Delete my RentKonnect account");
const REQUEST_BODY = encodeURIComponent("Email I sign in with:\n\nName of one of my properties:\n");

/** Google Play links here, so it has to make sense to somebody who cannot sign in. */
export default function DeleteAccount() {
  const [params] = useSearchParams();

  return (
    <>
      <Helmet>
        <title>Delete Your Account | RentKonnect</title>
        <meta
          name="description"
          content="How to delete your RentKonnect account and every record in it, from inside the app or by email."
        />
      </Helmet>

      <PageContainer title="Delete Your Account" subtitle="Last updated 10 November 2026">
        <div className="space-y-5 pb-8 text-sm leading-relaxed">
          {params.get("deleted") === "1" && (
            <p role="status" className="surface-panel p-4 font-medium">
              Your account has been deleted. Thank you for using RentKonnect.
            </p>
          )}

          <p>
            RentKonnect is run by Eddie Ezekiel Ochieng in Kenya. You can delete your account
            yourself at any time, and it takes about a minute.
          </p>

          <h2 className="eyebrow">If You Can Sign In</h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
            <li>
              <Link to="/auth" className="text-foreground underline">Sign in</Link> to RentKonnect.
            </li>
            <li>Tap More at the bottom of the screen, then Settings.</li>
            <li>Under Account, tap Delete Account and follow the steps.</li>
          </ol>

          <h2 className="eyebrow">If You Cannot Sign In</h2>
          <p className="text-muted-foreground">
            Email{" "}
            <a
              className="text-foreground underline"
              href={`mailto:${EMAIL}?subject=${REQUEST_SUBJECT}&body=${REQUEST_BODY}`}
            >
              {EMAIL}
            </a>{" "}
            from the address you sign in with. We will check the account is yours before deleting
            anything, and we will do it within 30 days.
          </p>

          <h2 className="eyebrow">What Is Deleted</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>Your login and your email address.</li>
            <li>Every property and unit you added.</li>
            <li>
              Every tenant, including past tenants, with their names, phone numbers, rent charges
              and payment history.
            </li>
            <li>Your expenses, your own expense categories, reminders and settings.</li>
          </ul>

          <h2 className="eyebrow">What Stays</h2>
          <p className="text-muted-foreground">
            Copies in our hosting provider&apos;s routine backups and logs are not removed one by
            one. They disappear as those backups and logs expire. Statements you exported and kept
            yourself are yours and are not affected.
          </p>
          <p className="text-muted-foreground">
            Deleting cannot be undone, so export your statements from Reports first if you might
            need them. More detail is on the{" "}
            <Link to="/privacy" className="text-foreground underline">privacy page</Link>.
          </p>
        </div>
      </PageContainer>
    </>
  );
}

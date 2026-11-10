import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";

/** Written in the same plain prose as the privacy page, for the same reason. */
export default function Terms() {
  return (
    <>
      <Helmet>
        <title>Terms of Use | RentKonnect</title>
        <meta
          name="description"
          content="The terms for using RentKonnect to track rent, tenants and payments for your properties."
        />
      </Helmet>

      <PageContainer title="Terms of Use" subtitle="Last updated 10 November 2026">
        <div className="space-y-5 pb-8 text-sm leading-relaxed">
          <p>
            These terms apply when you use RentKonnect, which is run by Eddie Ezekiel Ochieng in
            Kenya. They cover the website and the Android app alike. By creating an account you
            agree to them.
          </p>

          <h2 className="eyebrow">Using RentKonnect</h2>
          <p className="text-muted-foreground">
            You need to be 18 or over and managing property you own or are authorised to manage.
            Keep your password to yourself, because you are responsible for what is recorded under
            your account. Use RentKonnect for lawful letting only.
          </p>

          <h2 className="eyebrow">Your Tenants&apos; Details</h2>
          <p className="text-muted-foreground">
            Tenants never sign in. Their names, phone numbers and payments are entered by you, and
            holding them makes you responsible for them under Kenya&apos;s Data Protection Act. What
            that asks of you is set out on the{" "}
            <Link to="/privacy" className="text-foreground underline">privacy page</Link>. Reminders
            you send go from your own WhatsApp, so what they say is up to you.
          </p>

          <h2 className="eyebrow">Your Records Are Yours</h2>
          <p className="text-muted-foreground">
            Everything you record belongs to you. You let RentKonnect store and process it only so
            that the app can work for you. You can export it whenever you like.
          </p>

          <h2 className="eyebrow">What It Costs</h2>
          <p className="text-muted-foreground">
            RentKonnect is free while it is getting started. When paid plans are introduced you will
            be told before anything changes, landlords already using it keep the price they joined
            on, and nobody is locked out of their own records.
          </p>

          <h2 className="eyebrow">Figures Are Only as Good as What Goes In</h2>
          <p className="text-muted-foreground">
            Balances, statements and exports are worked out from what you record. RentKonnect does
            not connect to M-Pesa or any bank, so a payment that is never pasted in is a payment it
            does not know about. Reports are a record, not financial or tax advice.
          </p>

          <h2 className="eyebrow">Keeping It Running</h2>
          <p className="text-muted-foreground">
            We work to keep RentKonnect available and your records safe, but cannot promise it will
            never be interrupted. Features will change as the app grows, and anything that affects
            how you use it will be explained in the app first. Export your records from time to time
            and keep your own copy. To the extent Kenyan law allows, RentKonnect is not liable for
            losses that come from relying on it, from interruptions, or from information entered
            incorrectly.
          </p>

          <h2 className="eyebrow">Leaving, or Being Asked to Leave</h2>
          <p className="text-muted-foreground">
            You can stop using RentKonnect whenever you like and delete your account yourself from
            Settings. Deleting removes your records for good and cannot be undone. The{" "}
            <Link to="/delete-account" className="text-foreground underline">Delete Your Account</Link>{" "}
            page explains how. An account used for fraud or to attack the service may be suspended.
          </p>

          <h2 className="eyebrow">Google Play</h2>
          <p className="text-muted-foreground">
            If you install RentKonnect from Google Play, these terms are between you and RentKonnect.
            Google is not a party to them and is not responsible for the app or its support.
          </p>

          <h2 className="eyebrow">The Rest</h2>
          <p className="text-muted-foreground">
            These terms are governed by the laws of Kenya. If they change in a way that matters, the
            date above will change. Questions go to{" "}
            <a className="text-foreground underline" href="mailto:enquiries@eddie-ezekiel.com">
              enquiries@eddie-ezekiel.com
            </a>
            .
          </p>
        </div>
      </PageContainer>
    </>
  );
}

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

      <PageContainer title="Terms of Use" subtitle="Last updated 10 October 2026">
        <div className="space-y-5 pb-8 text-sm leading-relaxed">
          <p>
            These terms apply when you use RentKonnect, which is run by Eddie Ezekiel Ochieng in
            Kenya. By creating an account you agree to them.
          </p>

          <h2 className="eyebrow">Using RentKonnect</h2>
          <p className="text-muted-foreground">
            You need to be 18 or over and managing property you own or are authorised to manage.
            Keep your password to yourself; you are responsible for what is recorded under your
            account. The tenant details you enter are yours to hold, and the duties that come with
            them are set out on the <Link to="/privacy" className="text-foreground underline">privacy page</Link>.
          </p>

          <h2 className="eyebrow">Your records are yours</h2>
          <p className="text-muted-foreground">
            Everything you record belongs to you. You let RentKonnect store and process it only so
            that the app can work for you. You can export it, and you can ask for your account and
            everything in it to be deleted.
          </p>

          <h2 className="eyebrow">What it costs</h2>
          <p className="text-muted-foreground">
            RentKonnect is free while it is getting started. When paid plans are introduced you will
            be told before anything changes, landlords already using it keep the price they joined
            on, and nobody is locked out of their own records.
          </p>

          <h2 className="eyebrow">Figures are only as good as what goes in</h2>
          <p className="text-muted-foreground">
            Balances, statements and exports are worked out from what you record. RentKonnect does
            not connect to M-Pesa or any bank, so a payment that is never pasted in is a payment it
            does not know about. Reports are a record, not financial or tax advice.
          </p>

          <h2 className="eyebrow">Keeping it running</h2>
          <p className="text-muted-foreground">
            We work to keep RentKonnect available and your records safe, but cannot promise it will
            never be interrupted. Export your records from time to time and keep your own copy. To
            the extent Kenyan law allows, RentKonnect is not liable for losses that come from relying
            on it, from interruptions, or from information entered incorrectly.
          </p>

          <h2 className="eyebrow">Leaving, or being asked to leave</h2>
          <p className="text-muted-foreground">
            You can stop using RentKonnect whenever you like and ask for your account to be deleted.
            An account used for fraud or to attack the service may be suspended.
          </p>

          <h2 className="eyebrow">The rest</h2>
          <p className="text-muted-foreground">
            These terms are governed by the laws of Kenya. If they change in a way that matters, the
            date above will change. Questions go to{" "}
            <a className="text-foreground underline" href="mailto:eddie.ochieng@usalama-voice.com">
              eddie.ochieng@usalama-voice.com
            </a>
            .
          </p>
        </div>
      </PageContainer>
    </>
  );
}

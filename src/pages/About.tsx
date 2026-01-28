import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ShieldCheck, Users, MapPin } from "lucide-react";

export default function About() {
  return (
    <>
      {/* SEO METADATA */}
      <Helmet>
        <title>About Keja-Connect | Built for Kenyan Landlords</title>
        <meta
          name="description"
          content="Learn about Keja-Connect, a property management platform built to help Kenyan landlords manage tenants, rent payments, and expenses with confidence."
        />
      </Helmet>

      <PageContainer
        title="About Keja-Connect"
        subtitle="Property management, simplified for Kenyan landlords"
      >
        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">

          {/* INTRO */}
          <section>
            <p>
              Keja-Connect is a mobile-first property management application
              designed specifically for Kenyan landlords. The platform helps
              property owners track rental income, manage tenants, monitor
              expenses, and maintain accurate financial records — all in one
              secure place.
            </p>
          </section>

          {/* MISSION */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Building2 className="h-5 w-5 text-primary" />
                <h2>Our Mission</h2>
              </div>
              <p>
                Our mission is to simplify property management for landlords in
                Kenya by providing reliable tools that reduce paperwork, prevent
                rent disputes, and improve financial visibility across rental
                properties.
              </p>
            </CardContent>
          </Card>

          {/* EXPERTISE */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2>Experience & Expertise</h2>
              </div>
              <p>
                Keja-Connect was built by a Kenyan software developer with
                firsthand experience managing rental properties and handling
                tenant payment records. The app reflects real-world landlord
                workflows including partial payments, overpayments, arrears,
                and expense reconciliation.
              </p>
            </CardContent>
          </Card>

          {/* WHO IT'S FOR */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Users className="h-5 w-5 text-primary" />
                <h2>Who Keja-Connect Is For</h2>
              </div>
              <p>
                Keja-Connect is ideal for individual landlords, small property
                owners, and real estate managers who want a simple but powerful
                way to manage properties without relying on spreadsheets or
                manual record-keeping.
              </p>
            </CardContent>
          </Card>

          {/* LOCAL CONTEXT */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <MapPin className="h-5 w-5 text-primary" />
                <h2>Built for Kenya</h2>
              </div>
              <p>
                The platform is designed with the Kenyan rental market in mind,
                supporting common landlord practices and aligning with local
                property management realities such as mobile payments and
                flexible rent arrangements.
              </p>
            </CardContent>
          </Card>

          {/* FOOTER NOTE */}
          <div className="text-center pt-4 border-t border-border/50">
            <p className="text-[10px] uppercase tracking-widest font-medium">
              Keja-Connect — Property Management Simplified
            </p>
          </div>
        </div>
      </PageContainer>
    </>
  );
}

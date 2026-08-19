import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Globe, MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/reminders";

const CONTACT = {
  name: "Eddie Ezekiel Ochieng",
  phone: "0702 931 920",
  whatsapp: "0702931920",
  email: "ed.veloper10@gmail.com",
  website: "https://www.eddie-ezekiel.com/",
};

/**
 * One person, four ways to reach them.
 *
 * The previous version had two large icon buttons that both opened the same
 * mailto with a pre-written template, then repeated the same channels below in
 * tinted circles. It also answered "how quickly can I expect a reply?" with a
 * non-answer about report quality.
 */
export default function Contact() {
  const bugMail = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    "RentKonnect: something is wrong"
  )}&body=${encodeURIComponent(
    "What I was doing:\n\nWhat I expected:\n\nWhat happened instead:\n\nWhich screen:\n"
  )}`;

  return (
    <>
      <Helmet>
        <title>Contact | RentKonnect</title>
        <meta
          name="description"
          content="Report a problem or suggest an improvement to RentKonnect. Messages go directly to the developer."
        />
      </Helmet>

      <PageContainer title="Contact" subtitle="Report a problem or ask for something">
        <div className="space-y-6 pb-8">
          <section className="surface-panel p-5">
            <p className="text-sm leading-relaxed">
              RentKonnect is built and maintained by one person, {CONTACT.name}. There is no
              support desk in between — whatever you send goes to the person who can actually
              fix it.
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              WhatsApp usually gets a reply the same day, email within two or three. If
              something is stopping you recording rent, say so in the first line and it goes
              to the front.
            </p>
          </section>

          <section>
            <h2 className="eyebrow mb-3">Get in touch</h2>
            <div className="surface-panel divide-y divide-border overflow-hidden">
              <a
                href={whatsappLink(CONTACT.whatsapp, "Hi Eddie, about RentKonnect — ") ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-4 hover:bg-muted/60 transition-colors"
              >
                <MessageCircle
                  className="h-5 w-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">WhatsApp</span>
                  <span className="block text-xs text-muted-foreground">
                    {CONTACT.phone} · fastest for anything urgent
                  </span>
                </span>
              </a>

              <a
                href={bugMail}
                className="flex items-center gap-3 px-4 py-4 hover:bg-muted/60 transition-colors"
              >
                <Mail className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Email</span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {CONTACT.email} · best for detail and screenshots
                  </span>
                </span>
              </a>

              <a
                href={`tel:+254${CONTACT.whatsapp.slice(1)}`}
                className="flex items-center gap-3 px-4 py-4 hover:bg-muted/60 transition-colors"
              >
                <Phone className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Call</span>
                  <span className="block text-xs text-muted-foreground">{CONTACT.phone}</span>
                </span>
              </a>

              <a
                href={CONTACT.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-4 hover:bg-muted/60 transition-colors"
              >
                <Globe className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Other work</span>
                  <span className="block text-xs text-muted-foreground">eddie-ezekiel.com</span>
                </span>
              </a>
            </div>
          </section>

          <section>
            <h2 className="eyebrow mb-3">Reporting a problem</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Three things make a problem fixable straight away: which screen you were on,
              what you expected to happen, and what happened instead. A screenshot of the
              figures beats describing them.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <a href={bugMail}>
                <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                Email a problem report
              </a>
            </Button>
          </section>
        </div>
      </PageContainer>
    </>
  );
}

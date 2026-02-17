import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, Phone, Globe, Bug, Lightbulb, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  const contactData = {
    name: "Eddie Ezekiel Ochieng",
    phone: "+254702931920",
    email: "ed.veloper10@gmail.com",
    website: "https://www.eddie-ezekiel.com/",
  };

  const handleFeedback = (type: "Bug" | "Feature") => {
    const subject = encodeURIComponent(`Keja-Connect: ${type} Report`);
    const body = encodeURIComponent(
      `Hello ${contactData.name},\n\nI would like to submit a ${type.toLowerCase()} report:\n\nDetails:\n\nSteps to reproduce (if applicable):\n\nExpected outcome:\n\n`
    );
    window.location.href = `mailto:${contactData.email}?subject=${subject}&body=${body}`;
  };

  return (
    <>
      <Helmet>
        <title>Contact & Support | Keja-Connect</title>
        <meta
          name="description"
          content="Contact Keja-Connect for support, bug reports, feature requests, and help with rental operations."
        />
      </Helmet>

      <PageContainer title="Contact & Support" subtitle="Get in touch quickly">
        <div className="space-y-5">
          <Card className="surface-panel">
            <CardContent className="pt-6 text-sm text-muted-foreground leading-relaxed">
              If you run into issues, need product help, or want to suggest an improvement, use the options
              below. Clear feedback helps us improve Keja-Connect faster.
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-28 flex flex-col gap-2 border-destructive/30 hover:bg-destructive/5"
              onClick={() => handleFeedback("Bug")}
            >
              <Bug className="h-6 w-6 text-destructive" />
              <span className="text-xs font-semibold">Report a Bug</span>
            </Button>

            <Button
              variant="outline"
              className="h-28 flex flex-col gap-2 border-primary/30 hover:bg-primary/5"
              onClick={() => handleFeedback("Feature")}
            >
              <Lightbulb className="h-6 w-6 text-primary" />
              <span className="text-xs font-semibold">Request a Feature</span>
            </Button>
          </div>

          <Card className="elevate">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Direct Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Call / WhatsApp
                    </p>
                    <p className="text-sm font-semibold truncate">{contactData.phone}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.open(`https://wa.me/${contactData.phone.replace("+", "")}`, "_blank")}
                >
                  Chat
                </Button>
              </div>

              <div className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Email
                    </p>
                    <a href={`mailto:${contactData.email}`} className="text-sm font-semibold text-primary hover:underline">
                      {contactData.email}
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Website
                    </p>
                    <a
                      href={contactData.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      eddie-ezekiel.com
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Support FAQ</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="contact-1">
                  <AccordionTrigger>What should I include in a bug report?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Include the page name, the exact action you took, what you expected, what happened,
                    and screenshots if possible.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="contact-2">
                  <AccordionTrigger>How quickly can I expect a response?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Response times vary, but clear reports with reproducible steps are usually resolved
                    faster than generic issue descriptions.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="contact-3">
                  <AccordionTrigger>Can I request custom features?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes. Use "Request a Feature" and describe your workflow, the problem, and the desired
                    outcome so prioritization is easier.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="contact-4">
                  <AccordionTrigger>Which channel is best for urgent issues?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    WhatsApp is best for urgent operational blockers. Email is better for detailed issue
                    reports and feature requests.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}

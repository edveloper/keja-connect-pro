import { Helmet } from "react-helmet-async";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, Globe, Bug, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  const contactData = {
    name: "Eddie Ezekiel Ochieng",
    phone: "+254702931920",
    email: "ed.veloper10@gmail.com",
    website: "https://www.eddie-ezekiel.com/",
  };

  const handleFeedback = (type: "Bug" | "Feature") => {
    const subject = encodeURIComponent(`Keja Connect: ${type} Report`);
    const body = encodeURIComponent(
      `Hello Eddie,\n\nI would like to report a ${type.toLowerCase()} in Keja Connect:\n\n[Describe issue here]\n\nProperty/User: `
    );
    window.location.href = `mailto:${contactData.email}?subject=${subject}&body=${body}`;
  };

  return (
    <>
      {/* SEO METADATA */}
      <Helmet>
        <title>Contact & Support | Keja-Connect</title>
        <meta
          name="description"
          content="Contact Keja-Connect for support, bug reports, feature requests, and property management assistance for Kenyan landlords."
        />
      </Helmet>

      <PageContainer title="Contact & Support" subtitle="Get in touch with the developer">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          
          {/* SEO CONTENT BLOCK */}
          <section className="text-sm text-muted-foreground leading-relaxed">
            <p>
              Keja-Connect is a Kenyan-built property management platform designed
              to help landlords manage tenants, track rent payments, and monitor
              expenses efficiently. If you need technical support, want to report
              a bug, or have an idea that could improve the platform, you’re
              encouraged to get in touch.
            </p>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-28 flex flex-col gap-2 border-destructive/20 hover:bg-destructive/5"
              onClick={() => handleFeedback("Bug")}
            >
              <Bug className="h-6 w-6 text-destructive" />
              <span className="text-xs font-semibold">Report a Bug</span>
            </Button>

            <Button
              variant="outline"
              className="h-28 flex flex-col gap-2 border-primary/20 hover:bg-primary/5"
              onClick={() => handleFeedback("Feature")}
            >
              <Lightbulb className="h-6 w-6 text-primary" />
              <span className="text-xs font-semibold">Request Feature</span>
            </Button>
          </div>

          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4 p-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Call / WhatsApp
                  </p>
                  <p className="text-sm font-semibold">{contactData.phone}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white rounded-full px-4"
                  onClick={() =>
                    window.open(
                      `https://wa.me/${contactData.phone.replace("+", "")}`,
                      "_blank"
                    )
                  }
                >
                  Chat
                </Button>
              </div>

              <div className="flex items-center gap-4 p-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Email Support
                  </p>
                  <a
                    href={`mailto:${contactData.email}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {contactData.email}
                  </a>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={contactData.website}
                    target="_blank"
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    eddie-ezekiel.com
                  </a>
                </div>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                  Developer Profile
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}

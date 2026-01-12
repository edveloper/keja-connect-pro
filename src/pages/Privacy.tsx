import { PageContainer } from "@/components/layout/PageContainer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, Lock, EyeOff, Scale } from "lucide-react";

export default function Privacy() {
  return (
    <PageContainer 
      title="Privacy & Policy" 
      subtitle="Data handling and usage terms"
    >
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm animate-in fade-in">
        <div className="flex items-center gap-3 text-primary mb-6">
          <ShieldCheck className="h-8 w-8" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Our Commitment</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Keja Connect Privacy Standards</p>
          </div>
        </div>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
            
            {/* Data Storage */}
            <section>
              <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                <Lock className="h-4 w-4 text-primary" />
                <h3>1. Secure Data Management</h3>
              </div>
              <p>
                Keja Connect stores property details, tenant information (names and phone numbers), and financial records securely. 
                This data is stored to facilitate your rent collection and expense tracking. We do not share your private financial 
                performance with any third-party marketing agencies.
              </p>
            </section>

            {/* Tenant Privacy */}
            <section>
              <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                <EyeOff className="h-4 w-4 text-primary" />
                <h3>2. Tenant Confidentiality</h3>
              </div>
              <p>
                As a landlord, you are responsible for the tenant data you enter into the system. Keja Connect 
                acts as your digital ledger. We recommend ensuring you have consent from tenants before storing 
                their contact information for business management purposes.
              </p>
            </section>

            {/* Financial Disclaimer */}
            <section>
              <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                <Scale className="h-4 w-4 text-primary" />
                <h3>3. Accuracy & Disclaimers</h3>
              </div>
              <p>
                Keja Connect is a record-keeping tool designed for Kenyan landlords. While the app automates 
                calculations for arrears, overpayments, and net income, these figures depend entirely on the 
                data you provide. Always cross-verify totals before initiating legal or formal financial actions.
              </p>
            </section>

            {/* Contact Usage */}
            <section className="bg-muted/50 p-4 rounded-xl border border-border/50">
              <h3 className="font-bold text-foreground mb-2 text-xs uppercase">Compliance Note</h3>
              <p className="text-xs italic">
                This app is intended to simplify property management in Kenya. By using Keja Connect, you agree 
                to keep your login credentials secure to prevent unauthorized access to your business records.
              </p>
            </section>

            <div className="text-center pt-4 border-t border-border/50">
              <p className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
                Keja Connect — Property Management Simplified
              </p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </PageContainer>
  );
}
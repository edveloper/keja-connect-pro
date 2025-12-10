import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { parseMpesaText, phonesMatch } from "@/lib/mpesa-parser";
import { mockTenants } from "@/stores/mockData";
import { ParsedPayment, Tenant } from "@/types";
import { FileText, Zap, CheckCircle2, XCircle, User, Phone, Banknote } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MatchedPayment extends ParsedPayment {
  tenant?: Tenant;
  status: "matched" | "unmatched";
}

export default function Reconcile() {
  const [smsText, setSmsText] = useState("");
  const [results, setResults] = useState<MatchedPayment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);

  const handleProcess = () => {
    if (!smsText.trim()) {
      toast({ 
        title: "No text provided", 
        description: "Paste your M-Pesa SMS messages first", 
        variant: "destructive" 
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing delay for UX
    setTimeout(() => {
      const parsed = parseMpesaText(smsText);
      
      const matched: MatchedPayment[] = parsed.map(payment => {
        const tenant = mockTenants.find(t => phonesMatch(t.phone, payment.phone));
        return {
          ...payment,
          tenant,
          status: tenant ? "matched" : "unmatched",
        };
      });

      setResults(matched);
      setIsProcessing(false);
      setIsProcessed(true);

      const matchedCount = matched.filter(m => m.status === "matched").length;
      
      if (parsed.length === 0) {
        toast({ 
          title: "No payments found", 
          description: "Could not extract any payment information from the text",
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Processing complete", 
          description: `Found ${parsed.length} payment(s), ${matchedCount} matched to tenants` 
        });
      }
    }, 800);
  };

  const handleSavePayments = () => {
    const matched = results.filter(r => r.status === "matched");
    toast({ 
      title: "Payments Saved", 
      description: `${matched.length} payment(s) recorded. Connect Supabase to persist.` 
    });
    setSmsText("");
    setResults([]);
    setIsProcessed(false);
  };

  const matchedCount = results.filter(r => r.status === "matched").length;
  const unmatchedCount = results.filter(r => r.status === "unmatched").length;

  return (
    <PageContainer title="Reconcile Payments" subtitle="Match M-Pesa messages to tenants">
      <Card className="p-4 mb-4 bg-accent/50 border-accent">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">How it works</p>
            <p className="text-muted-foreground mt-1">
              Paste your M-Pesa confirmation messages below. The app will match phone numbers to your tenants and record payments automatically.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Textarea
          placeholder="Paste M-Pesa SMS messages here...

Example:
RLC123ABC Confirmed. Ksh25,000.00 received from JOHN KAMAU 0712345678 on 10/12/24 at 2:30 PM. New M-PESA balance is Ksh150,000.00."
          value={smsText}
          onChange={(e) => {
            setSmsText(e.target.value);
            if (isProcessed) setIsProcessed(false);
          }}
          className="min-h-[180px] text-base font-mono"
        />

        <Button 
          onClick={handleProcess}
          disabled={isProcessing || !smsText.trim()}
          className="w-full h-14 text-lg font-semibold"
        >
          {isProcessing ? (
            <>
              <Zap className="h-5 w-5 mr-2 animate-pulse" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 mr-2" />
              Process SMS
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Results</h3>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-4 w-4" />
                {matchedCount}
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="h-4 w-4" />
                {unmatchedCount}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {results.map((result, index) => (
              <Card 
                key={index}
                className={cn(
                  "p-4 animate-slide-up",
                  result.status === "matched" 
                    ? "border-success/30 bg-success/5" 
                    : "border-destructive/30 bg-destructive/5"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    {result.tenant ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-success" />
                        <span className="font-medium text-foreground">{result.tenant.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="font-medium text-destructive">No matching tenant</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{result.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">KES {result.amount.toLocaleString()}</span>
                      {result.mpesaCode && (
                        <span className="text-muted-foreground">• {result.mpesaCode}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge 
                    status={result.status === "matched" ? "paid" : "arrears"} 
                  />
                </div>
              </Card>
            ))}
          </div>

          {matchedCount > 0 && (
            <Button 
              onClick={handleSavePayments}
              className="w-full h-12 text-base font-semibold mt-4"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Save {matchedCount} Payment{matchedCount > 1 ? "s" : ""}
            </Button>
          )}
        </div>
      )}
    </PageContainer>
  );
}

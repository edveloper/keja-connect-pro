import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileDown, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Same rule as the server: capitals and stray spaces are not differences.
const normalise = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();
const WORD = "DELETE";

/**
 * Deletes the account for good. There is no undo, so the panel says what goes,
 * points to the exports first, and asks for a typed word and the password. The
 * word stops a slip of the thumb. The password stops whoever else is holding an
 * unlocked phone.
 */
export function DeleteAccountPanel({ onCancel }: { onCancel: () => void }) {
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const matches = normalise(typed) === normalise(WORD);

  const handleDelete = async () => {
    if (!matches || !password || isDeleting) return;
    setIsDeleting(true);

    const { data, error } = await supabase.functions.invoke("delete-account", {
      body: { confirm: typed, password },
    });

    if (error || !data?.deleted) {
      // A non-2xx answer keeps its message in the response body.
      let message = data?.error as string | undefined;
      const response = (error as { context?: Response } | null)?.context;
      if (!message && response?.json) {
        message = await response.json().then((b) => b?.error).catch(() => undefined);
      }
      toast({
        title: "Could Not Delete Your Account",
        description: message || "Check your connection and try again.",
        variant: "destructive",
      });
      setIsDeleting(false);
      return;
    }

    // The account is gone, so the markers this phone kept for it go too.
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("rentkonnect:"))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      // Storage can be unavailable. Nothing in it matters any more.
    }
    await supabase.auth.signOut();
    window.location.replace("/delete-account?deleted=1");
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">This Cannot Be Undone</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your login goes straight away, along with every property, unit and tenant, every rent
          charge and payment, your expenses and your settings. We cannot get any of it back for
          you afterwards, even if you ask.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Keep a Copy First</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your statements may still matter to you, for tax or for a lender. Reports lets you export
          them before you go.
        </p>
        <Button variant="outline" className="w-full" onClick={() => navigate("/reports")} disabled={isDeleting}>
          <FileDown className="h-4 w-4 mr-2" />
          Go to Reports
        </Button>
      </div>

      <div className="space-y-2">
        <label htmlFor="delete-confirm" className="text-sm font-semibold block">
          Type <span className="text-destructive">{WORD}</span> to Confirm
        </label>
        <Input
          id="delete-confirm"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={isDeleting}
        />
        <label htmlFor="delete-password" className="text-sm font-semibold block pt-1">
          Your Password
        </label>
        <Input
          id="delete-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          disabled={isDeleting}
        />
        <p className="text-xs text-muted-foreground">
          Forgotten it? Sign out and reset it from the sign-in screen, then come back.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={!matches || !password || isDeleting}>
          {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
          {isDeleting ? "Deleting..." : "Delete for Good"}
        </Button>
      </div>
    </div>
  );
}

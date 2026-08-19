import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, ArrowLeft, MailCheck, Loader2 } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "reset";

/** Minimum Supabase enforces. Stated up front rather than after a failed submit. */
const MIN_PASSWORD = 6;

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    if (next !== "signin") setPassword("");
  }

  const passwordTooShort =
    mode === "signup" && password.length > 0 && password.length < MIN_PASSWORD;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "signup" && password.length < MIN_PASSWORD) {
      setError(`Your password needs at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setLoading(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        // Deliberately the same message whether or not the address exists, so
        // this page cannot be used to discover who has an account.
        setNotice(
          `If an account exists for ${email.trim()}, a reset link is on its way. Check your spam folder too.`
        );
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data.session) {
          // Email confirmation is off; the auth listener in App takes over.
          return;
        }
        setNotice(
          `Account created. Check ${email.trim()} for a confirmation link, then sign in.`
        );
        setMode("signin");
        setPassword("");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(getSupabaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const copy = {
    signin: {
      title: "Sign in",
      sub: "Pick up where you left off.",
      cta: "Sign in",
      busy: "Signing in…",
    },
    signup: {
      title: "Create your account",
      sub: "Free to set up. Add your first property in a few minutes.",
      cta: "Create account",
      busy: "Creating account…",
    },
    reset: {
      title: "Reset your password",
      sub: "We'll email you a link to set a new one.",
      cta: "Send reset link",
      busy: "Sending…",
    },
  }[mode];

  return (
    <>
      <Helmet>
        <title>{copy.title} | RentKonnect</title>
        <meta
          name="description"
          content="Sign in to RentKonnect — rent tracking for Kenyan landlords. Know who has paid, who owes what, and what you actually made this month."
        />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        {/* Brand band. Ink, so the first thing a landlord sees is the chrome
            colour rather than another white card. */}
        <div className="bg-foreground text-background px-6 pt-12 pb-10">
          <div className="mx-auto w-full max-w-md">
            <Wordmark className="text-3xl [&_p:first-child]:text-background" />
            <p className="mt-3 text-sm text-background/70 max-w-sm">
              Rent tracking built for Kenyan landlords. Every shilling accounted for.
            </p>
          </div>
        </div>

        <div className="flex-1 px-6 pb-16 -mt-6">
          <div className="mx-auto w-full max-w-md">
            <div className="surface-panel p-6">
              <div className="mb-5">
                {mode === "reset" && (
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to sign in
                  </button>
                )}
                <h1 className="text-xl font-bold tracking-tight">{copy.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">{copy.sub}</p>
              </div>

              {notice && (
                <Alert className="mb-4 border-success/30 bg-success/5">
                  <MailCheck className="h-4 w-4 text-success" aria-hidden="true" />
                  <AlertDescription className="text-sm">{notice}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {mode !== "reset" && (
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => switchMode("reset")}
                          className="text-xs font-medium text-primary hover:underline underline-offset-2"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-11"
                        aria-invalid={passwordTooShort}
                        aria-describedby={mode === "signup" ? "password-hint" : undefined}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>

                    {mode === "signup" && (
                      <p
                        id="password-hint"
                        className={cn(
                          "text-xs",
                          passwordTooShort ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        At least {MIN_PASSWORD} characters.
                      </p>
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      {copy.busy}
                    </>
                  ) : (
                    copy.cta
                  )}
                </Button>
              </form>

              {mode !== "reset" && (
                <div className="mt-5 pt-5 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    {mode === "signup" ? "Already have an account?" : "New to RentKonnect?"}{" "}
                    <button
                      type="button"
                      onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
                      className="font-semibold text-primary hover:underline underline-offset-2"
                    >
                      {mode === "signup" ? "Sign in" : "Create an account"}
                    </button>
                  </p>
                </div>
              )}
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Your records are private to your account.{" "}
              <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                How we handle your data
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import { currentMonthKey } from "@/lib/month";

// Layout
import { BottomNav } from "@/components/layout/BottomNav";

// Pages (Public)
import AuthPage from "./pages/Auth";
import Help from "./pages/Help";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import About from "./pages/About";


// Pages (Private)
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

function AppBootScreen() {
  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-6">
      <div className="surface-panel w-full max-w-sm p-8 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground font-semibold">
          Keja-Connect
        </p>
        <h1 className="mt-2 text-xl font-bold text-foreground">Loading your workspace</h1>
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

/**
 * Makes sure the signed-in landlord has a rent charge for every month up to
 * now, then stays out of the way.
 *
 * A nightly pg_cron job does this for everyone; this is the fallback that keeps
 * billing correct if the extension is unavailable, and it closes the gap
 * between midnight and the landlord opening the app on the 1st.
 */
function MonthlyBilling({ session }: { session: Session | null }) {
  useEffect(() => {
    if (!session) return;

    const billedKey = `keja:billed:${session.user.id}`;
    const thisMonth = currentMonthKey();
    if (localStorage.getItem(billedKey) === thisMonth) return;

    supabase
      .rpc("generate_monthly_charges", { p_month_key: null })
      .then(({ error }) => {
        if (error) {
          console.error("Monthly rent billing failed:", error.message);
          return;
        }
        localStorage.setItem(billedKey, thisMonth);
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["tenant-ledger"] });
      });
  }, [session]);

  return null;
}

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <AppBootScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />

        <BrowserRouter>
          <MonthlyBilling session={session} />
          <Routes>
            {/* Public pages. Reachable signed out so the app can be found and trusted. */}
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<Help />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/" replace />} />

            {session ? (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/tenants" element={<Tenants />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </>
            ) : (
              // Send signed-out visitors to the login page rather than a 404.
              <>
                <Route path="/" element={<Navigate to="/auth" replace />} />
                <Route path="/properties" element={<Navigate to="/auth" replace />} />
                <Route path="/tenants" element={<Navigate to="/auth" replace />} />
                <Route path="/expenses" element={<Navigate to="/auth" replace />} />
                <Route path="/reports" element={<Navigate to="/auth" replace />} />
                <Route path="/settings" element={<Navigate to="/auth" replace />} />
              </>
            )}

            <Route path="*" element={<NotFound />} />
          </Routes>

          {session && <BottomNav />}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

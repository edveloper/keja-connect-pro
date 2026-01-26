import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MigrationRunner } from "@/components/migration/MigrationRunner";

// Layout
import { BottomNav } from "@/components/layout/BottomNav";

// Pages (Public)
import AuthPage from "./pages/Auth";
import Help from "./pages/Help";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

// Pages (Private)
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
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

  if (loading) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />

        <BrowserRouter>
          <Routes>
            {/* 🌍 PUBLIC ROUTES (SEO / TRUST) */}
            <Route path="/help" element={<Help />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/" replace />} />

            {/* 🔐 PRIVATE APP ROUTES */}
            {session ? (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/tenants" element={<Tenants />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/migrate" element={<MigrationRunner />} />
              </>
            ) : (
              <Route path="/" element={<Navigate to="/auth" replace />} />
            )}

            {/* ❌ FALLBACK */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          {/* Bottom nav only when logged in */}
          {session && <BottomNav />}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

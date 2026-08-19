import { useState } from "react";
import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Wallet,
  BarChart3,
  MoreHorizontal,
  Building2,
  Settings,
  HelpCircle,
  Info,
  ShieldCheck,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Five slots, ordered by how often a landlord needs them.
 *
 * Properties used to hold the second slot despite being setup you do once;
 * tenants and money are the daily job. It now lives in More, alongside
 * Settings — which previously had exactly one entry point, buried in a kebab
 * menu, despite holding the paybill and the spreadsheet import.
 */
const NAV_ITEMS: Array<{ to: string; icon: LucideIcon; label: string }> = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/tenants", icon: Users, label: "Tenants" },
  { to: "/expenses", icon: Wallet, label: "Expenses" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
];

/** Tools, which need a line explaining what is inside. */
const MORE_ITEMS: Array<{ to: string; icon: LucideIcon; label: string; detail: string }> = [
  {
    to: "/properties",
    icon: Building2,
    label: "Properties & units",
    detail: "Add buildings, add or rename houses",
  },
  {
    to: "/settings",
    icon: Settings,
    label: "Settings",
    detail: "Payment details, spreadsheet import, past tenants",
  },
];

/** Reference pages: read once, rarely returned to, so no explanation needed. */
const REFERENCE_ITEMS: Array<{ to: string; icon: LucideIcon; label: string }> = [
  { to: "/help", icon: HelpCircle, label: "Help" },
  { to: "/about", icon: Info, label: "About" },
  { to: "/privacy", icon: ShieldCheck, label: "Privacy" },
  { to: "/contact", icon: MessageSquare, label: "Contact" },
];

/** Routes that live behind More, so the More tab lights up while you're on them. */
const MORE_ROUTES = [...MORE_ITEMS, ...REFERENCE_ITEMS].map((i) => i.to);

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const moreIsActive = MORE_ROUTES.includes(location.pathname);

  const go = (to: string) => {
    setMoreOpen(false);
    navigate(to);
  };

  const itemClass = (active: boolean) =>
    cn(
      "flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-md min-w-0 flex-1",
      "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-active",
      active ? "text-nav-active" : "text-nav-foreground hover:text-background"
    );

  return (
    <>
      {/* Full-bleed ink band rather than a floating pill.
       *
       * Two problems with the pill: the colour class was `bg-nav-background`,
       * which Tailwind does not generate — the palette is nested under `nav`,
       * so the correct class is `bg-nav`, and the bar was rendering with no
       * background at all. And even once painted, a floating pill leaves
       * transparent gutters at the sides and below it that page content scrolls
       * through. Anchoring the band to the edges fixes both, and reads more
       * like chrome. The safe-area padding sits inside the ink so the colour
       * reaches the bottom of the screen on a notched phone. */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-nav shadow-nav safe-bottom"
        aria-label="Main"
      >
        <div className="mx-auto w-full max-w-lg px-1">
          <div className="flex items-stretch justify-around h-16">
              {NAV_ITEMS.map((item) => (
                <RouterNavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) => itemClass(isActive && !moreIsActive)}
                >
                  {({ isActive }) => {
                    const active = isActive && !moreIsActive;
                    return (
                      <>
                        {/* The active marker is a rule above the icon rather than a
                            filled pill — quieter, and it reads on dark chrome. */}
                        <span
                          className={cn(
                            "h-0.5 w-6 rounded-full -mt-1",
                            active ? "bg-nav-active" : "bg-transparent"
                          )}
                          aria-hidden="true"
                        />
                        <item.icon
                          className="h-5 w-5 flex-shrink-0"
                          strokeWidth={active ? 2.4 : 1.8}
                          aria-hidden="true"
                        />
                        <span
                          className={cn("text-xs truncate", active ? "font-semibold" : "font-medium")}
                        >
                          {item.label}
                        </span>
                      </>
                    );
                  }}
                </RouterNavLink>
              ))}

              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={itemClass(moreIsActive)}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
              >
                <span
                  className={cn(
                    "h-0.5 w-6 rounded-full -mt-1",
                    moreIsActive ? "bg-nav-active" : "bg-transparent"
                  )}
                  aria-hidden="true"
                />
                <MoreHorizontal
                  className="h-5 w-5 flex-shrink-0"
                  strokeWidth={moreIsActive ? 2.4 : 1.8}
                  aria-hidden="true"
                />
                <span className={cn("text-xs truncate", moreIsActive ? "font-semibold" : "font-medium")}>
                  More
                </span>
              </button>
          </div>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        {/* Constrained to the app column and sized to its content.
         *
         * `side="bottom"` is `inset-x-0`, so on a desktop window the panel
         * spanned the full width while the app itself sits in a max-w-lg
         * column. It also filled most of the screen because seven two-line
         * rows is roughly 640px of content — so the four reference pages are
         * now a compact grid rather than four full rows. */}
        <SheetContent
          side="bottom"
          className="mx-auto max-w-lg rounded-t-lg p-0 pb-[max(env(safe-area-inset-bottom),1rem)]"
        >
          <SheetHeader className="px-5 pt-5 pb-3 text-left">
            <SheetTitle className="text-base">More</SheetTitle>
          </SheetHeader>

          {/* The two that are actually tools keep their explanation. */}
          <div className="border-y border-border divide-y divide-border">
            {MORE_ITEMS.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => go(item.to)}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/60 transition-colors"
              >
                <item.icon
                  className="h-5 w-5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {item.detail}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Reference pages, read once and rarely returned to. */}
          <div className="grid grid-cols-2 gap-px bg-border">
            {REFERENCE_ITEMS.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => go(item.to)}
                className="flex items-center gap-2.5 bg-background px-5 py-3 text-left hover:bg-muted/60 transition-colors"
              >
                <item.icon
                  className="h-4 w-4 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm truncate">{item.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={async () => {
              setMoreOpen(false);
              await supabase.auth.signOut();
              navigate("/auth", { replace: true });
            }}
            className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-destructive border-t border-border hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="text-sm font-semibold">Sign out</span>
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default BottomNav;

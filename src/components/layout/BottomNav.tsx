import { Home, Building2, Users, BarChart3, Wallet } from "lucide-react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/properties", icon: Building2, label: "Properties" },
  { to: "/tenants", icon: Users, label: "Tenants" },
  { to: "/expenses", icon: Wallet, label: "Expenses" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="max-w-lg mx-auto px-3 pb-2">
        <div className="glass rounded-2xl border border-border/60 shadow-nav px-1">
          <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <RouterNavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-0",
              isActive 
                ? "text-primary bg-accent shadow-sm ring-1 ring-primary/15" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200 flex-shrink-0",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(
                  "text-[11px] font-medium truncate",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
              </>
            )}
          </RouterNavLink>
        ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

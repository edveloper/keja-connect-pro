import { Home, Building2, Users, FileText, Wallet } from "lucide-react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/properties", icon: Building2, label: "Properties" },
  { to: "/tenants", icon: Users, label: "Tenants" },
  { to: "/expenses", icon: Wallet, label: "Expenses" },
  { to: "/reconcile", icon: FileText, label: "Reconcile" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-nav border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => (
          <RouterNavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-2 transition-colors min-w-0",
              isActive ? "text-nav-active" : "text-nav-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-all flex-shrink-0",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(
                  "text-[10px] font-medium truncate",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
              </>
            )}
          </RouterNavLink>
        ))}
      </div>
    </nav>
  );
}

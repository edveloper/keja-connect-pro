import { Home, Building2, FileText, Settings } from "lucide-react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Dashboard" },
  { to: "/properties", icon: Building2, label: "Properties" },
  { to: "/reconcile", icon: FileText, label: "Reconcile" },
  { to: "/settings", icon: Settings, label: "Settings" },
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
              "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors",
              isActive ? "text-nav-active" : "text-nav-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-all",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(
                  "text-xs font-medium",
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

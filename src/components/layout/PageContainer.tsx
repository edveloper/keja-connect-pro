import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Menu,
  HelpCircle,
  ShieldAlert,
  MessageSquare,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function PageContainer({
  children,
  className,
  title,
  subtitle,
}: PageContainerProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Logout failed: " + error.message);
    } else {
      toast.success("Signed out successfully");
    }
  };

  return (
    <div className={cn("min-h-screen pb-24 flex flex-col items-center w-full", className)}>
      {(title || subtitle) && (
        <header className="sticky top-0 z-40 glass border-b border-border/50 shadow-nav w-full flex justify-center">
          <div className="px-5 py-5 w-full max-w-lg flex justify-between items-start">
            <div className="flex-1 min-w-0">
              {title && (
                <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {subtitle}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground -mt-1 shrink-0 ml-2"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Keja Connect</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* ABOUT */}
                <DropdownMenuItem onClick={() => navigate("/about")}>
                  <Info className="mr-2 h-4 w-4" />
                  <span>About Keja Connect</span>
                </DropdownMenuItem>

                {/* HELP */}
                <DropdownMenuItem onClick={() => navigate("/help")}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>How To / Help</span>
                </DropdownMenuItem>

                {/* CONTACT */}
                <DropdownMenuItem onClick={() => navigate("/contact")}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Contact & Feedback</span>
                </DropdownMenuItem>

                {/* PRIVACY */}
                <DropdownMenuItem onClick={() => navigate("/privacy")}>
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  <span>Privacy & Policy</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* LOGOUT */}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      )}

      <main className="px-5 py-5 w-full max-w-lg">
        {children}
      </main>
    </div>
  );
}

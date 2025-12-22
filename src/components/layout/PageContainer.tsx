import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function PageContainer({ children, className, title, subtitle }: PageContainerProps) {
  
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Logout failed: " + error.message);
    } else {
      toast.success("Signed out successfully");
    }
  };

  return (
    /* Changed: Added flex flex-col items-center to ensure the center column is truly centered */
    <div className={cn("min-h-screen pb-24 flex flex-col items-center w-full", className)}>
      {(title || subtitle) && (
        <header className="sticky top-0 z-40 glass border-b border-border/50 shadow-nav w-full flex justify-center">
          <div className="px-5 py-5 w-full max-w-lg flex justify-between items-start">
            <div className="flex-1 min-w-0">
              {title && (
                <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{title}</h1>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1 truncate">{subtitle}</p>
              )}
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive -mt-1 shrink-0 ml-2"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
      )}
      {/* Changed: ensures main content is also locked to the center */}
      <main className="px-5 py-5 w-full max-w-lg">
        {children}
      </main>
    </div>
  );
}
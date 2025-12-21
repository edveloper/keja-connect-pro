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
    <div className={cn("min-h-screen pb-24", className)}>
      {(title || subtitle) && (
        <header className="sticky top-0 z-40 glass border-b border-border/50 shadow-nav">
          <div className="px-5 py-5 max-w-lg mx-auto flex justify-between items-start">
            <div className="flex-1">
              {title && (
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            
            {/* Logout Button added here */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive -mt-1"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
      )}
      <main className="px-5 py-5 max-w-lg mx-auto">
        {children}
      </main>
    </div>
  );
}
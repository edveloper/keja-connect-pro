import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function PageContainer({ children, className, title, subtitle }: PageContainerProps) {
  return (
    <div className={cn("min-h-screen pb-24", className)}>
      {(title || subtitle) && (
        <header className="sticky top-0 z-40 glass border-b border-border/50 shadow-nav">
          <div className="px-5 py-5 max-w-lg mx-auto">
            {title && (
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </header>
      )}
      <main className="px-5 py-5 max-w-lg mx-auto">
        {children}
      </main>
    </div>
  );
}

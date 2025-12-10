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
    <div className={cn("min-h-screen pb-20", className)}>
      {(title || subtitle) && (
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-4 py-4 max-w-lg mx-auto">
            {title && (
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </header>
      )}
      <main className="px-4 py-4 max-w-lg mx-auto">
        {children}
      </main>
    </div>
  );
}

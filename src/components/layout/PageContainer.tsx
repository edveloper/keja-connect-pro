import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/Wordmark";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  /** Optional control shown under the title, e.g. a filter or scope toggle. */
  action?: ReactNode;
}

/**
 * Page frame: pinned masthead, single measured column, room for the bottom nav.
 *
 * The header sticks, matching the bottom nav, so the brand and the page you are
 * on stay visible while scrolling. It needs an opaque background for that: a
 * translucent sticky header lets content show through as it passes underneath,
 * which is exactly how the nav bar failed earlier.
 *
 * Sticky only works here because `.app-shell` uses `overflow-x: clip` rather
 * than `overflow: hidden` — `hidden` would make the shell a scroll container
 * and silently stop the header sticking at all.
 *
 * It used to carry a kebab menu holding About, Settings, Help, Contact, Privacy
 * and a Log out — app configuration, marketing pages and a destructive action
 * in one list, and the only route to Settings anywhere in the app. All of that
 * now lives in the More tab.
 */
export function PageContainer({
  children,
  className,
  title,
  subtitle,
  action,
}: PageContainerProps) {
  return (
    <div className={cn("app-shell min-h-screen pb-28 flex flex-col items-center w-full", className)}>
      {(title || subtitle) && (
        <header className="sticky top-0 z-40 w-full flex justify-center border-b border-border bg-background">
          <div className="px-5 pt-4 pb-3 w-full max-w-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {title && (
                  <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
                )}
              </div>

              {/* Brand sits opposite the page title, so the masthead reads
                  title-left / mark-right on every screen. */}
              <Wordmark className="text-sm shrink-0 pt-1" />
            </div>

            {action && <div className="mt-4">{action}</div>}
          </div>
        </header>
      )}

      <main className="relative px-5 py-5 w-full max-w-lg">{children}</main>
    </div>
  );
}

export default PageContainer;

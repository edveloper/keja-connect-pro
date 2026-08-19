import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, X, Share } from "lucide-react";
import {
  useInstallPrompt,
  isInstallDismissed,
  dismissInstall,
} from "@/hooks/useInstallPrompt";
import { BrandMark } from "@/components/brand/Wordmark";

/**
 * Offers to put RentKonnect on the home screen.
 *
 * Sits above the bottom navigation rather than over the content, and is
 * dismissible for good — an install banner that keeps reappearing is worse
 * than no banner. On iOS there is no install API at all, so tapping through
 * shows the two-step Share menu route instead of a button that cannot work.
 */
export function InstallBanner() {
  const { method, isInstalled, install } = useInstallPrompt();
  const [hidden, setHidden] = useState(isInstallDismissed);
  const [iosOpen, setIosOpen] = useState(false);

  if (isInstalled || hidden || method === "unavailable") return null;

  const hide = () => {
    dismissInstall();
    setHidden(true);
  };

  return (
    <>
      <div className="fixed bottom-[4.5rem] left-0 right-0 z-40 px-3 pb-1">
        <div className="mx-auto max-w-lg border border-border bg-card rounded-lg shadow-card p-3 flex items-center gap-3">
          <BrandMark className="h-9 w-9 text-sm shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Keep RentKonnect on your phone</p>
            <p className="text-xs text-muted-foreground truncate">
              Opens like an app, no browser needed
            </p>
          </div>

          <Button
            size="sm"
            className="shrink-0"
            onClick={() => (method === "prompt" ? install() : setIosOpen(true))}
          >
            <Download className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
            <span className="hidden sm:inline">Install</span>
            <span className="sr-only sm:hidden">Install RentKonnect</span>
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0 text-muted-foreground"
            onClick={hide}
            aria-label="Do not show this again"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to your home screen</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Safari does not have an install button, so this takes two taps:
          </p>

          <ol className="space-y-3 mt-1">
            <li className="flex gap-3">
              <span
                className="h-6 w-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                1
              </span>
              <span className="text-sm">
                Tap the <Share className="h-4 w-4 inline mx-0.5 -mt-0.5" aria-label="Share" />{" "}
                Share button at the bottom of Safari.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                className="h-6 w-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                2
              </span>
              <span className="text-sm">
                Scroll down and choose <strong>Add to Home Screen</strong>.
              </span>
            </li>
          </ol>

          <Button className="w-full mt-2" onClick={() => setIosOpen(false)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default InstallBanner;

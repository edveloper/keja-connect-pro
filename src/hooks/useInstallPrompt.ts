// src/hooks/useInstallPrompt.ts
//
// Installing the app to the home screen.
//
// Two very different platforms:
//   Android / Chrome  fires `beforeinstallprompt`, which can be captured and
//                     replayed from a button of our own.
//   iOS / Safari      fires nothing and exposes no API. The only route is
//                     Share → Add to Home Screen, so all we can do is say so.
//
// Anything that assumes the event will fire simply shows nothing on an iPhone,
// which is most of the second-hand phones this app runs on.

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallMethod = "prompt" | "ios-manual" | "unavailable";

export interface InstallState {
  /** Already running from the home screen. */
  isInstalled: boolean;
  /** How this browser can install, if at all. */
  method: InstallMethod;
  /** Fire the native prompt. Resolves true if the landlord accepted. */
  install: () => Promise<boolean>;
}

const DISMISS_KEY = "rentkonnect:install-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari predates the display-mode media query.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac; the touch points give it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Stop Chrome showing its own mini-infobar so the app can ask in context.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome === "accepted";
  }, [deferred]);

  const method: InstallMethod = installed
    ? "unavailable"
    : deferred
      ? "prompt"
      : isIos()
        ? "ios-manual"
        : "unavailable";

  return { isInstalled: installed, method, install };
}

/** Whether the landlord has already waved the banner away. */
export function isInstallDismissed(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissInstall(): void {
  if (typeof localStorage !== "undefined") localStorage.setItem(DISMISS_KEY, "1");
}

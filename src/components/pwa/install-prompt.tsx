"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "mf-pwa-dismiss";
const DISMISS_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

function isDismissedRecently(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data.dismissed && Date.now() - data.timestamp < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    function handlePrompt(e: Event) {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(evt);

      if (isDismissedRecently()) return;

      timerRef.current = setTimeout(() => {
        setVisible(true);
      }, 5000);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);

    if (outcome === "accepted" && "Notification" in window) {
      await Notification.requestPermission();
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ dismissed: true, timestamp: Date.now() }),
      );
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="mx-auto flex max-w-lg items-center gap-4 rounded-xl bg-amber-400 p-4 text-black shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-96x96.png"
          alt="MarketFlow"
          width={48}
          height={48}
          className="shrink-0 rounded-lg"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Install MarketFlow</p>
          <p className="text-xs opacity-80">
            Add to your home screen for quick access and offline use.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleDismiss}
            className="rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-amber-500/40"
          >
            Dismiss
          </button>
          <button
            onClick={handleInstall}
            className="rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-black/80"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

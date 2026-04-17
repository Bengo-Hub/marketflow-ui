"use client";

import { useCallback, useEffect, useState } from "react";

export function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
      return;

    let cancelled = false;

    navigator.serviceWorker.ready.then((registration) => {
      if (cancelled) return;

      // Check if there is already a waiting worker
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setVisible(true);
        return;
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(newWorker);
            setVisible(true);
          }
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdate = useCallback(() => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    setVisible(false);
    window.location.reload();
  }, [waitingWorker]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 p-4">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-4 rounded-xl bg-amber-400 p-4 text-black shadow-lg">
        <p className="text-sm font-medium">A new version is available.</p>
        <button
          onClick={handleUpdate}
          className="shrink-0 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-black/80"
        >
          Update now
        </button>
      </div>
    </div>
  );
}

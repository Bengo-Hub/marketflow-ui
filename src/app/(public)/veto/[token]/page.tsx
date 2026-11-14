"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AppCanvas } from "@/components/ui-kit";
import { cancelVetoPost, getVetoPost, type VetoPost } from "@/lib/api/public";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "full", timeStyle: "short" });

/**
 * The heads-up email's "Cancel this post" link (ad autopilot veto window, Sprint 20). Opening the
 * link only shows the post; cancelling takes a click here, so an email scanner that opens links
 * never cancels anything. The signed, expiring token is the authority; no login is needed.
 */
export default function VetoPage() {
  const { token } = useParams<{ token: string }>();
  const [post, setPost] = useState<VetoPost | null | undefined>(undefined);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void getVetoPost(token).then((p) => {
      if (live) setPost(p);
    });
    return () => {
      live = false;
    };
  }, [token]);

  const cancel = async () => {
    setBusy(true);
    try {
      const r = await cancelVetoPost(token);
      setResult({ ok: true, message: r.message });
      setPost((p) => (p ? { ...p, state: r.state || "vetoed", can_cancel: false } : p));
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "Could not cancel the post. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-surface relative min-h-dvh">
      <AppCanvas />
      <main className="mx-auto max-w-xl px-4 py-10 sm:py-14">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Cancel a scheduled post</h1>
        {post === undefined && <p className="mt-4 text-sm text-muted-foreground">Loading...</p>}
        {post === null && (
          <p className="mt-4 text-sm text-muted-foreground">
            This link is not valid any more. Open your MarketFlow studio to see your posts.
          </p>
        )}
        {post && (
          <div className="mt-6 space-y-4 rounded-xl border border-border bg-background/80 p-5 text-sm">
            <p>
              <span className="font-medium">{post.business}</span>: a video ad for <span className="font-medium">{post.offering}</span>
            </p>
            {post.places.length > 0 && <p className="text-muted-foreground">Where: {post.places.join(", ")}</p>}
            {post.publish_at && <p className="text-muted-foreground">When: {when.format(new Date(post.publish_at))}</p>}
            {post.caption && <p className="whitespace-pre-line text-muted-foreground">{post.caption}</p>}
            {post.state === "vetoed" && !result && <p className="font-medium">This post was already cancelled.</p>}
            {post.state === "released" && <p className="font-medium">The veto window has ended and the post went ahead.</p>}
            {post.can_cancel && (
              <Button variant="destructive" disabled={busy} onClick={() => void cancel()}>
                {busy ? "Cancelling..." : "Cancel this post"}
              </Button>
            )}
            {result && (
              <p role="status" className={result.ok ? "font-medium" : "font-medium text-destructive"}>
                {result.message}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

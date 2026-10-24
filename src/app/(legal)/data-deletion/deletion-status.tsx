"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/api/client";

type Status = { confirmation_code: string; status: string; requested_at: string };

/** Looks up a deletion confirmation code (marketflow-api GET /public/data-deletion/{code}). */
export function DeletionStatus() {
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [result, setResult] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function check(c: string) {
    const value = c.trim();
    if (!value) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/public/data-deletion/${encodeURIComponent(value)}`);
      if (res.status === 404) {
        setError("We have no deletion request with this code. Check the code Meta gave you.");
        return;
      }
      if (!res.ok) {
        setError("The status could not be checked right now. Try again shortly.");
        return;
      }
      setResult((await res.json()) as Status);
    } catch {
      setError("The status could not be checked right now. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  // A code in the link Meta shows is checked straight away.
  useEffect(() => {
    const initial = params.get("code");
    if (initial) void check(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="glass-strong space-y-4 rounded-2xl p-5">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void check(code);
        }}
      >
        <label htmlFor="deletion-code" className="sr-only">
          Confirmation code
        </label>
        <Input
          id="deletion-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Confirmation code"
          autoComplete="off"
          className="font-mono"
        />
        <Button type="submit" disabled={loading || !code.trim()}>
          <Search className="mr-1.5 h-4 w-4" />
          {loading ? "Checking" : "Check status"}
        </Button>
      </form>

      {result && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium text-foreground">
              {result.status === "completed" ? "Deleted" : `Status: ${result.status}`}
            </p>
            <p className="text-muted-foreground">
              Request {result.confirmation_code}, received{" "}
              {new Date(result.requested_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.
            </p>
          </div>
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

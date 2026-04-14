export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-3xl font-semibold">403 — Not allowed</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Your account does not have platform-owner privileges. If you believe this is a mistake,
        contact your platform administrator.
      </p>
      <a href="/" className="rounded bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white">
        Back to home
      </a>
    </div>
  );
}

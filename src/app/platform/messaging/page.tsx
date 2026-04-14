export default function PlatformMessagingPage() {
  const notificationsUrl =
    process.env.NEXT_PUBLIC_NOTIFICATIONS_URL ?? "https://notificationsapi.codevertexitsolutions.com";
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Messaging providers</h1>
        <p className="text-sm text-muted-foreground">
          Email, SMS, WhatsApp and Push provider credentials are managed centrally by the notifications service.
          MarketFlow delegates to it so the same provider pool serves every platform app.
        </p>
      </header>

      <div className="rounded-lg border bg-card p-6">
        <p className="mb-4 text-sm">
          Configure Brevo / SendGrid / Twilio / Africa&apos;s Talking / Meta Cloud API / FCM / APNS at:
        </p>
        <a
          href={`${notificationsUrl}/platform/providers`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Open notifications platform console ↗
        </a>
        <p className="mt-4 text-xs text-muted-foreground">
          This link requires a platform-owner JWT; tenant users cannot access it.
        </p>
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 text-sm">
        <h2 className="mb-2 font-medium">Integration status</h2>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• marketflow-worker dispatches nurture steps via <code>POST /api/v1/{"{tenantId}"}/notifications/messages</code>.</li>
          <li>• Idempotency enforced via <code>Idempotency-Key</code> header (24h Redis SetNX on notifications-api).</li>
          <li>• Rate limits and per-plan quotas are enforced at notifications-api, not here.</li>
        </ul>
      </div>
    </div>
  );
}

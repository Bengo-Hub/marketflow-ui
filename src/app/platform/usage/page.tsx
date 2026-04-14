export default function PlatformUsagePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Usage</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated usage metrics across all tenants. Backed by subscriptions-service usage events.
        </p>
      </header>
      <div className="rounded border bg-muted/20 p-6 text-sm text-muted-foreground">
        Coming soon — publishing of `leads_captured`, `ai_chat_messages`, `emails_sent`, `whatsapp_sent`
        is on the MVP backlog. Until then usage is visible inside subscriptions-ui.
      </div>
    </div>
  );
}

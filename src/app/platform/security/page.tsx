export default function PlatformSecurityPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Security</h1>
        <p className="text-sm text-muted-foreground">
          Encryption key rotation, audit trail, and platform security settings.
        </p>
      </header>
      <div className="rounded border bg-card p-6">
        <h2 className="mb-2 text-base font-medium">Encryption</h2>
        <p className="text-sm text-muted-foreground">
          ProviderSetting secrets are encrypted at rest with AES-256-GCM. Key material is loaded from
          the <code>MF_SECURITY_ENCRYPTION_KEY</code> environment variable (managed via SealedSecret /
          ExternalSecret — never committed).
        </p>
      </div>
      <div className="rounded border bg-card p-6">
        <h2 className="mb-2 text-base font-medium">Audit log</h2>
        <p className="text-sm text-muted-foreground">
          Admin actions (<code>provider.configured</code>, <code>tenant.suspended</code>, <code>plan.overridden</code>)
          are emitted to NATS as outbox events and consumed by marketflow-worker. Audit viewer UI pending.
        </p>
      </div>
    </div>
  );
}

"use client";

import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/ui-kit";
import { AuditLog } from "@/components/audit/audit-log";
import { useTenantAudit } from "@/hooks/use-admin";

export default function ActivityLogPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        icon={<ScrollText />}
        title="Activity log"
        description="Recorded events in your workspace, newest first, with who or what caused them."
      />
      <AuditLog useEntries={useTenantAudit} emptyText="Events such as finished chat conversations and changes to your settings show up here." />
    </div>
  );
}

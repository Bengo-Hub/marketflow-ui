import Link from "next/link";
import { ShieldX } from "lucide-react";
import { AppCanvas } from "@/components/ui-kit";

export default function ForbiddenPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center p-6">
      <AppCanvas />
      <div className="glass max-w-md rounded-[1.75rem] p-8 text-center">
        <ShieldX className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-semibold">You do not have access to this page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area is for platform owners. If you think you should have access, ask your Codevertex administrator.
        </p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Back to home
        </Link>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A labelled form control with optional helper text and an error under it. */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  hintId,
  className,
  action,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  /** Id on the hint line, so the control can point aria-describedby at it. */
  hintId?: string;
  className?: string;
  /** A small control beside the label, such as "Generate with AI". */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

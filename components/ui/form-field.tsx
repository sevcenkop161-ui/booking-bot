import type { ReactNode } from "react";

export const INPUT_CLASS =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none";

export function FormField({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

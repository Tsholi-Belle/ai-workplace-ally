import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-elegant text-primary-foreground">
          {icon}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
      </div>
    </div>
  );
}

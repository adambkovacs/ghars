import { clsx } from "clsx";
import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function SectionCard({
  title,
  eyebrow,
  description,
  action,
  className,
  children,
}: SectionCardProps) {
  return (
    <section
      className={clsx(
        "glass-panel relative overflow-hidden rounded-[2rem] border border-white/10 p-5 shadow-[0_24px_80px_rgba(8,14,32,0.34)] md:p-6",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          {eyebrow ? (
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-cyan-200/70">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-lg font-semibold tracking-tight text-white md:text-xl">{title}</h2>
          {description ? <p className="max-w-2xl text-sm text-slate-300/80">{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

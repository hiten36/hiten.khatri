import { cn } from "../../../utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("wo-panel", className)}>{children}</section>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="wo-section-title">{title}</h2>
        {subtitle ? <p className="wo-muted mt-1 text-sm">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      className={cn("wo-btn", `wo-btn--${variant}`, className)}
      {...props}
    />
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="wo-badge">{children}</span>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="wo-empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="wo-stat">
      <div className="wo-stat__label">{label}</div>
      <div className="wo-stat__value">{value}</div>
      {hint ? <div className="wo-stat__hint">{hint}</div> : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("wo-input", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("wo-input", className)} {...props}>
      {children}
    </select>
  );
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("wo-input wo-textarea", className)} {...props} />;
}

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="wo-label">
      {children}
    </label>
  );
}

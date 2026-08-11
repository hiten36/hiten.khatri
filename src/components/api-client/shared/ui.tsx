import { cn } from "../../../utils/cn";
import { usePresence } from "../../../utils/use-presence";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "method";
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      className={cn(
        "ac-btn",
        `ac-btn--${variant}`,
        size === "sm" && "ac-btn--sm",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("ac-input", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("ac-input ac-select", className)} {...props}>
      {children}
    </select>
  );
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("ac-input ac-textarea", className)} {...props} />;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger" | "info";
}) {
  return <span className={cn("ac-badge", `ac-badge--${tone}`)}>{children}</span>;
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
    <div className="ac-empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
  wide,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const { present, active } = usePresence(open, 220);
  if (!present) return null;
  return (
    <div
      className={cn("ac-modal-root", active && "is-active")}
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className={cn("ac-modal", wide && "ac-modal--wide", active && "is-active")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="ac-modal__header">
          <h2>{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            Esc
          </Button>
        </div>
        <div className="ac-modal__body">{children}</div>
      </div>
    </div>
  );
}

export function MethodBadge({ method }: { method: string }) {
  return (
    <span className={cn("ac-method", `ac-method--${method.toLowerCase()}`)}>
      {method}
    </span>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("ac-panel", className)}>{children}</section>;
}

export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("ac-icon-btn", className)}
      {...props}
    />
  );
}

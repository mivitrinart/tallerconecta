"use client";
/**
 * Biblioteca de componentes de interfaz (Tailwind CSS).
 * Primitivas reutilizadas por el panel del taller, el portal del cliente
 * y el panel de administración.
 */
import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X, AlertTriangle, CheckCircle2, Info, XCircle, Star, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { iniciales } from "@/lib/format";
import { ESTADO_COLOR, ESTADO_LABEL, ESTADO_PUNTO, type EstadoOrdenUi } from "./status";

// ── Botones ────────────────────────────────────────────────────────────────

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost" | "action";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASES: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  success: "btn-success",
  danger: "btn-danger",
  ghost: "btn-ghost",
  action: "btn-action",
};

const SIZE_CLASES: Record<Size, string> = {
  sm: "px-3! py-1.5! text-xs",
  md: "",
  lg: "px-5! py-2.5! text-base",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", href, loading, className, children, disabled, ...rest }: ButtonProps) {
  const cls = cn(VARIANT_CLASES[variant], SIZE_CLASES[size], className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

// ── Tarjetas ───────────────────────────────────────────────────────────────

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 text-brand-600">{icon}</div>}
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

// ── Badges ─────────────────────────────────────────────────────────────────

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("badge", className)}>{children}</span>;
}

export function StatusBadge({ estado, className }: { estado: EstadoOrdenUi; className?: string }) {
  return (
    <span className={cn("badge", ESTADO_COLOR[estado], className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", ESTADO_PUNTO[estado])} />
      {ESTADO_LABEL[estado]}
    </span>
  );
}

const ESTADOS_PRESUPUESTO: Record<string, { label: string; cls: string }> = {
  borrador: { label: "Borrador", cls: "bg-slate-100 text-slate-600 border-slate-300" },
  enviada: { label: "Enviada · Pendiente", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  aprobada: { label: "Aprobada", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  parcialmente_aprobada: { label: "Aprobada parcialmente", cls: "bg-teal-100 text-teal-800 border-teal-300" },
  rechazada: { label: "Rechazada", cls: "bg-red-100 text-red-700 border-red-300" },
  postergada: { label: "Aplazada por el cliente", cls: "bg-sky-100 text-sky-700 border-sky-300" },
  superada: { label: "Superada (versión anterior)", cls: "bg-slate-100 text-slate-400 border-slate-200" },
};

export function EstimateStatusBadge({ estado }: { estado: string }) {
  const cfg = ESTADOS_PRESUPUESTO[estado] ?? { label: estado, cls: "bg-slate-100 text-slate-600 border-slate-300" };
  return <span className={cn("badge", cfg.cls)}>{cfg.label}</span>;
}

// ── Formularios ────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  // Generate a valid HTML ID from label (sanitize special chars, ensure uniqueness)
  const baseId = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const fieldId = `field-${baseId}`;

  // Find the first valid input element to attach the ID
  let inputElement: React.ReactElement | null = null;
  const childrenArray = React.Children.toArray(children);
  for (const child of childrenArray) {
    if (React.isValidElement(child)) {
      const type = child.type as string;
      if (
        type === "input" ||
        type === "textarea" ||
        type === "select" ||
        (typeof type === "object" && type !== null && (type as any).$$typeof === Symbol.for("react.forward_ref"))
      ) {
        inputElement = child;
        break;
      }
    }
  }

  const clonedChildren = childrenArray.map((child) => {
    if (!React.isValidElement(child)) return child;
    // Only attach ID to the actual input/textarea/select element
    if (child === inputElement) {
      return React.cloneElement(child as React.ReactElement<any>, { id: fieldId });
    }
    return child;
  });

  return (
    <div className={className}>
      {inputElement ? (
        <label htmlFor={fieldId} className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      ) : (
        <div className="label">{label} {required && <span className="text-red-500">*</span>}</div>
      )}
      {clonedChildren}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

// ── Alertas y estados vacíos ───────────────────────────────────────────────

const ALERT_TONES = {
  info: { cls: "border-sky-200 bg-sky-50 text-sky-900", Icon: Info },
  success: { cls: "border-emerald-200 bg-emerald-50 text-emerald-900", Icon: CheckCircle2 },
  warning: { cls: "border-amber-200 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  error: { cls: "border-red-200 bg-red-50 text-red-900", Icon: XCircle },
};

export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof ALERT_TONES; title?: ReactNode; children?: ReactNode; className?: string }) {
  const { cls, Icon } = ALERT_TONES[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", cls, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title ? "mt-0.5" : "", "opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ── KPI ────────────────────────────────────────────────────────────────────

export function KpiCard({ label, value, icon, href, tone = "default", sub }: { label: string; value: ReactNode; icon?: ReactNode; href?: string; tone?: "default" | "warning" | "success" | "info"; sub?: string }) {
  const tones = {
    default: "text-slate-900",
    warning: "text-amber-600",
    success: "text-emerald-600",
    info: "text-brand-600",
  };
  const inner = (
    <div className="card flex items-center gap-4 px-5 py-4 transition-shadow hover:shadow-md">
      {icon && <div className={cn("rounded-xl bg-slate-100 p-2.5", tones[tone])}>{icon}</div>}
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className={cn("text-3xl font-bold tracking-tight", tones[tone])}>{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Tarjeta de métrica (panel del cliente) ────────────────────────────────

export function StatCard({ label, value, icon, sub, tone = "default" }: { label: string; value: ReactNode; icon?: ReactNode; sub?: string; tone?: "default" | "warning" | "success" | "info" }) {
  const tones = {
    default: "text-brand-600 bg-brand-50 border-brand-100",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    success: "text-emerald-600 bg-emerald-50 border-emerald-100",
    info: "text-sky-600 bg-sky-50 border-sky-100",
  };
  return (
    <div className={cn("stat", tones[tone])}>
      <div className="stat-head">
        {icon && <div className="rounded-xl p-2">{icon}</div>}
      </div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────

const AVATAR_COLORES = ["bg-brand-600", "bg-emerald-600", "bg-amber-600", "bg-violet-600", "bg-rose-600", "bg-teal-600"];

export function Avatar({ nombre, size = "md" }: { nombre: string; size?: "sm" | "md" | "lg" }) {
  const color = AVATAR_COLORES[nombre.length % AVATAR_COLORES.length];
  const sizes = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" };
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", color, sizes[size])} title={nombre}>
      {iniciales(nombre)}
    </span>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.close();
      document.body.style.overflow = "";
    }

    const onCloseHandler = () => onClose();
    dialog.addEventListener("close", onCloseHandler);
    return () => {
      dialog.removeEventListener("close", onCloseHandler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        "border-0 rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto",
        wide ? "max-w-2xl" : "max-w-md"
      )}
      style={{ inset: 0, margin: "auto", padding: 0 }}
    >
      <div className="w-full">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 id="modal-title" className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </dialog>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────────

export function Tabs({ tabs, initial }: { tabs: { id: string; label: ReactNode; content: ReactNode; badge?: number }[]; initial?: string }) {
  const [activo, setActivo] = useState(initial ?? tabs[0]?.id);
  const actual = tabs.find((t) => t.id === activo) ?? tabs[0];
  return (
    <div>
      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1 pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActivo(t.id)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
              t.id === actual?.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            )}
          >
            {t.label}
            {typeof t.badge === "number" && t.badge > 0 && (
              <span key={`badge-${t.id}`} className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{t.badge}</span>
            )}
          </button>
        ))}
      </div>
      <div className="pt-4">{actual?.content}</div>
    </div>
  );
}

// ── Calificación con estrellas ─────────────────────────────────────────────

export function Stars({ value, size = 16, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const activo = (hover || value) >= i;
        const star = (
          <Star
            style={{ width: size, height: size }}
            className={cn(activo ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200", onChange && "cursor-pointer")}
          />
        );
        return onChange ? (
          <span key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)} onClick={() => onChange(i)}>
            {star}
          </span>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </span>
  );
}

// ── Skeleton (estados de carga) ─────────────────────────────────────────────

type SkeletonVariant =
  | "text"
  | "heading"
  | "card"
  | "avatar"
  | "button"
  | "table-row"
  | "badge"
  | "stat";

interface SkeletonProps {
  variant: SkeletonVariant;
  lines?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const VARIANT_STYLES: Record<SkeletonVariant, (props: Pick<SkeletonProps, "lines" | "size">) => string> = {
  text: ({ lines = 1 }) => `space-y-2 ${lines > 1 ? "max-w-md" : ""}`,
  heading: () => "max-w-xl",
  card: () => "aspect-video max-w-sm",
  avatar: ({ size = "md" }) => {
    const sizes = { sm: "h-7 w-7", md: "h-10 w-10", lg: "h-16 w-16" };
    return `rounded-full ${sizes[size]}`;
  },
  button: ({ size = "md" }) => {
    const sizes = { sm: "h-8 w-20", md: "h-10 w-24", lg: "h-12 w-32" };
    return `rounded-xl ${sizes[size]}`;
  },
  "table-row": () => "h-12",
  badge: () => "h-5 w-20 rounded-full",
  stat: () => "h-20 w-full",
};

export function Skeleton({ variant, lines, size, className }: SkeletonProps) {
  const baseStyle = "pulse-soft bg-slate-200 rounded";
  const variantStyle = VARIANT_STYLES[variant]({ lines, size });

  if (variant === "text" && lines && lines > 1) {
    return (
      <div className={cn(baseStyle, variantStyle, className)} aria-busy="true" aria-label="Cargando texto">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 rounded",
              i === lines - 1 ? "w-3/4" : "w-full"
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseStyle, variantStyle, className)}
      aria-busy="true"
      aria-label={`Cargando ${variant}`}
    />
  );
}

// ── Varios ─────────────────────────────────────────────────────────────────

export function SectionTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold tracking-tight text-slate-900">{children}</h2>
      {actions}
    </div>
  );
}

export function DemoBadge() {
  return (
    <span className="badge border-amber-300 bg-amber-50 text-amber-700" title="Los datos, cifras y vehículos son ficticios. Demostración sin servidor.">
      <AlertTriangle className="h-3 w-3" /> Modo demo · datos ficticios
    </span>
  );
}

export function useAutoRefresh(callback: () => void, ms: number, activo = true) {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    if (!activo) return;
    const t = setInterval(() => ref.current(), ms);
    return () => clearInterval(t);
  }, [ms, activo]);
}

// ── Acordeón ─────────────────────────────────────────────────────────────────

export function Accordion({
  title,
  icon,
  defaultOpen = false,
  alwaysOpen = false,
  className,
  children,
}: {
  title: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  alwaysOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (alwaysOpen) {
    return (
      <div className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm", className)}>
        <div className="flex items-center gap-2 px-5 py-4 text-left bg-slate-50 border-b border-slate-100">
          {icon && <div className="text-slate-500">{icon}</div>}
          <span className="font-semibold text-slate-900">{title}</span>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    );
  }
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {icon && <div className="text-slate-500">{icon}</div>}
          <span className="font-semibold text-slate-900">{title}</span>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={cn(`border-t border-slate-100 ${open ? "block" : "hidden"}`)}>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── Encabezado estándar de página interna ──────────────────────────────────

export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {kicker && <p className="kicker mb-1">{kicker}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

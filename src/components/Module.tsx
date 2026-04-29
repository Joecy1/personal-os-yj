import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--rule)" }}>
      <div>
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  );
}

export function Module({ children }: { children: ReactNode }) {
  return <div style={{ padding: "32px 36px", minHeight: "100%" }}>{children}</div>;
}

export function SectionHeader({ title, link }: { title: string; link?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div className="section-title">{title}</div>
      {link}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "var(--ink-4)", fontSize: 13, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>{children}</div>
  );
}

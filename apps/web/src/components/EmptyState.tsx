import type { ReactNode } from "react";

const DEFAULT_ASCII = `┌─────────────────┐
│   ?       ?     │
│                 │
│      ∅          │
│                 │
│   ?        ?    │
└─────────────────┘`;

export function EmptyState({
  title,
  body,
  ascii = DEFAULT_ASCII,
  action,
}: {
  title: string;
  body?: string;
  ascii?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="ascii">{ascii}</div>
      <h4>{title}</h4>
      {body ? <p>{body}</p> : null}
      {action ? <div style={{ marginTop: "var(--s-4)" }}>{action}</div> : null}
    </div>
  );
}

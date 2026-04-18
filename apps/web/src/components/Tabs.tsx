export interface TabDef<V extends string> {
  value: V;
  label: string;
}

export function Tabs<V extends string>({
  tabs,
  value,
  onChange,
  label,
  trailing,
}: {
  tabs: TabDef<V>[];
  value: V;
  onChange: (v: V) => void;
  label: string;
  trailing?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="feed-tabs">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={value === t.value ? "active" : ""}
        >
          {t.label}
        </button>
      ))}
      {trailing ? <span className="count">{trailing}</span> : null}
    </div>
  );
}

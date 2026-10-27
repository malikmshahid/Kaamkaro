"use client";

import { useRef } from "react";
import type { ReactNode } from "react";

export type TabItem<T extends string> = {
  id: T;
  label: string;
  /** Optional count / badge shown at the right of the label. */
  count?: number;
  /** Draws a pulsing gold dot — use it when the tab needs attention. */
  attention?: boolean;
  icon?: ReactNode;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  /** Stick under the navbar while the panel scrolls. Default true. */
  sticky?: boolean;
  className?: string;
};

/**
 * The one tab control for the whole app.
 *
 * Why not the old underline tabs: on a phone the row scrolled sideways with no
 * affordance, the active state was a 2px line you could not see in dark mode,
 * and screen readers got a row of unlabelled buttons. This is a real
 * `tablist`: roving tabIndex, arrow-key navigation, `aria-selected`, counts
 * announced with the label, and a fade at the edge so it is obvious there is
 * more to scroll.
 */
export default function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  sticky = true,
  className = "",
}: TabsProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: React.KeyboardEvent) {
    const i = items.findIndex((t) => t.id === value);
    if (i === -1) return;
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    const id = items[next].id;
    onChange(id);
    refs.current[id]?.focus();
  }

  return (
    <div
      className={`${sticky ? "sticky top-[3.75rem] z-30 -mx-1 px-1 py-1" : ""} ${className}`}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className="no-bar fade-x flex w-full gap-1 overflow-x-auto rounded-2xl border border-line bg-card/85 p-1.5 shadow-lux-sm backdrop-blur-xl sm:flex-wrap sm:[mask-image:none] sm:[-webkit-mask-image:none]"
      >
        {items.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              ref={(node) => {
                refs.current[t.id] = node;
              }}
              role="tab"
              type="button"
              id={`tab-${t.id}`}
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(t.id)}
              className={`group relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors duration-200 ${
                active
                  ? "bg-green-800 text-cream shadow-[0_10px_24px_-16px_rgba(18,58,38,0.95)]"
                  : "text-ink/60 hover:bg-paper/70 hover:text-ink"
              }`}
            >
              {t.icon && (
                <span className={active ? "text-gold-300" : "text-ink/40"} aria-hidden="true">
                  {t.icon}
                </span>
              )}
              <span className="whitespace-nowrap">{t.label}</span>
              {typeof t.count === "number" && (
                <span
                  className={`tnum rounded-full px-1.5 py-0.5 text-[10.5px] font-bold leading-none ${
                    active ? "bg-cream/20 text-cream" : "bg-ink/8 text-ink/55"
                  }`}
                >
                  {t.count}
                </span>
              )}
              {t.attention && (
                <span
                  className="pulse-dot h-1.5 w-1.5 rounded-full bg-gold-500"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

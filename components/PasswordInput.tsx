"use client";

import { useState } from "react";

type PasswordInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
};

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        className="w-full rounded-xl border border-line bg-card px-4 py-3 pr-12 text-sm shadow-lux-sm outline-none transition focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-sm text-ink/50 transition hover:bg-paper/70 hover:text-ink"
      >
        {visible ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

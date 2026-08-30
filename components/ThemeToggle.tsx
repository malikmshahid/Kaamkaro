"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("kaamkaro-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      title="Light/Dark mode"
      className="w-9 h-9 rounded-full border border-line flex items-center justify-center hover:border-green-700 transition-colors text-lg leading-none"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}

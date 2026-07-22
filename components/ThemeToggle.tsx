"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Reflect whatever the pre-paint script already applied to <html>.
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
      aria-label="Theme badlein"
      title="Light/Dark mode"
      className="w-9 h-9 rounded-full border border-line flex items-center justify-center hover:border-green-700 transition-colors text-lg leading-none"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}

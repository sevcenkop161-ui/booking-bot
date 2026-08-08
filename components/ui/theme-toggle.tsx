"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    // Reading localStorage/matchMedia here (not during render) is what
    // keeps server and first-client-render output identical — both
    // render the "unknown" (null) state, avoiding a hydration mismatch.
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with a browser-only API on mount, not derivable during SSR
      setTheme(stored);
      return;
    }
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Переключить тему"
      className="rounded-md border border-border px-2 py-1.5 text-sm text-foreground-secondary hover:border-border-hover hover:text-foreground"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="theme-toggle">
      <button className={`theme-opt ${theme === "light" ? "active" : ""}`} onClick={() => setTheme("light")}>
        <Sun size={12} /> Light
      </button>
      <button className={`theme-opt ${theme === "dark" ? "active" : ""}`} onClick={() => setTheme("dark")}>
        <Moon size={12} /> Dark
      </button>
    </div>
  );
}

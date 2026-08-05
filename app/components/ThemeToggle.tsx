"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    // পেজ লোড হওয়ার সময় চেক করা ডার্ক মোড আছে কি না
    const checkDark = document.documentElement.classList.contains("dark");
    setIsDark(checkDark);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      // লাইট মোডে যাওয়া
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      // ডার্ক মোডে যাওয়া
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center shadow-sm"
      title="Toggle Theme"
      aria-label="Toggle Theme"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [theme, setTheme] = useState("light");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Check local storage for theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      setTheme("light");
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">SIR Portal</div>
      
      <div className="nav-controls">
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle Dark Mode">
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        
        <button onClick={() => setMenuOpen(!menuOpen)} className="hamburger" aria-label="Toggle Menu">
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          <Link href="/" className="mobile-link" onClick={() => setMenuOpen(false)}>
            Home (Submit Form)
          </Link>
          <Link href="/search" className="mobile-link" onClick={() => setMenuOpen(false)}>
            Search 2002 Roll
          </Link>
        </div>
      )}
    </nav>
  );
}

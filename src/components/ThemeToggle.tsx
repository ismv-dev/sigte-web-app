"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { I } from "@/components/Icon";

/** Botón claro/oscuro. `light` ajusta el color para fondos oscuros (sidebar). */
export function ThemeToggle({ light }: { light?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      className="btn ghost icon"
      style={light ? { color: "rgba(255,255,255,.8)" } : undefined}
    >
      {/* Antes de montar mostramos un ícono fijo para evitar desajuste de hidratación */}
      <I name={mounted && isDark ? "sun" : "moon"} size={18} />
    </button>
  );
}

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        /* Paleta Oficial Manual de Normas Gráficas USM (Pág. 8 y 31) */
        usm: {
          azul: {
            DEFAULT: "#004B85", // Pantone DS 224-2
            900: "#002B4D",
            700: "#003A66",
            100: "#CBDDEC",
            50: "#E8F0F6",
          },
          rojo: {
            DEFAULT: "#D60019", // Pantone DS 87-1 C
            700: "#A8000F",
            50: "#FCE6E8",
          },
          verde: {
            DEFAULT: "#008452", // Pantone DS 268-1 C
            700: "#006B43",
            50: "#E3F3EC",
          },
          amarillo: {
            DEFAULT: "#F7AE00", // Pantone DS 18-1 C
            700: "#B57F00",
            50: "#FEF4DD",
            ink: "#3D2F00",
          },
          gris: {
            DEFAULT: "#9A999E", // Pantone DS Process Black C 50%
            50: "#9A999E",
          },
          negro: "#000000",
          blanco: "#FFFFFF",
        },
        border: "hsl(var(--border, 210 20% 90%))",
        input: "hsl(var(--input, 210 20% 90%))",
        ring: "hsl(var(--ring, 206 100% 26%))",
        background: "hsl(var(--background, 210 20% 98%))",
        foreground: "hsl(var(--foreground, 207 43% 10%))",
        primary: {
          DEFAULT: "var(--usm-azul, #004B85)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--usm-azul-050, #E8F0F6)",
          foreground: "var(--usm-azul, #004B85)",
        },
        destructive: {
          DEFAULT: "var(--usm-rojo, #D60019)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 210 20% 96%))",
          foreground: "hsl(var(--muted-foreground, 210 12% 42%))",
        },
        accent: {
          DEFAULT: "var(--usm-azul, #004B85)",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "hsl(var(--popover, 0 0% 100%))",
          foreground: "hsl(var(--popover-foreground, 207 43% 10%))",
        },
        card: {
          DEFAULT: "hsl(var(--card, 0 0% 100%))",
          foreground: "hsl(var(--card-foreground, 207 43% 10%))",
        },
        success: {
          DEFAULT: "var(--usm-verde, #008452)",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "var(--usm-amarillo, #F7AE00)",
          foreground: "var(--usm-amarillo-ink, #3D2F00)",
        },
        chart: {
          "1": "#004B85",
          "2": "#008452",
          "3": "#F7AE00",
          "4": "#D60019",
          "5": "#9A999E",
        },
        sidebar: {
          DEFAULT: "var(--usm-azul-900, #002B4D)",
          foreground: "#ffffff",
          primary: "var(--usm-azul, #004B85)",
          "primary-foreground": "#ffffff",
          accent: "var(--usm-amarillo, #F7AE00)",
          "accent-foreground": "#3D2F00",
          border: "rgba(255, 255, 255, 0.1)",
          ring: "var(--usm-azul, #004B85)",
        },
      },
      borderRadius: {
        lg: "var(--radius, 16px)",
        md: "calc(var(--radius, 16px) - 2px)",
        sm: "calc(var(--radius, 16px) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-roboto)", "Roboto", "sans-serif"],
        display: ["var(--font-roboto-condensed)", "Roboto Condensed", "sans-serif"],
        mono: ["var(--font-roboto-mono)", "Roboto Mono", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

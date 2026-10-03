/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./App.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        // ── Tactical Asphalt & Surface Palette ────────────────────
        asphalt: {
          DEFAULT: '#0D0E11', // Deep matte asphalt
          deep: '#090A0D',
          border: '#1F242C',
        },
        panel: {
          DEFAULT: '#15181C', // Structural panels
          subtle: '#1C2026',
          hover: '#22272F',
          dark: '#101216',
        },
        tactical: {
          border: '#262B32', // Hairline 1px structural border
          grid: '#1F242C',
          faint: 'rgba(255, 255, 255, 0.08)',
        },
        // ── Road Telemetry Accent System ─────────────────────────
        reflector: {
          amber: '#F59E0B', // Road reflector amber (active pings, high-priority)
          subtle: 'rgba(245, 158, 11, 0.12)',
        },
        flare: {
          crimson: '#EF4444', // Road flare crimson (critical craters, tire blowout threats)
          subtle: 'rgba(239, 68, 68, 0.12)',
        },
        phosphor: {
          green: '#10B981', // Phosphor green (confirmed municipal repairs)
          subtle: 'rgba(16, 185, 129, 0.12)',
        },
        telemetry: {
          cyan: '#38BDF8', // GPS lock / satellite vector cyan
          subtle: 'rgba(56, 189, 248, 0.12)',
        },
      },
      fontFamily: {
        display: ['"Cabinet Grotesk"', '"Syne"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
        body: ['"Geist"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        tight: '2px',
        none: '0px',
        sm: '2px',
        md: '4px',
      },
      boxShadow: {
        // Strictly avoid soft blurred drop shadows — only razor occlusion
        tactical: '0 0 0 1px #262B32',
        amberGlow: '0 0 12px rgba(245, 158, 11, 0.15)',
        crimsonGlow: '0 0 12px rgba(239, 68, 68, 0.15)',
      },
      spacing: {
        'hairline': '1px',
      }
    },
  },
  plugins: [],
};

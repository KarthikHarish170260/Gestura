/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        clinical: {
          emerald: '#059669',
          emeraldTint: '#ECFDF5',
          amber: '#F59E0B',
          amberTint: '#FFFBEB',
          crimson: '#DC2626',
          crimsonTint: '#FEF2F2',
          cyan: '#0EA5E9',
          teal: '#0D9488',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Geist Sans', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'scan-laser': 'scanLaser 2s ease-in-out infinite',
        'pulse-emergency': 'pulseEmergency 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        scanLaser: {
          '0%, 100%': { transform: 'translateY(0%)', opacity: '0.85' },
          '50%': { transform: 'translateY(180px)', opacity: '1' },
        },
        pulseEmergency: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.75', transform: 'scale(1.02)' },
        },
      },
    },
  },
  plugins: [],
};

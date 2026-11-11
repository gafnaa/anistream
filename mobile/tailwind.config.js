const color = name => `hsl(var(--${name}))`;
const paired = name => ({ DEFAULT: color(name), foreground: color(`${name}-foreground`) });

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: color('background'), foreground: color('foreground'),
        card: paired('card'), popover: paired('popover'), primary: paired('primary'),
        secondary: paired('secondary'), muted: paired('muted'), accent: paired('accent'),
        destructive: paired('destructive'), border: color('border'), input: color('input'), ring: color('ring'),
      },
      borderRadius: { lg: 14, md: 10, sm: 6 },
      fontFamily: {
        sans: ['Inter_400Regular'], medium: ['Inter_500Medium'], semibold: ['Inter_600SemiBold'],
        heading: ['PlusJakartaSans_700Bold'], display: ['PlusJakartaSans_800ExtraBold'],
      },
    },
  },
  plugins: [require('tailwindcss-animate'), ({ addUtilities }) => addUtilities({
    '.font-medium': { fontFamily: 'Inter_500Medium', fontWeight: '500' },
    '.font-semibold': { fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  })],
};

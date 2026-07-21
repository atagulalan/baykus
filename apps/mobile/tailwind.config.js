const path = require("node:path");
const { colors, fonts } = require("../../packages/ui/tokens.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./index.ts",
    "./src/**/*.{js,jsx,ts,tsx}",
    path.join(__dirname, "../../packages/ui/src/**/*.{js,jsx,ts,tsx}"),
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        void: colors.void,
        snow: colors.snow,
        muted: colors.muted,
        "muted-dim": colors["muted-dim"],
        yellow: colors.yellow,
      },
      fontFamily: {
        // Italic cut only — must match the useFonts key in src/lib/fonts.ts.
        // Do not use tokens `DM Serif Display` here (see fonts.ts comment).
        display: ["DM Serif Display Italic"],
        sans: fonts.sans,
        mono: fonts.mono,
      },
    },
  },
  plugins: [
    // `font-display` is already the italic TTF. Tailwind `italic` would add a
    // synthetic extra slant on Android — neutralize without losing the cut.
    ({ addUtilities }) => {
      addUtilities({
        ".italic": { fontStyle: "normal" },
      });
    },
  ],
};

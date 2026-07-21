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
        display: fonts.display,
        sans: fonts.sans,
        mono: fonts.mono,
      },
    },
  },
  plugins: [],
};

const { colors, fonts } = require("./tokens.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./.storybook/**/*.{js,jsx,ts,tsx}"],
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

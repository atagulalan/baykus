import { DMSans_400Regular, DMSans_500Medium } from "@expo-google-fonts/dm-sans";
import { DMSerifDisplay_400Regular_Italic } from "@expo-google-fonts/dm-serif-display";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";
import { useFonts } from "expo-font";

/**
 * Load brand faces under the same family names as mobile Tailwind
 * (`font-display` / `font-sans` / `font-mono`).
 *
 * Display is registered under a dedicated italic family name (not the shared
 * "DM Serif Display" PostScript family). Loading Regular + Italic under that
 * shared name made iOS resolve `fontStyle: "normal"` to upright Regular after
 * we neutralized synthetic slant on Android. Titles/wordmark always want the
 * italic cut — same as web `font-display italic`.
 */
export function useBrandFonts(): boolean {
  const [loaded] = useFonts({
    "DM Sans": DMSans_400Regular,
    "DM Sans Medium": DMSans_500Medium,
    "DM Serif Display Italic": DMSerifDisplay_400Regular_Italic,
    "JetBrains Mono": JetBrainsMono_400Regular,
    "JetBrains Mono Medium": JetBrainsMono_500Medium,
  });
  return loaded;
}

import { DMSans_400Regular, DMSans_500Medium } from "@expo-google-fonts/dm-sans";
import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from "@expo-google-fonts/dm-serif-display";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";
import { useFonts } from "expo-font";

/**
 * Load brand faces under the same family names as `packages/ui` tokens /
 * Tailwind `font-display` / `font-sans` / `font-mono`.
 *
 * Display is registered as the italic cut (UI titles always use italic);
 * regular display is loaded for completeness.
 */
export function useBrandFonts(): boolean {
  const [loaded] = useFonts({
    "DM Sans": DMSans_400Regular,
    "DM Sans Medium": DMSans_500Medium,
    "DM Serif Display": DMSerifDisplay_400Regular_Italic,
    "DM Serif Display Regular": DMSerifDisplay_400Regular,
    "JetBrains Mono": JetBrainsMono_400Regular,
    "JetBrains Mono Medium": JetBrainsMono_500Medium,
  });
  return loaded;
}

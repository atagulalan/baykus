import "../src/polyfills/crypto.ts";
import "../global.css";
import "../src/i18n.ts";
import { colors } from "@baykus/ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/auth/AuthProvider.tsx";
import { EdgeScrubProvider } from "../src/chrome/EdgeScrubContext.tsx";
import { HeaderActionProvider } from "../src/chrome/HeaderActionContext.tsx";
import { AppEdgeBlur } from "../src/components/AppEdgeBlur.tsx";
import { MobileDock } from "../src/components/MobileDock.tsx";
import { MobileWordmark } from "../src/components/MobileWordmark.tsx";
import { initApiClient } from "../src/lib/api.ts";
import { useBrandFonts } from "../src/lib/fonts.ts";

initApiClient();

export default function RootLayout() {
  const fontsLoaded = useBrandFonts();

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-void">
        <ActivityIndicator color={colors.yellow} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <EdgeScrubProvider>
          <HeaderActionProvider>
            <View className="flex-1 bg-void">
              <Stack
                screenOptions={{
                  headerTransparent: true,
                  headerShadowVisible: false,
                  headerStyle: { backgroundColor: "transparent" },
                  headerTintColor: colors.snow,
                  headerTitle: "",
                  // Chrome back / right actions live in MobileWordmark (this header sits under it).
                  headerBackVisible: false,
                  contentStyle: { backgroundColor: colors.void },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="series/[id]" options={{ title: "", headerShown: false }} />
                <Stack.Screen name="series/new" options={{ title: "" }} />
                <Stack.Screen
                  name="login"
                  options={{ title: "Sign in", presentation: "modal", headerTransparent: false }}
                />
                <Stack.Screen
                  name="claim"
                  options={{ title: "Claim", presentation: "modal", headerTransparent: false }}
                />
                <Stack.Screen name="import" options={{ title: "" }} />
                <Stack.Screen name="library/all" options={{ title: "" }} />
                <Stack.Screen name="library/favorites" options={{ title: "" }} />
                <Stack.Screen name="profile/stats" options={{ title: "" }} />
                <Stack.Screen name="watch/history" options={{ title: "" }} />
                <Stack.Screen name="dev/smoke" options={{ title: "Brand smoke" }} />
              </Stack>
              <AppEdgeBlur />
              <MobileWordmark />
              <MobileDock />
              <StatusBar style="light" />
            </View>
          </HeaderActionProvider>
        </EdgeScrubProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

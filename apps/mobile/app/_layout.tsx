import "../src/polyfills/crypto.ts";
import "../global.css";
import "../src/i18n.ts";
import { colors } from "@baykus/ui";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/auth/AuthProvider.tsx";
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
        <View className="flex-1 bg-void">
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.void },
              headerTintColor: colors.snow,
              headerTitleStyle: { fontFamily: "JetBrains Mono", fontSize: 12 },
              contentStyle: { backgroundColor: colors.void },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="series/[id]" options={{ title: "Series" }} />
            <Stack.Screen name="series/new" options={{ title: "Add series" }} />
            <Stack.Screen name="login" options={{ title: "Sign in", presentation: "modal" }} />
            <Stack.Screen name="claim" options={{ title: "Claim", presentation: "modal" }} />
            <Stack.Screen name="import" options={{ title: "Import" }} />
            <Stack.Screen name="library/all" options={{ title: "All series" }} />
            <Stack.Screen name="library/favorites" options={{ title: "Favorites" }} />
            <Stack.Screen name="profile/stats" options={{ title: "Stats" }} />
            <Stack.Screen name="watch/history" options={{ title: "History" }} />
            <Stack.Screen name="dev/smoke" options={{ title: "Brand smoke" }} />
          </Stack>
          <StatusBar style="light" />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

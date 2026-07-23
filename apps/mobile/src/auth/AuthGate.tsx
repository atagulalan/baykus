import { colors } from "@baykus/ui";
import { Redirect, useSegments } from "expo-router";
import { type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "./AuthProvider.tsx";
import { needsAuthRedirect } from "./authGate.ts";

/**
 * Unauthenticated users never see app chrome — redirect to `/login`
 * (web `Layout` Navigate parity). `/login`, `/claim`, `/dev` stay bare.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const root = segments[0];

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-void">
        <ActivityIndicator color={colors.yellow} />
      </View>
    );
  }

  if (needsAuthRedirect(session, root)) {
    return <Redirect href="/login" />;
  }

  if (session?.authenticated && (root === "login" || root === "claim")) {
    return <Redirect href="/(tabs)/watch" />;
  }

  return children;
}

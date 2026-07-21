import { Tabs } from "expo-router";

/**
 * Dock matches web AppTabBar: Watch · Calendar · Profile · Search (4).
 * Library (`index`) is a browse peer of Watch — reachable in-app, not a dock tab (E142).
 *
 * `MobileDock` is mounted in the root layout so inner stack screens keep it too
 * (web Layout always paints AppTabBar). Tabs only own route registration.
 */
export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="watch"
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="watch" options={{ title: "Watch" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="index" options={{ href: null, title: "Library" }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

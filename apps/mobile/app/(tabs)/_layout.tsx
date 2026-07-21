import { Tabs } from "expo-router";
import { CalendarDays, Clapperboard, Library, Search, User } from "lucide-react-native";
import { colors } from "@baykus/ui";
import { DockIcon, MobileDock } from "../../src/components/MobileDock.tsx";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <MobileDock {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.void },
        headerTintColor: colors.snow,
        headerShadowVisible: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="watch"
        options={{
          title: "Watch",
          tabBarIcon: ({ color, focused }) => (
            <DockIcon Icon={Clapperboard} color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <DockIcon Icon={Library} color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, focused }) => (
            <DockIcon Icon={CalendarDays} color={color} bold={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <DockIcon Icon={Search} color={color} bold={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <DockIcon Icon={User} color={color} filled={focused} />
          ),
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

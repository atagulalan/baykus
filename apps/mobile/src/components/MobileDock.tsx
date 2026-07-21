/// <reference types="nativewind/types" />
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@baykus/ui";

const ICON_SIZE = 22;
const ICON_STROKE = 1.75;

/** Floating icon-only dock — matches web AppTabBar chrome. */
export function MobileDock({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0"
      style={{ paddingTop: 48 }}
    >
      <View
        pointerEvents="auto"
        className="mx-auto w-full max-w-md flex-row items-center px-2"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;
          const { options } = descriptor;
          if ((options as { href?: null }).href === null) return null;

          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : typeof options.title === "string"
                ? options.title
                : route.name;
          const color = focused ? colors.yellow : colors.muted;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              className="h-11 min-w-0 flex-1 items-center justify-center active:scale-[0.92]"
            >
              {options.tabBarIcon?.({ focused, color, size: ICON_SIZE }) ?? null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function DockIcon({
  Icon,
  color,
  filled = false,
  bold = false,
}: {
  Icon: LucideIcon;
  color: string;
  filled?: boolean;
  bold?: boolean;
}) {
  return (
    <Icon
      size={ICON_SIZE}
      strokeWidth={bold ? 2.5 : ICON_STROKE}
      color={color}
      fill={filled ? color : "transparent"}
    />
  );
}

/// <reference types="nativewind/types" />
import { User } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { MediaImage } from "../atoms/MediaImage.tsx";
import { cn } from "../lib/cn.ts";
import { colors } from "../tokens.ts";

export type CastMember = {
  id: string | number;
  name: string;
  character?: string | null;
  photoUrl: string | null;
};

export type CastRailProps = {
  cast: CastMember[];
  title: string;
  className?: string;
};

/** Horizontal cast strip. */
export function CastRail({ cast, title, className }: CastRailProps) {
  if (cast.length === 0) return null;

  return (
    <View className={cn("gap-3", className)}>
      <Text className="px-3 font-mono text-xs uppercase tracking-widest text-muted">{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-3">
        <View className="flex-row gap-3 pr-3">
          {cast.map((member) => (
            <View key={String(member.id)} className="w-20 items-center gap-1.5">
              <View className="h-20 w-20 overflow-hidden rounded-full bg-white/5">
                {member.photoUrl ? (
                  <MediaImage
                    src={member.photoUrl}
                    accessibilityLabel={member.name}
                    wrapperClassName="h-full w-full"
                    className="h-full w-full"
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <User size={22} color={colors.muted} />
                  </View>
                )}
              </View>
              <Text numberOfLines={2} className="text-center text-xs text-snow">
                {member.name}
              </Text>
              {member.character ? (
                <Text numberOfLines={1} className="text-center font-mono text-[10px] text-muted">
                  {member.character}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

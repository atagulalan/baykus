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

const PHOTO = 64; // web size-16
const COL_W = 72; // ~4.5rem

/** Horizontal cast strip — sizes match web CastRail. */
export function CastRail({ cast, title, className }: CastRailProps) {
  if (cast.length === 0) return null;

  return (
    <View className={cn("gap-2", className)}>
      <Text className="font-mono text-[10px] uppercase tracking-widest text-muted">{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3 pr-1">
          {cast.map((member) => (
            <View key={String(member.id)} style={{ width: COL_W }} className="items-center gap-1.5">
              <View
                className="overflow-hidden rounded-full bg-white/5"
                style={{ width: PHOTO, height: PHOTO }}
              >
                {member.photoUrl ? (
                  <MediaImage
                    src={member.photoUrl}
                    accessibilityLabel={member.name}
                    wrapperClassName="h-full w-full"
                    className="h-full w-full"
                    style={{ width: PHOTO, height: PHOTO }}
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <User size={22} color={colors.muted} strokeWidth={1.5} />
                  </View>
                )}
              </View>
              <Text numberOfLines={2} className="text-center text-xs leading-tight text-snow">
                {member.name}
              </Text>
              {member.character ? (
                <Text
                  numberOfLines={2}
                  className="text-center text-[11px] leading-tight text-muted"
                >
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

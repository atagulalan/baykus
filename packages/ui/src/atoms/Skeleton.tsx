/// <reference types="nativewind/types" />
import { View } from "react-native";
import { cn } from "../lib/cn.ts";

export type SkeletonBoneProps = {
  className?: string;
};

/** Base pulse fill — sharp by default; pass `rounded-*` for soft shapes. */
export function SkeletonBone({ className }: SkeletonBoneProps) {
  return <View accessibilityElementsHidden className={cn("animate-pulse bg-white/5", className)} />;
}

export type SkeletonPillProps = {
  className?: string;
};

/** Centered SectionPill stand-in. */
export function SkeletonPill({ className }: SkeletonPillProps) {
  return <SkeletonBone className={cn("h-7 w-32 rounded-full border border-white/10", className)} />;
}

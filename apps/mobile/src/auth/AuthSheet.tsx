import { colors } from "@baykus/ui";
import { ArrowLeft } from "lucide-react-native";
import { forwardRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  HEADER_ACTION_CLASS,
  HEADER_ACTION_SLOT_CLASS,
  WORDMARK_ROW_H,
} from "../chrome/layout.ts";

/** Black + outline — no fills except the primary yellow CTA. */
export const AUTH_INPUT_CLASS =
  "h-11 rounded-full border border-white/20 px-4 font-sans text-sm";
export const AUTH_LABEL_CLASS = "mb-2 font-sans text-sm text-snow";
export const AUTH_OUTLINE_BTN =
  "h-11 items-center justify-center rounded-full border border-white/20 bg-void active:bg-white/5";
export const AUTH_PRIMARY_BTN =
  "h-11 items-center justify-center rounded-full border border-yellow bg-yellow disabled:opacity-40";
export const AUTH_TEXT_LINK =
  "h-12 items-center justify-center rounded-full bg-void active:bg-white/5";

/**
 * Explicit colors — iOS Strong Password / secureTextEntry bullets ignore
 * NativeWind `text-*` and stay system-black on a void field.
 */
export const AUTH_INPUT_STYLE = {
  color: colors.snow,
  backgroundColor: colors.void,
} as const;

/** Auth field with forced snow text (password dots visible on void). */
export const AuthTextInput = forwardRef<TextInput, TextInputProps>(function AuthTextInput(
  { style, className, ...props },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor="#888888"
      keyboardAppearance="dark"
      selectionColor={colors.yellow}
      {...props}
      className={[AUTH_INPUT_CLASS, className].filter(Boolean).join(" ")}
      style={[AUTH_INPUT_STYLE, style]}
    />
  );
});

/** Bottom-anchored auth — flat void, brand above, form hugged to the bottom. */
export function AuthSheet({
  children,
  bottomPad,
  keyboard = false,
  onBack,
}: {
  children: ReactNode;
  bottomPad: number;
  keyboard?: boolean;
  /** Top-left back control (claim → login). */
  onBack?: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 12);

  const body = (
    <View className="flex-1 bg-void">
      {/* Same rail as MobileWordmark: in-flow back slot + absolute-centered logo. */}
      <View style={{ paddingTop: topPad }}>
        <View className="relative flex-row items-center justify-between px-3" style={{ height: WORDMARK_ROW_H }}>
          <View className={HEADER_ACTION_SLOT_CLASS}>
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("app.back")}
                onPress={() => {
                  Keyboard.dismiss();
                  onBack();
                }}
                hitSlop={8}
                className={HEADER_ACTION_CLASS}
              >
                <ArrowLeft size={20} color={colors.snow} strokeWidth={1.5} />
              </Pressable>
            ) : null}
          </View>

          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center"
          >
            <Text
              accessibilityRole="header"
              className="font-display text-3xl italic leading-none tracking-tight text-snow"
            >
              {t("app.name")}
            </Text>
          </View>

          {/* Balance the left rail so the wordmark stays optically centered. */}
          <View className={HEADER_ACTION_SLOT_CLASS} />
        </View>
      </View>

      {/*
        Form hugs the bottom. Do NOT wrap in ScrollView on iOS — UIKit Password
        AutoFill / "Strong Password" stops offering when the username+newPassword
        pair sits inside a ScrollView (regression when we scrolled for keyboard).
        Android still scrolls so a tall claim form isn't clipped by the IME.
        Back always Keyboard.dismiss()es first so login isn't left half-clipped.
      */}
      {Platform.OS === "ios" ? (
        <View className="flex-1 justify-end">
          <View className="bg-void px-5 pt-5" style={{ paddingBottom: bottomPad }}>
            {children}
          </View>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View className="bg-void px-5 pt-5" style={{ paddingBottom: bottomPad }}>
            {children}
          </View>
        </ScrollView>
      )}
    </View>
  );

  if (!keyboard) return body;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-void"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      {body}
    </KeyboardAvoidingView>
  );
}

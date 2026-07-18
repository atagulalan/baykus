import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ApiError, uploadAvatar } from "../../../api/client.ts";
import { buildAvatarUrl } from "../../../api/images.ts";
import type { Settings } from "../../../api/types.ts";
import { useToast } from "../../../lib/toast.tsx";
import { MediaImage } from "../../atoms/MediaImage/MediaImage.tsx";

interface ProfilePhotoUploadProps {
  avatarRef: string | null;
}

/** WP4: uploadable profile photo — works identically in single and multi mode; replaces the 🦉 placeholder once set. */
export function ProfilePhotoUpload({ avatarRef }: ProfilePhotoUploadProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (settings) => {
      queryClient.setQueryData<Settings>(["settings"], settings);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "PAYLOAD_TOO_LARGE") {
        toast.show(t("profile.photo.tooLarge"), "error");
      } else if (err instanceof ApiError && err.code === "VALIDATION_FAILED") {
        toast.show(t("profile.photo.invalidType"), "error");
      } else {
        toast.show(t("errors.generic"), "error");
      }
    },
  });

  const photoUrl = buildAvatarUrl(avatarRef);

  return (
    <label
      aria-label={t("profile.photo.upload")}
      title={t("profile.photo.upload")}
      className="group relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white/5 text-2xl"
    >
      {photoUrl ? (
        <MediaImage
          src={photoUrl}
          alt=""
          wrapperClassName="block h-full w-full"
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">🦉</span>
      )}
      <span
        className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
          mutation.isPending ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        aria-hidden="true"
      >
        {mutation.isPending ? (
          <Loader2 size={16} className="animate-spin text-snow" />
        ) : (
          <Camera size={16} className="text-snow" />
        )}
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={mutation.isPending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) mutation.mutate(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

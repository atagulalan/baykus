import { useTranslation } from "react-i18next";

export function SettingsPage() {
  const { t } = useTranslation();
  return <h1 className="font-semibold text-2xl">{t("settings.title")}</h1>;
}

import { useTranslation } from "react-i18next";

export function StatsPage() {
  const { t } = useTranslation();
  return <h1 className="font-semibold text-2xl">{t("app.nav.stats")}</h1>;
}

import { useTranslation } from "react-i18next";

export function CalendarPage() {
  const { t } = useTranslation();
  return <h1 className="font-semibold text-2xl">{t("app.nav.calendar")}</h1>;
}

import { useTranslation } from "react-i18next";

export function LibraryPage() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col items-center gap-2 py-24 text-center">
      <h1 className="font-semibold text-2xl">{t("library.empty.title")}</h1>
      <p className="text-zinc-400">{t("library.empty.hint")}</p>
    </section>
  );
}

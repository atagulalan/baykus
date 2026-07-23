import { useTranslation } from "react-i18next";
import type { Locale, Settings, SettingsPatch } from "../../../../api/types.ts";
import { Checkbox } from "../../../../components/atoms/Checkbox/Checkbox.tsx";
import { SettingsSelect } from "../../../../components/atoms/SettingsSelect/SettingsSelect.tsx";
import { SETTINGS_ROW } from "../../../../lib/settingsChrome.ts";
import { updateUiPrefs } from "../../../../lib/uiPrefs.ts";
import { SettingsSection } from "../SettingsSection/SettingsSection.tsx";

const LOCALES: Locale[] = ["tr", "en", "ja"];
const REGIONS = ["TR", "US", "GB", "DE", "FR", "ES", "IT", "NL"];

interface SettingsGeneralSectionProps {
  settings: Settings;
  showNextUpCarousel: boolean;
  onShowNextUpCarouselChange: (checked: boolean) => void;
  onPatch: (patch: SettingsPatch) => void;
  onLocaleChange: (locale: Locale) => void;
  onSaved: () => void;
}

export function SettingsGeneralSection({
  settings,
  showNextUpCarousel,
  onShowNextUpCarouselChange,
  onPatch,
  onLocaleChange,
  onSaved,
}: SettingsGeneralSectionProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection title={t("settings.general.title")}>
      <SettingsSelect
        label={t("settings.general.locale")}
        options={LOCALES.map((l) => ({
          value: l,
          label: t(`settings.general.localeName.${l}`),
        }))}
        value={settings.locale}
        onChange={(val) => onLocaleChange(val as Locale)}
      />

      <SettingsSelect
        label={t("settings.general.region")}
        options={REGIONS.map((r) => ({
          value: r,
          label: t(`settings.general.regionName.${r}`),
        }))}
        value={settings.region}
        onChange={(val) => onPatch({ region: val })}
      />

      <SettingsSelect
        label={t("settings.general.episodeLabelFormat")}
        options={[
          { value: "SxEy", label: "S1E6" },
          { value: "S01E06", label: "S01E06" },
          { value: "compact", label: "1×6" },
        ]}
        value={settings.episodeLabelFormat}
        onChange={(val) =>
          onPatch({
            episodeLabelFormat: val as "SxEy" | "S01E06" | "compact",
          })
        }
      />

      <SettingsSelect
        label={t("settings.general.watchingWindow")}
        hint={t("settings.general.watchingWindowHint")}
        options={[
          {
            value: "7",
            label: t("settings.general.watchingWindowOptions.7"),
          },
          {
            value: "14",
            label: t("settings.general.watchingWindowOptions.14"),
          },
          {
            value: "30",
            label: t("settings.general.watchingWindowOptions.30"),
          },
          {
            value: "60",
            label: t("settings.general.watchingWindowOptions.60"),
          },
          {
            value: "90",
            label: t("settings.general.watchingWindowOptions.90"),
          },
          {
            value: "180",
            label: t("settings.general.watchingWindowOptions.180"),
          },
          {
            value: "365",
            label: t("settings.general.watchingWindowOptions.365"),
          },
        ]}
        value={String(settings.watchingWindowDays)}
        onChange={(val) => onPatch({ watchingWindowDays: Number(val) })}
      />

      <SettingsSelect
        label={t("settings.general.defaultStartPage")}
        options={[
          {
            value: "home",
            label: t("settings.general.defaultStartPageName.home"),
          },
          {
            value: "calendar",
            label: t("settings.general.defaultStartPageName.calendar"),
          },
          {
            value: "stats",
            label: t("settings.general.defaultStartPageName.stats"),
          },
        ]}
        value={settings.defaultStartPage}
        onChange={(val) =>
          onPatch({
            defaultStartPage: val as "home" | "calendar" | "stats",
          })
        }
      />

      <SettingsSelect
        label={t("settings.general.newSeriesDefaultStatus")}
        options={[
          {
            value: "watching",
            label: t("settings.general.newSeriesDefaultStatusName.watching"),
          },
          {
            value: "watchlist",
            label: t("settings.general.newSeriesDefaultStatusName.watchlist"),
          },
        ]}
        value={settings.newSeriesDefaultStatus}
        onChange={(val) =>
          onPatch({
            newSeriesDefaultStatus: val as "watching" | "watchlist",
          })
        }
      />

      {/* biome-ignore lint/a11y/noLabelWithoutControl: wraps Checkbox */}
      <label className={`cursor-pointer ${SETTINGS_ROW}`}>
        <div className="flex max-w-[70%] flex-col text-left">
          <span className="font-sans text-sm">{t("settings.general.spoilerProtection")}</span>
          <span className="mt-0.5 font-mono text-[10px] text-muted">
            {t("settings.general.spoilerProtectionHint")}
          </span>
        </div>
        <Checkbox
          checked={settings.spoilerProtection}
          onChange={(checked) => onPatch({ spoilerProtection: checked })}
        />
      </label>

      {/* biome-ignore lint/a11y/noLabelWithoutControl: wraps Checkbox */}
      <label className={`cursor-pointer ${SETTINGS_ROW}`}>
        <div className="flex max-w-[70%] flex-col text-left">
          <span className="font-sans text-sm">{t("settings.general.showNextUpCarousel")}</span>
          <span className="mt-0.5 font-mono text-[10px] text-muted">
            {t("settings.general.showNextUpCarouselHint")}
          </span>
        </div>
        <Checkbox
          checked={showNextUpCarousel}
          onChange={(checked) => {
            onShowNextUpCarouselChange(checked);
            updateUiPrefs({ showNextUpCarousel: checked });
            onSaved();
          }}
        />
      </label>

      <SettingsSelect
        label={t("settings.general.theme")}
        options={[{ value: "dark", label: t("settings.general.themeDark") }]}
        value="dark"
        onChange={() => {}}
      />
    </SettingsSection>
  );
}

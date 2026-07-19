import { useTranslation } from "react-i18next";
import { formatAirStampLocal, formatAirStampOrigin } from "../../../lib/airing.ts";

interface ReleaseTimeProps {
  airStamp: string;
}

/** Meta-row text for episode details — local time + origin network time. */
export function ReleaseTime({ airStamp }: ReleaseTimeProps) {
  const { t, i18n } = useTranslation();
  const localTime = formatAirStampLocal(airStamp, i18n.language);
  const originTime = formatAirStampOrigin(airStamp);

  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-muted">{t("episode.airTime")}</span>
      <span className="min-w-0 text-right text-snow/80 tabular-nums">
        {localTime}
        <span className="text-muted"> ({originTime})</span>
      </span>
    </div>
  );
}

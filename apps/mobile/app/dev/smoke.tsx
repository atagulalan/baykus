import { BrandSmoke } from "@baykus/ui";
import { getApiClientOptions } from "@baykus/api-client";
import { defaultLocale } from "@baykus/i18n";

export default function BrandSmokeScreen() {
  const api = getApiClientOptions();
  return (
    <BrandSmoke
      subtitle={`locale=${defaultLocale} · transport=${api.transport} · expo-router`}
    />
  );
}

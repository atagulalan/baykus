import { exportZipUrl } from "@baykus/api-client";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getAccessToken } from "./session.ts";

/** Download `/api/export.zip` with Bearer and open the system share sheet. */
export async function exportLibraryZip(includeSecrets = false): Promise<void> {
  const url = exportZipUrl(includeSecrets);
  const token = await getAccessToken();
  const headers: Record<string, string> = { "X-Request-Id": `mobile-export-${Date.now()}` };
  if (token) headers.Authorization = `Bearer ${token}`;

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error("cache_unavailable");

  const target = `${cacheDir}baykus-export.zip`;
  const result = await FileSystem.downloadAsync(url, target, { headers });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`export_failed_${result.status}`);
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("sharing_unavailable");
  }
  await Sharing.shareAsync(result.uri, {
    mimeType: "application/zip",
    dialogTitle: "Export baykuş library",
  });
}

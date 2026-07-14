import yauzl from "yauzl";

const ZIP_MAGIC = [0x50, 0x4b]; // "PK"

function isZip(buffer: Buffer): boolean {
  return buffer[0] === ZIP_MAGIC[0] && buffer[1] === ZIP_MAGIC[1];
}

/**
 * lazyEntries: true + manual readEntry() pump — yauzl emits "entry"/"end"
 * synchronously on open in non-lazy mode, before a Promise executor's
 * listeners can attach, silently dropping every event (see
 * packages/core/src/zip/import.ts's identical DECISION note from M6.2).
 */
function extractZipCsvContents(buffer: Buffer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err ?? new Error("failed to open zip"));
        return;
      }

      const contents: string[] = [];
      zipfile.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }
        zipfile.openReadStream(entry, (streamErr, stream) => {
          if (streamErr || !stream) {
            reject(streamErr ?? new Error(`failed to read zip entry ${entry.fileName}`));
            return;
          }
          const chunks: Buffer[] = [];
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          stream.on("end", () => {
            contents.push(Buffer.concat(chunks).toString("utf-8"));
            zipfile.readEntry();
          });
          stream.on("error", reject);
        });
      });
      zipfile.on("end", () => resolve(contents));
      zipfile.on("error", reject);
      zipfile.readEntry();
    });
  });
}

/** TV Time GDPR export is either a zip of CSVs or a single raw CSV file. */
export async function extractCsvContents(buffer: Buffer): Promise<string[]> {
  if (isZip(buffer)) return extractZipCsvContents(buffer);
  return [buffer.toString("utf-8")];
}

import { Readable } from "node:stream";
import type { Library } from "@baykus/core";
import { ZipImportError } from "@baykus/core";
import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "../middleware/errors.ts";

const MAX_IMPORT_BYTES = 50 * 1024 * 1024;

const importModeSchema = z.enum(["replace", "merge"]);

function todayCompact(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

/** contracts/api.md §Zip export / import. */
export function createZipRoutes(library: Library): Hono {
  const app = new Hono();

  app.get("/api/export.zip", (c) => {
    const includeSecrets = c.req.query("includeSecrets") === "1";
    const archive = library.exportZip({ includeSecrets });

    c.header("Content-Type", "application/zip");
    c.header("Content-Disposition", `attachment; filename="baykus-export-${todayCompact()}.zip"`);
    return c.body(Readable.toWeb(archive) as ReadableStream);
  });

  app.post("/api/import", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) {
      throw new ApiError("VALIDATION_FAILED", "multipart field 'file' (zip) is required");
    }
    if (file.size > MAX_IMPORT_BYTES) {
      throw new ApiError("PAYLOAD_TOO_LARGE", "import zip exceeds 50 MB");
    }

    const modeRaw = typeof body.mode === "string" ? body.mode : undefined;
    const isEmpty = library.listSeries().total === 0;
    if (modeRaw === undefined && !isEmpty) {
      throw new ApiError(
        "CONFLICT",
        "mode ('replace' | 'merge') is required for a non-empty library",
      );
    }
    const mode = importModeSchema.parse(modeRaw ?? "replace");

    const zipBuffer = Buffer.from(await file.arrayBuffer());
    try {
      const result = await library.importZip(zipBuffer, mode);
      return c.json(result);
    } catch (cause) {
      if (cause instanceof ZipImportError) {
        throw new ApiError("UNSUPPORTED_SCHEMA", cause.message);
      }
      throw cause;
    }
  });

  return app;
}

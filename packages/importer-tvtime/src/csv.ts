/**
 * Minimal RFC4180-ish CSV parser: handles quoted fields (embedded commas,
 * escaped `""`) and both \n and \r\n line endings. TV Time exports are
 * simple, but show names can contain commas, so a naive .split(",") isn't
 * safe.
 */
export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\r") {
      // consumed as part of \r\n below via \n handling; bare \r is treated as a line end too
      if (content[i + 1] !== "\n") pushRow();
    } else if (char === "\n") {
      pushRow();
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

/** Parses a CSV's rows into header-keyed records, trimming each header cell. */
export function parseCsvRecords(content: string): Record<string, string>[] {
  const rows = parseCsv(content);
  const header = rows[0]?.map((h) => h.trim());
  if (!header) return [];
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, i) => {
      record[key] = row[i] ?? "";
    });
    return record;
  });
}

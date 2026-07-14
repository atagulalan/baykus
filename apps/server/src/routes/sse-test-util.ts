/** Parses a `text/event-stream` response body into its individual events, for route tests. */
export async function readSseEvents(res: Response): Promise<{ event: string; data: unknown }[]> {
  const text = await res.text();
  const events: { event: string; data: unknown }[] = [];
  for (const block of text.split("\n\n")) {
    if (!block.trim()) continue;
    const eventLine = block.split("\n").find((line) => line.startsWith("event:"));
    const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
    if (!eventLine || !dataLine) continue;
    events.push({
      event: eventLine.slice("event:".length).trim(),
      data: JSON.parse(dataLine.slice("data:".length).trim()),
    });
  }
  return events;
}

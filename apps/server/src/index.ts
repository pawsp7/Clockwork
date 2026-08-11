import express, { type Request, type Response } from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

/**
 * A curated set of well-known cities the dashboard can offer out of the box.
 * The IANA timezone identifiers are resolved server-side so the client never
 * has to hard-code offset math (which breaks around DST changes).
 */
const CITY_CATALOG: ReadonlyArray<{ id: string; city: string; timezone: string }> = [
  { id: "sf", city: "San Francisco", timezone: "America/Los_Angeles" },
  { id: "nyc", city: "New York", timezone: "America/New_York" },
  { id: "london", city: "London", timezone: "Europe/London" },
  { id: "paris", city: "Paris", timezone: "Europe/Paris" },
  { id: "lagos", city: "Lagos", timezone: "Africa/Lagos" },
  { id: "dubai", city: "Dubai", timezone: "Asia/Dubai" },
  { id: "mumbai", city: "Mumbai", timezone: "Asia/Kolkata" },
  { id: "singapore", city: "Singapore", timezone: "Asia/Singapore" },
  { id: "tokyo", city: "Tokyo", timezone: "Asia/Tokyo" },
  { id: "sydney", city: "Sydney", timezone: "Australia/Sydney" },
  { id: "auckland", city: "Auckland", timezone: "Pacific/Auckland" },
];

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds a structured, DST-correct snapshot of the current time in a timezone.
 */
function describeTime(timeZone: string, at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "shortOffset",
  }).formatToParts(at);

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const offsetLabel = lookup("timeZoneName");

  return {
    timezone: timeZone,
    iso: at.toISOString(),
    weekday: lookup("weekday"),
    date: `${lookup("month")} ${lookup("day")}, ${lookup("year")}`,
    time: `${lookup("hour")}:${lookup("minute")}:${lookup("second")}`,
    offset: offsetLabel,
  };
}

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "clockwork-server", uptimeSeconds: process.uptime() });
});

app.get("/api/cities", (_req: Request, res: Response) => {
  res.json({ cities: CITY_CATALOG });
});

app.get("/api/time", (req: Request, res: Response) => {
  const timezone = String(req.query.tz ?? "UTC");

  if (!isValidTimeZone(timezone)) {
    res.status(400).json({ error: `Unknown timezone: ${timezone}` });
    return;
  }

  res.json(describeTime(timezone, new Date()));
});

app.listen(PORT, () => {
  console.log(`[clockwork-server] listening on http://localhost:${PORT}`);
});

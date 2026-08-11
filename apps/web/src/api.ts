export interface City {
  id: string;
  city: string;
  timezone: string;
}

export interface TimeSnapshot {
  timezone: string;
  iso: string;
  weekday: string;
  date: string;
  time: string;
  offset: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchCities(): Promise<{ cities: City[] }> {
  return getJson<{ cities: City[] }>("/api/cities");
}

export function fetchTime(timezone: string): Promise<TimeSnapshot> {
  return getJson<TimeSnapshot>(`/api/time?tz=${encodeURIComponent(timezone)}`);
}

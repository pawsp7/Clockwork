import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchCities, fetchTime, type City, type TimeSnapshot } from "./api";

interface ClockCard {
  city: City;
  snapshot: TimeSnapshot | null;
  error: string | null;
}

function useServerHealth() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () =>
      fetch("/api/health")
        .then((r) => alive && setOnline(r.ok))
        .catch(() => alive && setOnline(false));
    check();
    const id = setInterval(check, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return online;
}

function formatStopwatch(elapsedMs: number): string {
  const totalMs = Math.max(0, Math.floor(elapsedMs));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const centis = Math.floor((totalMs % 1000) / 10);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
}

function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    setElapsed(performance.now() - startRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = () => {
    if (running) return;
    startRef.current = performance.now() - elapsed;
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (!running) return;
    setRunning(false);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  };

  const reset = () => {
    stop();
    setElapsed(0);
    setLaps([]);
  };

  const lap = () => {
    if (running) setLaps((prev) => [elapsed, ...prev]);
  };

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <section className="panel stopwatch">
      <h2>Stopwatch</h2>
      <div className="stopwatch-display" aria-live="off" data-testid="stopwatch-display">
        {formatStopwatch(elapsed)}
      </div>
      <div className="button-row">
        {!running ? (
          <button className="btn btn-primary" onClick={start} data-testid="sw-start">
            Start
          </button>
        ) : (
          <button className="btn btn-warn" onClick={stop} data-testid="sw-stop">
            Stop
          </button>
        )}
        <button className="btn" onClick={lap} disabled={!running} data-testid="sw-lap">
          Lap
        </button>
        <button className="btn btn-ghost" onClick={reset} data-testid="sw-reset">
          Reset
        </button>
      </div>
      {laps.length > 0 && (
        <ol className="lap-list" reversed>
          {laps.map((l, i) => (
            <li key={laps.length - i}>
              <span>Lap {laps.length - i}</span>
              <span className="mono">{formatStopwatch(l)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function WorldClocks() {
  const [catalog, setCatalog] = useState<City[]>([]);
  const [cards, setCards] = useState<ClockCard[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetchCities()
      .then(({ cities }) => {
        setCatalog(cities);
        const defaults = cities.filter((c) => ["sf", "london", "tokyo"].includes(c.id));
        setCards(defaults.map((city) => ({ city, snapshot: null, error: null })));
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Failed to load cities"));
  }, []);

  const refresh = useCallback(() => {
    setCards((current) => {
      current.forEach((card) => {
        fetchTime(card.city.timezone)
          .then((snapshot) =>
            setCards((prev) =>
              prev.map((c) =>
                c.city.id === card.city.id ? { ...c, snapshot, error: null } : c,
              ),
            ),
          )
          .catch((e: unknown) =>
            setCards((prev) =>
              prev.map((c) =>
                c.city.id === card.city.id
                  ? { ...c, error: e instanceof Error ? e.message : "error" }
                  : c,
              ),
            ),
          );
      });
      return current;
    });
  }, []);

  useEffect(() => {
    if (cards.length === 0) return;
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  const available = useMemo(
    () => catalog.filter((c) => !cards.some((card) => card.city.id === c.id)),
    [catalog, cards],
  );

  const addCity = () => {
    const city = catalog.find((c) => c.id === selected);
    if (!city) return;
    setCards((prev) => [...prev, { city, snapshot: null, error: null }]);
    setSelected("");
  };

  const removeCity = (id: string) =>
    setCards((prev) => prev.filter((c) => c.city.id !== id));

  return (
    <section className="panel world-clocks">
      <div className="panel-header">
        <h2>World Clocks</h2>
        <div className="add-city">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            data-testid="city-select"
            aria-label="Choose a city to add"
          >
            <option value="">Add a city…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.city}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={addCity}
            disabled={!selected}
            data-testid="add-city"
          >
            Add
          </button>
        </div>
      </div>

      {loadError && <p className="error">Could not reach API: {loadError}</p>}

      <div className="clock-grid" data-testid="clock-grid">
        {cards.map(({ city, snapshot, error }) => (
          <article className="clock-card" key={city.id} data-testid={`clock-${city.id}`}>
            <button
              className="remove"
              onClick={() => removeCity(city.id)}
              aria-label={`Remove ${city.city}`}
            >
              ×
            </button>
            <h3>{city.city}</h3>
            {error ? (
              <p className="error">{error}</p>
            ) : snapshot ? (
              <>
                <div className="clock-time mono">{snapshot.time}</div>
                <div className="clock-meta">
                  {snapshot.weekday} · {snapshot.date}
                </div>
                <div className="clock-offset">{snapshot.offset}</div>
              </>
            ) : (
              <div className="clock-time mono muted">--:--:--</div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const online = useServerHealth();
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="gear" aria-hidden>
            ⚙
          </span>
          <h1>Clockwork</h1>
        </div>
        <div className={`status ${online ? "up" : online === false ? "down" : ""}`}>
          <span className="dot" />
          {online === null ? "Checking API…" : online ? "API online" : "API offline"}
        </div>
      </header>
      <main className="app-main">
        <WorldClocks />
        <Stopwatch />
      </main>
      <footer className="app-footer">
        Times served live from the Clockwork API using IANA timezones.
      </footer>
    </div>
  );
}

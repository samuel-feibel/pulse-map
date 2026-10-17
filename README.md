# Pulse Map

A live city map made for a projector on your wall: subway trains gliding along their tracks, the weather
drifting across, stadiums lighting up during games, and planes taking off and landing.

Cities so far: **Boston** (MBTA subway, Celtics/Bruins/Red Sox, Logan Airport) and **San Francisco**
(Muni Metro, F line and cable cars, BART, Caltrain, Giants/Warriors/Valkyries, SFO).

```bash
npm install
npm run dev
```

San Francisco transit needs a free [511.org token](https://511.org/open-data/token): copy `.env.example`
to `.env.local` and fill in `TRANSIT_511_API_KEY`. Only the dev server reads it; it never reaches the
browser or git.

## Cities

Pick a city with `?city=`: `http://localhost:5173/?city=sf`. Boston is the default.

Everything about a city lives in its own folder under `src/cities/`:

| File | What's in it |
| --- | --- |
| `src/cities/<city>/index.ts` | The view (center, places that must fit on the wall) and which features the city has |
| `src/cities/boston/sports.ts` | Teams, and where and how big each stadium is drawn (safe to tweak) |
| `src/cities/boston/airport.ts` | Airport code, position, runways, and which runways the demo traffic uses |

Features are optional per city: leave out `transit`, `sportsTeams` or `airport` and the wall simply
doesn't show it there. Weather is always on. To add a city, copy `src/cities/sanFrancisco/`, fill it in,
and list it in `src/cities/index.ts`. Live transit comes from a `TransitProvider` (`src/transit/types.ts`);
Boston uses the MBTA one in `src/mbta/provider.ts`.

Shared stadium look (outline width, fill, score text size) is in `src/sports/tuning.ts`.

## Trying things out

| URL / key | What it does |
| --- | --- |
| `?sports=redsox` (any team id in the city) | Preview one team's stadium: a live home game scoring every few seconds |
| `?planes=demo` | Scripted fake air traffic with Logan takeoffs and landings |
| `?weather=rain` (`clear`, `cloudy`, `fog`, `drizzle`, `storm`, `snow`) | Force a weather look |
| `?sky=dusk` (`day`, `night`, `dawn`) | Force a time of day |
| `W` / `S` keys | Cycle weather / sky presets |
| `D` key | Cycle sports: live → each of the city's teams |

## Data sources and rate limits

Every request goes through `src/net/politeFetch.ts`, which spaces requests per service
(remembered across page reloads and tabs) and backs off for at least a minute on a `429`.
Slow-changing data (subway lines, stations) is cached for a day.

| Data | Source | Their limit | We use |
| --- | --- | --- | --- |
| Trains, lines, stations | [MBTA V3 API](https://api-v3.mbta.com) | 20/min without a key | ≤ 15/min (≈ 6/min steady) |
| Weather | [Open-Meteo](https://open-meteo.com) | 10,000/day, non-commercial | 1 per 10 min |
| Scores | ESPN public scoreboard (unofficial, no published limit) | — | ≥ 5 s apart; every 30 s while a game is live, 5 min otherwise |
| Planes | [adsb.fi open data](https://adsb.fi) | 1/sec, personal non-commercial use | 1 per 10 s (via the dev-server proxy) |
| Flight routes | [adsbdb](https://www.adsbdb.com) (no published limit) | — | Only on takeoffs/landings, cached, ≥ 5 s apart |
| SF Muni live positions | [511.org](https://511.org/open-data/transit) (your token) | 60/hour per token | 1 per 75 s from the dev server, shared by all tabs; pauses when 511 reports ≤ 5 left |
| Muni + Caltrain schedules | 511.org GTFS feeds | (same budget) | 1 download per agency per week, cached on disk |
| BART schedule | [BART GTFS](https://www.bart.gov/schedules/developers/gtfs) | — | 1 download per week, cached on disk |

BART publishes no live train positions, and live Caltrain would exceed 511's hourly budget, so those
trains move along their tracks by the published timetable. Muni trains are live.

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, tiles by
[OpenFreeMap](https://openfreemap.org). Aircraft data from [adsb.fi](https://adsb.fi).
Route data via adsbdb (David Taylor and Jim Mason's flight route data).

The plane feed is proxied by the Vite dev server (`vite.config.ts`) because adsb.fi doesn't allow
browser requests from other sites, so planes only work under `npm run dev` for now.

## License

The code is released under the [MIT License](LICENSE): use it, change it, and share it freely.

The live data it shows comes with its own terms, which still apply when you run it. In particular,
adsb.fi aircraft data is for personal, non-commercial use and must be credited, and adsbdb's route data
may not be copied into other databases. See each source's site (linked above) before using the data
for anything beyond a personal wall.

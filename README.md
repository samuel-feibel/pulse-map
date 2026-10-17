# Pulse Map

A live city map made for a projector on your wall: subway trains gliding along their tracks, the weather
drifting across, stadiums lighting up during games, and planes taking off and landing.

The first city is **Boston** (MBTA subway, Celtics/Bruins/Red Sox, Logan Airport). San Francisco is next.

```bash
npm install
npm run dev
```

## Trying things out

| URL / key | What it does |
| --- | --- |
| `?sports=redsox` (`celtics`, `bruins`) | Preview one team's stadium: a live home game scoring every few seconds |
| `?planes=demo` | Scripted fake air traffic with Logan takeoffs and landings |
| `?weather=rain` (`clear`, `cloudy`, `fog`, `drizzle`, `storm`, `snow`) | Force a weather look |
| `?sky=dusk` (`day`, `night`, `dawn`) | Force a time of day |
| `W` / `S` keys | Cycle weather / sky presets |
| `D` key | Cycle sports: live → Red Sox → Celtics → Bruins previews |

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

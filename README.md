# Aviation Calcs

Free, static aviation calculators for pilots — an online E6B and related aviation math, in the browser. No build step and no backend: just HTML, CSS, and JavaScript.

Live site: [https://aviatorcalcs.com/](https://aviatorcalcs.com/) (also still reachable at [https://breel007.github.io/aviation-calcs/](https://breel007.github.io/aviation-calcs/) while that host is configured).

## Calculators

### Flight planning & E6B

- [E6B wind triangle](e6b-wind/) — wind correction angle, true heading, and groundspeed, or winds aloft in reverse.
- [Fuel planner](fuel-planning/) — trip fuel, VFR/IFR reserves, endurance, and 100LL / Jet-A weight.
- [Time, speed & distance](time-speed-distance/) — solve any of time, groundspeed, or distance, plus ETA.
- [True airspeed](true-airspeed/) — CAS/IAS to TAS, Mach, and equivalent airspeed.
- [Top of descent](top-of-descent/) — TOD distance and descent rate for a 3° path or a custom angle.
- [Climb gradient](climb-gradient/) — ft/NM, fpm, percent, and degrees, plus a departure-minimum check.
- [Turn radius](turn-radius/) — standard-rate bank, turn radius, load factor, and stall speed in a bank.
- [Glide distance](glide-distance/) — best-glide range from altitude and glide ratio, with wind.
- [Holding pattern entry](holding-pattern-entry/) — AIM-recommended direct, teardrop, or parallel entry.
- [Aviation unit converter](aviation-unit-converter/) — knots, nautical miles, inHg, gallons, Celsius, fpm, and more.

### Performance & weight

- [Density altitude](density-altitude/) — pressure altitude, ICAO density altitude, humidity correction, two-way ISA deviation (ISA +/−), and a rough takeoff/climb estimate.
- [Crosswind](crosswind/) — crosswind, headwind, and tailwind components for both runway ends, including gusts and a wind diagram.
- [Weight and balance](weight-balance/) — generic W&B / CG calculator with an editable envelope and example Cessna 172S, Piper Archer, and Cessna 152 arms.

### Weather & time

- [METAR decoder](metar-decoder/) — raw METAR or SPECI in plain English, with FAA flight category.
- [TAF decoder](taf-decoder/) — FM / TEMPO / BECMG / PROB groups in plain English, with flight category.
- [Cloud base](cloud-base/) — convective cloud base from the temperature–dewpoint spread, plus freezing level.
- [Sunrise, sunset & FAA night](sunrise-sunset-twilight/) — sunrise, sunset, civil twilight, and FAA night definitions.
- [Zulu time converter](zulu-time-converter/) — local ↔ UTC, a live Zulu clock, and flight-plan ETAs.

### Pilot costs & currency

- [Aircraft ownership cost](aircraft-ownership-cost/) — annual and hourly cost to own, and breakeven hours versus renting.
- [Aircraft loan](aircraft-loan/) — payment, amortization, and affordability.
- [Flight training cost](flight-training-cost/) — private, instrument, commercial, and CFI cost estimates.
- [Aircraft rental cost](rental-cost/) — Hobbs vs tach, wet vs dry, and a 61.113 pro-rata split.
- [FAA pilot currency](pilot-currency/) — 61.57 landings and IFR, 61.56 flight review, and 61.23 medical dates.

## Run locally

```bash
python3 -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/).

## Tests

```bash
for f in */test.js; do echo "== $f =="; node "$f" || exit 1; done
```

## Site URL

The public base URL lives in one place: [`site-config.js`](site-config.js).

To change the public host:

1. Change `baseUrl` in `site-config.js` (no trailing slash).
2. Run `node scripts/write-site-files.js`.

That regenerates `sitemap.xml` and `robots.txt` and updates canonical / Open Graph URLs in the HTML pages.

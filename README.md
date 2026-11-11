# Aviation Calcs

Free, static aviation and aerospace calculators — an online E6B and related math, in the browser. No build step and no backend: just HTML, CSS, and JavaScript.

Live site: [https://aviatorcalcs.com/](https://aviatorcalcs.com/) (also still reachable at [https://breel007.github.io/aviation-calcs/](https://breel007.github.io/aviation-calcs/) while that host is configured).

The tools are grouped in two sides. Some calculators appear in both.

## Pilot calculators

### Flight planning & navigation

- [Time, speed & distance](time-speed-distance/) — solve any of time, groundspeed, or distance, plus ETA.
- [E6B wind triangle](e6b-wind/) — wind correction angle, true heading, and groundspeed, or winds aloft in reverse.
- [Fuel planner](fuel-planning/) — trip fuel, VFR/IFR reserves, endurance, and 100LL / Jet-A weight.
- [Aviation unit converter](aviation-unit-converter/) — knots, nautical miles, inHg, gallons, Celsius, fpm, and more.
- [Top of descent](top-of-descent/) — TOD distance and descent rate for a 3° path or a custom angle.
- [Descent rate / glideslope VSI](descent-rate/) — required vertical speed for a 3° ILS or a custom path, in fpm and ft/NM, versus the GS × 5 rule.
- [Holding pattern entry](holding-pattern-entry/) — AIM-recommended direct, teardrop, or parallel entry.
- [Climb gradient](climb-gradient/) — ft/NM, fpm, percent, and degrees, plus a departure-minimum check.
- [Glide distance](glide-distance/) — best-glide range from altitude and glide ratio, with wind.
- [Turn radius](turn-radius/) — standard-rate bank, turn radius, load factor, and stall speed in a bank.
- [Visual descent point](visual-descent-point/) — VDP distance from HAT and path angle (exact and the HAT/300 rule), optional DME, and descent rate.
- [RVR to visibility](rvr-visibility/) — comparable RVR and statute-mile visibility from 14 CFR 91.175(h) (also listed under Weather & time).
- [VOR / DME and the 1-in-60 rule](vor-dme-1-in-60/) — course-error offset, time and distance to a station, DME slant-range correction, and lead radial.
- [Point of no return and ETP](point-of-no-return/) — PNR and equal-time point from groundspeeds or TAS and wind.
- [True altitude](true-altitude/) — temperature correction of pressure altitude (also listed under Weather & time).
- [Cold temperature correction](cold-temperature-correction/) — ICAO Doc 8168 formula, AIM Table 7-3-1, and the 4% rule for a published approach altitude (also listed under Weather & time).
- [Route weather go / no-go](weather-go-no-go/) — historical ceiling, visibility, wind, and weather climatology along a route (also listed under Weather & time).

### Performance

- [Density altitude](density-altitude/) — pressure altitude, ICAO density altitude, humidity correction, two-way ISA deviation (ISA +/−), and a rough takeoff/climb estimate.
- [Takeoff and landing distance](takeoff-landing-distance/) — correct a POH baseline for wind, weight, density altitude, slope, and surface, including the PHAK 19% / 21% wind identity.
- [Crosswind](crosswind/) — crosswind, headwind, and tailwind components for both runway ends, including gusts and a wind diagram.
- [Runway selection](runway-selection/) — headwind and crosswind on every runway, true-to-magnetic variation, and a recommended heading within your crosswind limit.
- [Weight and balance](weight-balance/) — generic W&B / CG calculator with an editable envelope and example Cessna 172S, Piper Archer, and Cessna 152 arms.
- [CG percent MAC](cg-percent-mac/) — convert a CG station and LEMAC to percent of mean aerodynamic chord, or invert a % MAC to a station (also listed under Aerodynamics).
- [True airspeed](true-airspeed/) — CAS/IAS to TAS, Mach, and equivalent airspeed.
- [Hydroplaning speed](hydroplaning-speed/) — dynamic hydroplaning speed 9√P and the locked-wheel 7.7√P figure from tire inflation pressure.
- [Stall speed vs weight and bank](stall-speed-weight-bank/) — Vs scaled by √(W/Wref) and √n, with a bank table.
- [Maneuvering speed vs weight](maneuvering-speed-weight/) — Va = Va_ref × √(W/Wref), optionally from stall speed and limit load factor.
- [Pivotal altitude](pivotal-altitude/) — eights-on-pylons pivotal altitude from groundspeed (AFH GS²/11.3 and GS²/15, plus exact V²/g).
- [Aviation fuel weight](fuel-weight/) — gallons, litres, pounds, and kilograms for 100LL, Jet-A, Jet-B, JP-5, and JP-8, with an optional temperature correction.
- [Drag polar and L/D max](drag-polar/) — quadratic polar, (L/D)max, and propeller / jet range and endurance lift coefficients (also listed under Aerodynamics).
- [Thrust and power required](thrust-power-required/) — level-flight T_req and P_req from a drag polar, with (L/D)max and minimum-power speeds (also listed under Aerodynamics and Propulsion).
- [Breguet range and endurance](breguet-range-endurance/) — jet and propeller range and endurance from L/D, speed, and fuel fraction (also listed under Propulsion).

### Weather & time

- [METAR decoder](metar-decoder/) — raw METAR or SPECI in plain English, with FAA flight category.
- [TAF decoder](taf-decoder/) — FM / TEMPO / BECMG / PROB groups in plain English, with flight category.
- [RVR to visibility](rvr-visibility/) — 14 CFR 91.175(h) comparable values of RVR and ground visibility; no interpolation.
- [Pressure altitude](pressure-altitude/) — from altimeter setting (QNH), with QFE and QNE, and the 1,000 ft per inHg rule of thumb.
- [Cloud base](cloud-base/) — convective cloud base from the temperature–dewpoint spread, plus freezing level.
- [Zulu time converter](zulu-time-converter/) — local ↔ UTC, a live Zulu clock, and flight-plan ETAs.
- [Sunrise, sunset & FAA night](sunrise-sunset-twilight/) — sunrise, sunset, civil twilight, and FAA night definitions.
- [Standard atmosphere](standard-atmosphere/) — ISA / U.S. Standard Atmosphere 1976 properties, and the inverse to pressure and density altitude (also listed under Atmosphere).
- [True altitude](true-altitude/) — temperature correction of pressure altitude; cold weather: look out below.
- [Cold temperature correction](cold-temperature-correction/) — add the ICAO / AIM correction to a published approach altitude so the true height matches the chart.
- [Route weather go / no-go](weather-go-no-go/) — how often that week and time of day historically met your ceiling, visibility, wind, and weather minimums along a route, from archived METARs.

### Regs, currency & costs

- [Flight training cost](flight-training-cost/) — private, instrument, commercial, and CFI cost estimates.
- [Aircraft ownership cost](aircraft-ownership-cost/) — annual and hourly cost to own, and breakeven hours versus renting.
- [Aircraft rental cost](rental-cost/) — Hobbs vs tach, wet vs dry, and a 61.113 pro-rata split.
- [Aviation fuel cost](fuel-cost/) — cost per hour and per trip from fuel flow and price, or from gallons, for 100LL and Jet-A, with optional oil.
- [Aircraft loan](aircraft-loan/) — payment, amortization, and affordability.
- [FAA pilot currency](pilot-currency/) — 61.57 landings and IFR, 61.56 flight review, and 61.23 medical dates.
- [Oxygen requirements](oxygen-requirements/) — 14 CFR 91.211, 135.89, and 121.329 at a cabin altitude and duration, plus FAA / CAMI time of useful consciousness.

## Aerospace engineering calculators

### Atmosphere

- [Standard atmosphere](standard-atmosphere/) — ISA / U.S. Standard Atmosphere 1976: altitude to T, P, density, speed of sound, and Sutherland viscosity, or invert pressure and density, in SI and English units through 86 km.
- [Density altitude](density-altitude/) — ICAO density altitude from pressure altitude, temperature, and humidity (also listed under Performance).
- [Pressure altitude](pressure-altitude/) — altimeter setting to pressure altitude (also listed under Weather & time).
- [Aviation unit converter](aviation-unit-converter/) — SI and English aviation units (also listed under Flight planning).

### Aerodynamics

- [Mach and dynamic pressure](mach-dynamic-pressure/) — Mach, q = ½ρV², speed of sound, and equivalent airspeed.
- [Reynolds number](reynolds-number/) — Re = ρVL/μ with ISA air properties or values you enter.
- [Lift and drag coefficients](lift-drag-coefficient/) — CL, CD, and L/D from force, speed, density, and reference area.
- [Wing loading and aspect ratio](wing-loading-aspect-ratio/) — W/S, AR, tapered-wing chords and MAC, and a stall-speed estimate from CLmax.
- [Drag polar and L/D max](drag-polar/) — CD = CD0 + k CL², (L/D)max, and the classic propeller and jet range and endurance lift coefficients.
- [Thrust and power required](thrust-power-required/) — drag, L/D, thrust required, and power required in level flight (also listed under Performance and Propulsion).
- [CG percent MAC](cg-percent-mac/) — CG as a percent of mean aerodynamic chord, with a tapered-wing MAC helper (also listed under Performance).
- [Isentropic flow](isentropic-flow/) — Mach, T/T0, P/P0, ρ/ρ0, and A/A* (NACA Report 1135), including stagnation temperature and pressure.
- [Normal shock](normal-shock/) — M2, static ratios, and total-pressure loss P02/P01 (NACA Report 1135).
- [Oblique shock](oblique-shock/) — θ–β–M relation, weak and strong wave angles, and downstream Mach and pressure ratios (NACA Report 1135).
- [Prandtl–Meyer expansion](prandtl-meyer/) — ν(M), downstream Mach after a turning angle, and isentropic static ratios (NACA Report 1135).
- [Stall speed vs weight and bank](stall-speed-weight-bank/) — Vs scaled by weight and load factor (also listed under Performance).
- [True airspeed](true-airspeed/) — CAS/IAS to TAS, Mach, and EAS (also listed under Performance).
- [Turn radius](turn-radius/) — turn radius, standard-rate bank, and load factor (also listed under Flight planning).

### Propulsion

- [Specific impulse](specific-impulse/) — Isp, effective exhaust velocity, thrust, and mass flow, with an optional ideal Δv (also listed under Space).
- [Rocket equation](rocket-equation/) — Tsiolkovsky Δv, Isp, mass ratio, and multi-stage burns (also listed under Space).
- [Breguet range and endurance](breguet-range-endurance/) — jet and propeller range and endurance (also listed under Performance).
- [Thrust and power required](thrust-power-required/) — T_req, P_req, and optional propeller shaft power (also listed under Performance).
- [Propeller advance ratio and tip Mach](propeller-advance-ratio/) — J = V/(nD), rotational and helical tip speed, and tip Mach.
- [Isentropic flow](isentropic-flow/) — nozzle and stagnation relations (also listed under Aerodynamics).

### Space

- [Orbital velocity and period](orbital-velocity-period/) — circular speed, period, escape speed, and vis-viva speeds on an ellipse.
- [Hohmann transfer](hohmann-transfer/) — two-impulse Δv and time of flight between coplanar circular orbits, including LEO to GEO.
- [Rocket equation](rocket-equation/) — ideal Δv from Isp and mass ratio (also listed under Propulsion).
- [Specific impulse](specific-impulse/) — Isp, exhaust velocity, thrust, and mass flow (also listed under Propulsion).

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

# Aviation Calcs

Free, static aviation and aerospace calculators — an online E6B and related math, in the browser. No build step and no backend: just HTML, CSS, and JavaScript.

Live site: [https://aviatorcalcs.com/](https://aviatorcalcs.com/) (also still reachable at [https://breel007.github.io/aviation-calcs/](https://breel007.github.io/aviation-calcs/) while that host is configured).

The tools are grouped in two sides. Some calculators appear in both.

## Pilot calculators

### Flight planning & navigation

- [Time, speed & distance](time-speed-distance/) — solve any of time, groundspeed, or distance, plus ETA.
- [Great-circle distance](great-circle-distance/) — haversine range and initial true course between two points, entered as an airport / navaid / fix identifier or as latitude and longitude.
- [E6B wind triangle](e6b-wind/) — wind correction angle, true heading, and groundspeed, or winds aloft in reverse.
- [Fuel planner](fuel-planning/) — trip fuel, VFR/IFR reserves, endurance, and 100LL / Jet-A weight.
- [In-flight fuel and ETA](inflight-fuel-eta/) — remaining distance, current groundspeed and fuel flow, fuel at the destination, and a 91.151 / 91.167 reserve check.
- [Aviation unit converter](aviation-unit-converter/) — knots, nautical miles, inHg, gallons, Celsius, fpm, and more.
- [True / magnetic heading](true-magnetic-heading/) — convert true, magnetic, and compass heading or course with variation and optional deviation (east is least, west is best).
- [Compass turning errors](compass-turning-errors/) — magnetic dip from latitude, plus the UNOS / ANDS turning and acceleration errors (qualitative; no invented lag in degrees).
- [Top of descent](top-of-descent/) — TOD distance and descent rate for a 3° path or a custom angle.
- [Descent rate / glideslope VSI](descent-rate/) — required vertical speed for a 3° ILS or a custom path, in fpm and ft/NM, versus the GS × 5 rule.
- [ILS glideslope height](ils-glideslope-height/) — height above the threshold from distance, path angle, and TCH, or the distance for a given height, plus an optional descent rate.
- [Holding pattern entry](holding-pattern-entry/) — AIM-recommended direct, teardrop, or parallel entry.
- [Climb gradient](climb-gradient/) — ft/NM, fpm, percent, and degrees, plus a departure-minimum check.
- [Glide distance](glide-distance/) — best-glide range from altitude and glide ratio, with wind.
- [MacCready speed to fly](maccready/) — speed to fly, still-air best glide, and minimum sink from a quadratic glider polar (also listed under Performance).
- [Turn radius](turn-radius/) — standard-rate bank, turn radius, load factor, and stall speed in a bank.
- [Time to turn](time-to-turn/) — time for a heading change at 3°/s, half-standard, or a rate from TAS and bank.
- [Visual descent point](visual-descent-point/) — VDP distance from HAT and path angle (exact and the HAT/300 rule), optional DME, and descent rate.
- [RVR to visibility](rvr-visibility/) — comparable RVR and statute-mile visibility from 14 CFR 91.175(h) (also listed under Weather & time).
- [Wake turbulence separation](wake-turbulence-separation/) — AIM 7-4-9 wake minima by Super, Heavy, B757, Large, and Small class for radar, landing, and departure scenarios.
- [VOR / DME and the 1-in-60 rule](vor-dme-1-in-60/) — course-error offset, time and distance to a station, DME slant-range correction, and lead radial.
- [Radio horizon / VHF range](radio-horizon/) — line-of-sight VHF and radar range from antenna height, with the 4/3-Earth radio horizon and the 1.23√h rule.
- [Point of no return and ETP](point-of-no-return/) — PNR and equal-time point from groundspeeds or TAS and wind.
- [True altitude](true-altitude/) — temperature correction of pressure altitude (also listed under Weather & time).
- [Flight level and transition](flight-level/) — pressure altitude ↔ flight level, and whether a published TA / TL puts you on QNH or 29.92 (also listed under Weather & time).
- [Cold temperature correction](cold-temperature-correction/) — ICAO Doc 8168 formula, AIM Table 7-3-1, and the 4% rule for a published approach altitude (also listed under Weather & time).
- [Route weather go / no-go](weather-go-no-go/) — historical ceiling, visibility, wind, and weather climatology along a route (also listed under Weather & time).

### Performance

- [Density altitude](density-altitude/) — pressure altitude, ICAO density altitude, humidity correction, two-way ISA deviation (ISA +/−), and a rough takeoff/climb estimate.
- [Takeoff and landing distance](takeoff-landing-distance/) — correct a POH baseline for wind, weight, density altitude, slope, and surface, including the PHAK 19% / 21% wind identity.
- [Accelerate-stop distance](accelerate-stop/) — educational distance to a decision speed, through a recognition delay, and to a stop (not a certified ASDR or V1).
- [Approach and landing speed](approach-speed/) — Vref = 1.3 × Vso, a √(W/Wref) weight correction, and the FAA gust-factor additive of half the gust increment.
- [Crosswind](crosswind/) — crosswind, headwind, and tailwind components for both runway ends, including gusts and a wind diagram.
- [Runway selection](runway-selection/) — headwind and crosswind on every runway, true-to-magnetic variation, and a recommended heading within your crosswind limit.
- [Weight and balance](weight-balance/) — generic W&B / CG calculator with an editable envelope and example Cessna 172S, Piper Archer, and Cessna 152 arms.
- [CG percent MAC](cg-percent-mac/) — convert a CG station and LEMAC to percent of mean aerodynamic chord, or invert a % MAC to a station (also listed under Aerodynamics).
- [True airspeed](true-airspeed/) — CAS/IAS to TAS, Mach, and equivalent airspeed.
- [Vmo / Mmo crossover](crossover-altitude/) — pressure altitude at which a Vmo calibrated-airspeed limit and an Mmo Mach limit coincide.
- [Service ceiling](service-ceiling/) — service and absolute ceilings from a linear rate-of-climb versus density-altitude model, or from two climb rates.
- [Hydroplaning speed](hydroplaning-speed/) — dynamic hydroplaning speed 9√P and the locked-wheel 7.7√P figure from tire inflation pressure.
- [Stall speed vs weight and bank](stall-speed-weight-bank/) — Vs scaled by √(W/Wref) and √n, with a bank table.
- [Maneuvering speed vs weight](maneuvering-speed-weight/) — Va = Va_ref × √(W/Wref), optionally from stall speed and limit load factor.
- [Pull-up load factor](pull-up-load-factor/) — n = 1 + V²/(gR) at the bottom of a pull-up, n = V²/(gR) − 1 at the top of a loop, and Vs √n (also listed under Aerodynamics).
- [Pivotal altitude](pivotal-altitude/) — eights-on-pylons pivotal altitude from groundspeed (AFH GS²/11.3 and GS²/15, plus exact V²/g).
- [Aviation fuel weight](fuel-weight/) — gallons, litres, pounds, and kilograms for 100LL, Jet-A, Jet-B, JP-5, and JP-8, with an optional temperature correction.
- [Drone / multirotor flight time](drone-flight-time/) — hover endurance and thrust-to-weight from weight, rotor size, battery energy, and a figure of merit.
- [Drag polar and L/D max](drag-polar/) — quadratic polar, (L/D)max, and propeller / jet range and endurance lift coefficients (also listed under Aerodynamics).
- [MacCready speed to fly](maccready/) — glider speed to fly from a quadratic polar and a next-thermal climb rate (also listed under Flight planning).
- [Parachute descent](parachute-descent/) — time to the ground and wind drift from a descent rate or from mass, Cd, and area (also listed under Aerodynamics).
- [Hot-air balloon lift](balloon-lift/) — gross and useful lift from envelope volume and the inside/outside temperature difference.
- [Thrust and power required](thrust-power-required/) — level-flight T_req and P_req from a drag polar, with (L/D)max and minimum-power speeds (also listed under Aerodynamics and Propulsion).
- [Breguet range and endurance](breguet-range-endurance/) — jet and propeller range and endurance from L/D, speed, and fuel fraction (also listed under Propulsion).
- [Electric aircraft endurance](electric-aircraft-endurance/) — battery endurance and range from usable watt-hours and cruise power, or from weight, speed, and L/D (also listed under Propulsion).

### Weather & time

- [METAR decoder](metar-decoder/) — raw METAR or SPECI in plain English, with FAA flight category.
- [TAF decoder](taf-decoder/) — FM / TEMPO / BECMG / PROB groups in plain English, with flight category.
- [RVR to visibility](rvr-visibility/) — 14 CFR 91.175(h) comparable values of RVR and ground visibility; no interpolation.
- [Pressure altitude](pressure-altitude/) — from altimeter setting (QNH), with QFE and QNE, and the 1,000 ft per inHg rule of thumb.
- [Flight level and transition](flight-level/) — pressure altitude ↔ flight level and the transition altitude / transition level switch (also listed under Flight planning).
- [Cloud base](cloud-base/) — convective cloud base from the temperature–dewpoint spread, plus freezing level.
- [Carburetor icing, dewpoint & frost point](carburetor-icing/) — RH, frost point, and FAA PHAK Figure 7-12 carburetor-icing zones.
- [Thunderstorm flash-to-bang](thunderstorm-distance/) — storm range from the seconds between a lightning flash and its thunder, using the local speed of sound.
- [Heat index](heat-index/) — NWS apparent temperature from the Rothfusz regression, humidity adjustments, and the Steadman fallback.
- [Wind chill](wind-chill/) — North American wind-chill temperature from the NWS 2001 formula.
- [Wind shear / gradient](wind-shear-gradient/) — wind at a second height from a 1/7-power-law profile or a linear shear in knots per 100 feet.
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
- [Logbook time totals](logbook-time/) — add flights in H:MM or decimal hours, convert to aviation tenths, and subtotal PIC, night, XC, instrument time, and landings.
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
- [Thin-airfoil lift](thin-airfoil-lift/) — section lift coefficient cl = 2π(α − α_L0), with an optional dimensional lift.
- [Terminal velocity and ballistic re-entry](terminal-velocity/) — ballistic coefficient, ISA terminal speed, and the Allen–Eggers peak-deceleration pulse (also listed under Space).
- [Parachute descent](parachute-descent/) — time-to-ground and wind drift, with an optional v_t from Cd A (also listed under Performance).
- [Wing loading and aspect ratio](wing-loading-aspect-ratio/) — W/S, AR, tapered-wing chords and MAC, and a stall-speed estimate from CLmax.
- [Finite-wing lift slope](lift-slope-ar/) — Prandtl lifting-line and Helmbold corrections of a section lift-curve slope for aspect ratio.
- [Drag polar and L/D max](drag-polar/) — CD = CD0 + k CL², (L/D)max, and the classic propeller and jet range and endurance lift coefficients.
- [Thrust and power required](thrust-power-required/) — drag, L/D, thrust required, and power required in level flight (also listed under Performance and Propulsion).
- [CG percent MAC](cg-percent-mac/) — CG as a percent of mean aerodynamic chord, with a tapered-wing MAC helper (also listed under Performance).
- [Isentropic flow](isentropic-flow/) — Mach, T/T0, P/P0, ρ/ρ0, and A/A* (NACA Report 1135), including stagnation temperature and pressure.
- [C-D nozzle](cd-nozzle/) — isentropic exit Mach from Ae/At, ideal thrust coefficient Cf, and over- / perfectly / under-expanded status (also listed under Propulsion).
- [Normal shock](normal-shock/) — M2, static ratios, and total-pressure loss P02/P01 (NACA Report 1135).
- [Oblique shock](oblique-shock/) — θ–β–M relation, weak and strong wave angles, and downstream Mach and pressure ratios (NACA Report 1135).
- [Prandtl–Meyer expansion](prandtl-meyer/) — ν(M), downstream Mach after a turning angle, and isentropic static ratios (NACA Report 1135).
- [Fanno flow](fanno-flow/) — adiabatic constant-area flow with friction: starred ratios and 4fL*/D to sonic.
- [Rayleigh flow](rayleigh-flow/) — frictionless constant-area flow with heat addition: starred Rayleigh-line ratios.
- [Stall speed vs weight and bank](stall-speed-weight-bank/) — Vs scaled by weight and load factor (also listed under Performance).
- [True airspeed](true-airspeed/) — CAS/IAS to TAS, Mach, and EAS (also listed under Performance).
- [Turn radius](turn-radius/) — turn radius, standard-rate bank, and load factor (also listed under Flight planning).
- [Pull-up load factor](pull-up-load-factor/) — n = 1 + V²/(gR) in a vertical-plane pull-up or loop, and accelerated stall speed (also listed under Performance).

### Propulsion

- [Specific impulse](specific-impulse/) — Isp, effective exhaust velocity, thrust, and mass flow, with an optional ideal Δv (also listed under Space).
- [Jet engine thrust / TSFC](jet-engine-thrust/) — net thrust from the momentum and pressure terms, plus thrust-specific fuel consumption.
- [Brayton cycle efficiency](brayton-cycle/) — ideal air-standard Brayton thermal efficiency versus pressure ratio, with optional station temperatures.
- [Rocket equation](rocket-equation/) — Tsiolkovsky Δv, Isp, mass ratio, and multi-stage burns (also listed under Space).
- [Delta-v budget](delta-v-budget/) — sum mission Δv items, an ideal mass ratio from Isp, and a pure plane-change helper (also listed under Space).
- [Breguet range and endurance](breguet-range-endurance/) — jet and propeller range and endurance (also listed under Performance).
- [Electric aircraft endurance](electric-aircraft-endurance/) — battery-electric endurance and still-air range (also listed under Performance).
- [Thrust and power required](thrust-power-required/) — T_req, P_req, and optional propeller shaft power (also listed under Performance).
- [Propeller advance ratio and tip Mach](propeller-advance-ratio/) — J = V/(nD), rotational and helical tip speed, and tip Mach.
- [Propeller static thrust](propeller-static-thrust/) — static thrust from shaft power and disk area, T = (2ρAP²)¹/³, by momentum theory.
- [Hover power / disk loading](hover-power/) — actuator-disk hover power and an ideal induced-power hover ceiling from available shaft power.
- [Rotor tip speed](rotor-tip-speed/) — helicopter tip speed ΩR, advance ratio μ = V/(ΩR), and tip Mach.
- [Isentropic flow](isentropic-flow/) — nozzle and stagnation relations (also listed under Aerodynamics).
- [C-D nozzle](cd-nozzle/) — exit Mach, pe/p0, and ideal thrust coefficient for a convergent-divergent nozzle (also listed under Aerodynamics).

### Space

- [Orbital velocity and period](orbital-velocity-period/) — circular speed, period, escape speed, and vis-viva speeds on an ellipse.
- [Satellite footprint and FOV](satellite-fov/) — geometric horizon, swath for a nadir half-angle, and circular period from altitude.
- [Sun-synchronous inclination](sun-synchronous/) — J2 nodal-precession inclination that makes an Earth orbit sun-synchronous (does not redo geostationary radius).
- [Hohmann transfer](hohmann-transfer/) — two-impulse Δv and time of flight between coplanar circular orbits, including LEO to GEO.
- [Planetary Hohmann transfer](planetary-transfer/) — heliocentric time of flight, both impulsive Δv’s, and the synodic wait, defaulting to Earth–Mars.
- [Synodic period](synodic-period/) — time between successive alignments or Hohmann windows, 1/S = |1/T1 − 1/T2|.
- [Delta-v budget](delta-v-budget/) — sum named mission Δv items, convert the total to an ideal mass ratio, and compute a pure plane-change Δv (also listed under Propulsion).
- [Rocket equation](rocket-equation/) — ideal Δv from Isp and mass ratio (also listed under Propulsion).
- [Specific impulse](specific-impulse/) — Isp, exhaust velocity, thrust, and mass flow (also listed under Propulsion).
- [Terminal velocity and ballistic re-entry](terminal-velocity/) — terminal speed from β = m/(Cd A), plus the Allen–Eggers zero-lift peak deceleration (also listed under Aerodynamics).

## Run locally

```bash
python3 -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/).

## Tests

```bash
for f in */test.js; do echo "== $f =="; node "$f" || exit 1; done
```


Identifier data on the great-circle page is built from a [FAA NASR 28-day subscription](https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/) (public domain; files `APT_BASE`, `NAV_BASE`, and `FIX_BASE`) with an optional merge of [OurAirports](https://ourairports.com/data/) (public domain) for non-U.S. ICAO airports. To regenerate the compact JSON shards after a new cycle is published:

```bash
# Download the APT, NAV, and FIX CSV group zips from the cycle page, unzip them,
# and (optionally) fetch OurAirports airports.csv, then:
node scripts/build-nav-data.js --dir /path/to/extracted-csvs     --ourairports /path/to/airports.csv     --out great-circle-distance/data

# Or let the script fetch the current-cycle zips and OurAirports:
node scripts/build-nav-data.js --download --cycle 2026-10-29     --out great-circle-distance/data
```

The script writes lazy-loaded files under `great-circle-distance/data/` split by type (`apt`, `nav`, `fix`) and first character, plus `meta.json` with the NASR cycle date.

## Site URL

The public base URL lives in one place: [`site-config.js`](site-config.js).

To change the public host:

1. Change `baseUrl` in `site-config.js` (no trailing slash).
2. Run `node scripts/write-site-files.js`.

That regenerates `sitemap.xml` and `robots.txt` and updates canonical / Open Graph URLs in the HTML pages.

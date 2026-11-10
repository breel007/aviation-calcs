# Aviation Calcs

Free, static aviation calculators for pilots. No build step and no backend — just HTML, CSS, and JavaScript.

Live site: [https://aviatorcalcs.com/](https://aviatorcalcs.com/) (also still reachable at [https://breel007.github.io/aviation-calcs/](https://breel007.github.io/aviation-calcs/) while that host is configured).

## Calculators

- [Density altitude](density-altitude/) — pressure altitude, ICAO density altitude, humidity correction, two-way ISA deviation (ISA +/−), and a rough takeoff/climb estimate.
- [Crosswind](crosswind/) — crosswind, headwind, and tailwind components for both runway ends, including gusts and a wind diagram.
- [Weight and balance](weight-balance/) — generic W&B / CG calculator with an editable envelope and example Cessna 172S, Piper Archer, and Cessna 152 arms.

## Run locally

```bash
python3 -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/).

## Tests

```bash
node density-altitude/test.js
node crosswind/test.js
node weight-balance/test.js
```

## Site URL (custom domain later)

The public base URL lives in one place: [`site-config.js`](site-config.js).

When you move the site to a custom domain (for example `https://aviatorcalcs.com`):

1. Change `baseUrl` in `site-config.js` (no trailing slash).
2. Run `node scripts/write-site-files.js`.

That regenerates `sitemap.xml` and `robots.txt` and updates canonical / Open Graph URLs in the HTML pages.

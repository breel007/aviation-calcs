# Aviation Calcs

Free, static aviation calculators. No build step and no backend — just HTML, CSS, and JavaScript.

## Calculators

- [Density altitude](density-altitude/) — pressure altitude, ICAO density altitude, humidity correction, two-way ISA deviation (ISA +/−), and a rough takeoff/climb estimate.

## Run locally

```bash
python3 -m http.server 8765
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/).

To verify the density-altitude math:

```bash
node density-altitude/test.js
```

## Publish on GitHub Pages

This repository is already set up for Pages (a root landing page and a `.nojekyll` file). Nothing has been pushed yet.

1. Create an empty GitHub repository (for example `aviation-calcs`).
2. Set your git name and email if they are not already configured, then add the remote and push `main`:

   ```bash
   git remote add origin https://github.com/<your-username>/aviation-calcs.git
   git push -u origin main
   ```

3. In the repo on GitHub: **Settings → Pages → Build and deployment**. Set **Source** to “Deploy from a branch”, branch `main`, folder `/ (root)`.
4. After a minute or two the site will be at `https://<your-username>.github.io/aviation-calcs/`.

A custom domain can be added later in the same Pages settings.

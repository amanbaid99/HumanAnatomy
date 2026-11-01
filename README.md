# Human Anatomy Explorer

An interactive browser atlas of musculoskeletal anatomy. Rotate the body, peel
layers, search muscles, and inspect actions, attachment descriptions and nerve supply.

**Live:** https://amanbaid99.github.io/HumanAnatomy/

## Features

- 180 muscle selections across ten body regions.
- Anatomical meshes adapted from Z-Anatomy / BodyParts3D: 178 selectable muscle
  meshes, plus a reference skeleton and facial structures. Semispinalis capitis,
  absent from the imported source, retains its procedural approximation on both sides.
- Three muscle layers, transparency, region filters, isolation and selection highlighting.
- Origin and insertion markers, clinical notes, and a dedicated rotator cuff view.
- Light and dark themes, keyboard controls and a mobile details sheet.

## Links from other apps

The atlas can be opened at a set of muscles, which is how the Repd workout
tracker shows the muscles an exercise works and a heatmap of training:

| Parameter | Example | Effect |
| --- | --- | --- |
| `muscles` | `?muscles=latissimus-dorsi,biceps-long` | Lights these up and dims the rest; the first is described in the card |
| `heat` | `?heat=pectoralis-major:1,rectus-femoris:0.3` | Tints each muscle by a value from 0 (pale amber) to 1 (red) and dims the rest |
| `view` | `?view=back` | Starts from `front`, `back`, `left`, `right` or `top`; otherwise the side most named muscles are on |
| `theme` | `?theme=dark` | `light` or `dark` for this visit, without changing the saved choice |
| `embed` | `?embed=1` | Hides the title and counter, for use inside another app |

Ids are the `id` fields in `src/anatomy/muscles.js` (both sides share one id).
Unknown ids are ignored, so an old link never breaks the page. Clicking still
selects and explains any muscle.

## Run and verify

This is a static site without a build step. Serve it over HTTP so the browser can
fetch the anatomical assets; opening the HTML as a local file is unsupported.

```sh
npm install
npm run serve   # http://localhost:8123
npm test        # desktop and mobile interaction checks; requires Playwright Chromium
npm run shot    # screenshots in tools/shots/
```

The local anatomical binary is approximately 18 MB. No external model host or CDN
is required. Model loading errors are displayed on the loading screen.

## Geometry and rendering

`src/anatomy/atlas.js` loads indexed geometry from `assets/anatomy/atlas.bin` using
its JSON manifest. `build.js` connects source meshes to the existing muscle
records and controls. The retained loft engine supplies the one missing muscle.
Facial reference meshes are not individually selectable.

Ambient occlusion is baked at load time by depth group. The selected muscle is
rendered again after clearing depth so it remains visible through overlying tissue.
Lighting uses a procedural environment and directional lights.

To regenerate the assets from the upstream `Startup.blend` file:

```sh
blender -b --python tools/export-atlas.py -- path/to/Startup.blend
```

The exporter loads only selected structures, reduces mesh density, transforms
coordinates and triangle winding, and combines components by muscle selection. Tendon weights are retained from source
material assignments.
`assets/anatomy/source-selection.json` records every selected source object.
See [model credits and licensing](assets/anatomy/NOTICE.md).

## Deployment

`.github/workflows/pages.yml` publishes the repository root to GitHub Pages on
pushes to `claude/anatomy-web-app-cgyqjz`. The repository's Pages source must be
configured as GitHub Actions.

## Accuracy and limitations

This is an educational reference viewer, not a clinically validated atlas.
Layer assignments are approximate. Attachment markers start from the original
procedural coordinates and are projected onto the imported muscle surface; they
are approximate reference locations rather than validated anatomical endpoints. Meshes have been simplified for the
web. The viewer does not depict all anatomical structures or individual variation.

## License

Application code: MIT. Vendored three.js: MIT.
Adapted anatomical model assets: CC BY-SA 4.0, with Z-Anatomy and original
BodyParts3D attribution preserved in [NOTICE.md](assets/anatomy/NOTICE.md).

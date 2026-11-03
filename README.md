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
- A dedicated mobile canvas area, compact cards and safe-area-aware controls.
- Labelled movement schematics for supported shoulder, elbow, knee, ankle and hip actions.
- Close-up tissue shading on the selected muscle, with distance-filtered detail.
- Five-question identification quizzes with scores, action and nerve-supply feedback.
- Three-step shoulder, knee, hip and spine studies with automatic framing and peeling.
- Touch targeting assistance, a hold-to-choose muscle menu, and full-body return shortcuts.

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
npm test        # desktop, mobile, study and selection checks; requires Playwright Chromium
npm run shot    # screenshots in tools/shots/
```

The compressed model download is approximately 8.1 MB (54% smaller than the
17.7 MB binary). Browsers without DecompressionStream load the original binary.
Download progress and a retry action are shown during loading. No external model
host or CDN is required.

## Guided studies and touch selection

Open **Study views** above the model. Each guide has three stops and selects the
relevant layer, region, bones and camera angle. Previous and Next move through the
study; Finish study or Back to full body restores all structures and clears search.
Search can reveal muscles outside the current guided area.

On a phone, a small missed tap can find a muscle within ten CSS pixels. Hold a
stationary touch to choose among nearby visible muscles by name. Rotation, canceled
touches and two-finger gestures do not select a muscle. Search remains available
for structures that are hidden or too small to pick comfortably.

`src/studies.js` contains the guide prompts and presets. Run `npm run test:studies`
to verify guide navigation, filtering, keyboard dismissal and touch targeting.

## Quiz mode

Choose **Quiz** for five highlighted-muscle identification questions. Each question
has four choices and scores the first answer only. The reveal includes the action
and nerve supply from the existing muscle records. Scores last for the current
quiz; there is no time limit or account requirement. Use End quiz, Escape or the
Explore control to return to the atlas.

On phones, the model has a separate viewport between the compact header and cards.
Landscape guides and quiz cards sit beside it. Safari safe areas and dynamic
viewport changes are accounted for, and mobile rendering is capped at 1.5× pixel
ratio to reduce GPU work while keeping interface text at native resolution.

`npm run test:quiz` verifies scoring, mobile geometry, compressed loading, the
older-browser fallback and retry after a failed download. `npm run test:loading`
also checks HTTP compression variants used by static hosts.

## Movement guides and surface detail

Supported muscle details include **Movement guide** diagrams, explicitly labelled
Schematic. They illustrate one action of the muscle without deforming the atlas
meshes. Play/Stop controls the diagram; reduced-motion preferences use static start
and end positions instead. Closing details or starting a quiz stops the diagram.
The compact mobile card has a Movement shortcut when a guide is available.

Selected atlas muscles use subtle procedural fascicle shading, approximately aligned
to their attachment direction. Screen-space filtering suppresses unresolved detail
at a distance. This is an illustrative material treatment, not photographic tissue
texturing. The extra fascicle shading is disabled on unselected muscles.

The **Surface definition** control strengthens contour and ambient-occlusion
shading across atlas muscles. Subtle per-muscle colour variation separates adjacent
structures, while camera-relative key, fill and rim lights keep rotated views readable.
Thin outlines follow the actual muscle silhouettes; chest, rectus abdominis,
external obliques and serratus have distinct illustrative tissue tones. Outlines
are disabled when outer layers are transparent. Reflected atlas muscle winding
is corrected before computing normals (`npm run test:geometry`).

**Abdominal fascia cutaway** opens an illustrative window over the rectus
abdominis footprint in the covering oblique sheets. Disable it to restore the
complete source surfaces. Picking uses the cut geometry, so the exposed rectus
can be selected directly.

On phones, swipe the summary card or bottom handle upward to open full details.
The card still dismisses downward, and the expanded panel scrolls normally.

`npm run test:movement` verifies action mappings, play/stop, reduced motion, the
mobile shortcut and the tissue shader.

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

The exporter writes both the binary and a reproducible gzip copy. It loads only
selected structures, reduces mesh density, transforms
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

Linked muscle and heatmap highlights are temporarily suspended during studies and
quizzes, then restored on exit. Embedded phone views use a compact header and
reserve space for their cards. `npm run test:links` verifies these entry points.

## Peeling away muscles

Select a muscle and choose **Hide this muscle** (or **Hide muscle** on the mobile
card) to remove that side while keeping the current camera position. Continue
selecting exposed muscles to peel further. The hidden-muscle list restores
individual structures, and **Restore hidden** in the view dock restores them all.
Searching for a hidden muscle brings it back. Full body and starting a quiz
restore the complete model. Hiding within a guided study exits the guide.

`npm run test:peel` checks desktop and mobile peeling and restoration.

## Guided dissections and model labels

In **Study views**, choose **Chest dissection** or **Gluteal dissection**. Each
Peel step removes a named muscle on the right while explaining the newly exposed
structure. Previous replaces the layer; Finish restores the full body. These
are educational model explorations, not surgical instructions.

Enable **Muscle name labels** in the controls for a small set of clickable labels
with leader lines. Labels are checked against visible geometry, avoid interface
controls and one another, and are limited to six on desktop or three on phones.
They are suppressed during quizzes. `npm run test:guided-labels` verifies both
viewport sizes, reverse steps, restoration, label selection and quiz suppression.

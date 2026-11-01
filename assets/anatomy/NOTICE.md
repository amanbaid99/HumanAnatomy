# Anatomical model attribution

The meshes in `atlas.bin` are adapted from **Z-Anatomy**, the libre 3D atlas of
anatomy, by Gauthier Kervyn and contributors, derived from **BodyParts3D**, The
Database Center for Life Science (DBCLS), original model by Kousaku Okubo.

Source: https://github.com/Z-Anatomy/Models-of-human-anatomy
Source archive: `Z-Anatomy.zip` (Startup.blend), retrieved 1 November 2026.

Z-Anatomy model content is distributed under **Creative Commons
Attribution-ShareAlike 4.0 International**:
https://creativecommons.org/licenses/by-sa/4.0/

The original BodyParts3D attribution is retained: BodyParts3D — The Database
Center for Life Science — CC BY-SA 2.1 Japan.
https://creativecommons.org/licenses/by-sa/2.1/jp/

Changes: selected musculoskeletal and facial structures; welded coincident
vertices and gently smoothed muscle interiors while preserving boundaries; reduced mesh density;
transformed coordinates and scale for the viewer; combined component meshes for
existing muscle selections; retained tendon weights from source materials; exported indexed positions as binary with a JSON
manifest. The adapted model assets are also CC BY-SA 4.0. This notice does not
change the license of the independently authored application code.

These are educational reference meshes. Layer assignments and attachment markers
are approximate (markers are projected from the original authored coordinates
onto the imported muscle surface); the viewer has not been clinically validated.

Rebuild with Blender 4.3 or later:

```sh
blender -b --python tools/export-atlas.py -- path/to/Startup.blend
```

The selected source objects and muscle identifiers are recorded in
`source-selection.json`. Semispinalis capitis is absent from the imported source;
the viewer retains its original procedural approximation on both sides.

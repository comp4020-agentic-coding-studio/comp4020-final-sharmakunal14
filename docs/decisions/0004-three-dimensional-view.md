# Maze Duel: real 3D view with map, third- and first-person cameras

Date: 1 November 2026. Status: implemented.
Supersedes the rendering part of [0002](0002-maze-duel-first-playable.md)
(fixed Canvas 2D projection). 0002's reasoning is kept as history.

## Context

The author asked for the game to feel genuinely 3D, like a walled desert
labyrinth with a character behind the camera. They wanted a vibrant
environment, a more coherent and modern "gamer" interface, and both
first-person and third-person views. The Canvas 2D projection could not
provide a camera inside the maze.

## Decisions

- **Three.js r170, vendored as one file** (`public/vendor/three-0.170.0.module.min.js`, MIT).
  - Rejected alternatives:
    - React Three Fiber, which needs React and a build step, against this
      repo's no-build rule.
    - A CDN import, which adds a runtime dependency on a third party; the
      markers' testing would rely on it being up.
    - Hand-written WebGL, far more code for the same picture.
  - Cost: 690 KB (about 170 KB gzipped) on first load. It is served with an
    immutable cache header and gzipped once in memory.
- **Presentation only.**
  - The server still owns grid positions.
  - Avatar facing is local and never sent, so first and third person add no
    network or trust surface.
- **Controls in first and third person.** Forward walks the way the avatar
  faces, and left, right and back turn it on the spot (as in the reference
  app's Walk/Left/Right). The map view keeps the screen-absolute keys from
  milestone 2.
  - Alternative: camera-relative keys that move sideways. Rejected, because
    moving sideways in first person makes you lose your bearings in a maze.
- **Environment.**
  - A sunlit desert: generated brick and sand textures (no image assets),
    low-poly mountains, cacti and rocks.
  - Energy-field gates in each switch's colour, glowing crystal switches, and
    portal beams at the goals. All of it is built from the saved layout in
    the browser.
- **Interface.**
  - Followed the ui-ux-pro-max recommendation for gaming: "3D & Hyperrealism"
    for the world, a dark glass heads-up display (HUD) over it, Russo One for
    display text and Chakra Petch for body text, with neon accents.
  - Kept the existing accessibility rules: focus rings, 44 px touch targets,
    reduced motion turns off bobbing and smoothing, and SVG icons instead of
    emoji.
- **Fallback.** If WebGL is unavailable, the page loads the old 2D projected
  renderer, so the game stays playable.

## Consequences

- First load is heavier, and older phones may run slower. No physical device
  has been tested.
- The Google Fonts stylesheet is a third-party request. If it fails, the page
  falls back to system fonts.
- The facing shown in first or third person can differ from what the opponent
  sees, because facing is not shared. Positions always agree.
- The 2D renderer is kept only as the fallback.

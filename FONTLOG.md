# FONTLOG

## Basic information

- Upstream project: [Maple Mono](https://github.com/subframe7536/maple-font)
- Upstream version: 7.9
- Package maintainer: automann
- Package status: unofficial distribution; not affiliated with or endorsed by upstream

## Modifications

- `MapleMono-CN-Thin.ttf`, `MapleMono-CN-ExtraLight.ttf`, `MapleMono-CN-Light.ttf`,
  `MapleMono-CN-Regular.ttf`, and `MapleMono-CN-Medium.ttf` from the official unhinted CN archive
  are split into WOFF2 files with Unicode Range declarations for browser delivery.
- The glyph inventory is distributed across the complete set of generated ranges rather than reduced
  to the characters of one website.
- Thin 100, ExtraLight 200, Light 300, Regular 400, and Medium 500 are included as isolated CSS
  and WOFF2 entries.
- Nerd Font glyphs are not included.
- The official non-CN `MapleMono-Regular.ttf` is included unchanged for build-time OG rendering.
- The official CN `MapleMono-CN-Regular.ttf` is included unchanged behind a Node-only cached loader
  for build-time renderers that require complete Chinese glyph coverage.

## Reproducibility

Source archive URLs and SHA-256 hashes are pinned in `scripts/upstream.mjs`. The package is rebuilt
with the `cn-font-split` 7.4.3 npm wrapper and its pinned 7.6.8 WASM core. Generated artifact
metadata is recorded in `dist/manifest.json`.

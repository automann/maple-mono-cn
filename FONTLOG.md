# FONTLOG

## Basic information

- Upstream project: [Maple Mono](https://github.com/subframe7536/maple-font)
- Upstream version: 7.9
- Package maintainer: automann
- Package status: unofficial distribution; not affiliated with or endorsed by upstream

## Modifications

- `MapleMono-CN-Regular.ttf` from the official unhinted CN archive is split into WOFF2 files with
  Unicode Range declarations for browser delivery.
- The glyph inventory is distributed across the complete set of generated ranges rather than reduced
  to the characters of one website.
- Only Regular 400 is included.
- Nerd Font glyphs are not included.
- The official non-CN `MapleMono-Regular.ttf` is included unchanged for build-time OG rendering.

## Reproducibility

Source archive URLs and SHA-256 hashes are pinned in `scripts/upstream.mjs`. The package is rebuilt
with the `cn-font-split` 7.4.3 npm wrapper and its pinned 7.6.8 WASM core. Generated artifact
metadata is recorded in `dist/manifest.json`.

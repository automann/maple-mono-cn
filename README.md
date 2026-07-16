# @automann/maple-mono-cn

Unofficial, reproducible webfont packaging of
[Maple Mono CN](https://github.com/subframe7536/maple-font). This package is not affiliated with or
endorsed by the Maple Mono project.

The package tracks Maple Mono 7.9 and contains five upright static weights:

| Weight | CSS entry |
| --- | --- |
| Thin 100 | `@automann/maple-mono-cn/thin.css` |
| ExtraLight 200 | `@automann/maple-mono-cn/extra-light.css` |
| Light 300 | `@automann/maple-mono-cn/light.css` |
| Regular 400 | `@automann/maple-mono-cn/regular.css` |
| Medium 500 | `@automann/maple-mono-cn/medium.css` |

The package contains:

- complete Maple Mono CN character coverage, split into WOFF2 files selected by `unicode-range`;
- one official non-CN `MapleMono-Regular.ttf` for build-time OG image renderers such as Satori;
- one complete CN Regular font exposed through a cached Node loader for build-time OG rendering;
- no Nerd Font glyphs;
- no runtime CDN dependency.

## Install

```sh
pnpm add @automann/maple-mono-cn
```

Import the browser font once from your global stylesheet:

```css
@import "@automann/maple-mono-cn/regular.css";

:root {
  --font-mono: "Maple Mono CN", ui-monospace, monospace;
}
```

The package root also resolves to Regular 400. Numeric aliases (`100.css`, `200.css`, `300.css`,
`400.css`, and `500.css`) are
available for tooling that selects fonts by weight. Import only the weights the site uses: each CSS
entry references a separate WOFF2 directory, so importing Regular does not bundle the other four
weights.

The browser downloads only the WOFF2 ranges needed by the text on the current page. Do not preload
the complete font set.

For an OG image renderer:

```ts
import MapleMono from "@automann/maple-mono-cn/og";
```

For complete Chinese glyph coverage, use the Node-only loader instead of importing the large TTF
into a JavaScript build chunk:

```ts
import { loadMapleMonoCnRegular } from "@automann/maple-mono-cn/og-cn";

const mapleMonoCn = await loadMapleMonoCnRegular();
```

The loader reads and caches the official CN Regular font on first use. It is intended for static
builds and other Node.js renderers, not browser bundles.

## Giscus and other iframes

CSS loaded inside a third-party iframe cannot resolve an npm package at runtime. Copy `dist/` to a
public directory during your application build:

```sh
pnpm exec maple-mono-cn-copy public/fonts/maple-mono-cn
```

Then reference `/fonts/maple-mono-cn/regular.css` by URL from the iframe theme. The command copies
only Regular 400, its WOFF2 files, and the OFL text by default; relative font URLs remain
self-hosted. Select additional weights explicitly when needed:

```sh
pnpm exec maple-mono-cn-copy public/fonts/maple-mono-cn --weights 300,400,500
```

## Rebuild

Requires Node.js 20 or newer, pnpm, and network access for the first build:

```sh
pnpm install
pnpm build
pnpm test
```

The build downloads the two official Maple Mono 7.9 archives, verifies their pinned SHA-256 hashes,
extracts the five required upright fonts, and regenerates `dist/`. Downloads are cached under
`.cache/upstream/` and are not published.

## License

The fonts and derived webfont files are distributed under the SIL Open Font License 1.1. See
[LICENSE](./LICENSE) and [FONTLOG.md](./FONTLOG.md). Maple Mono is copyright the Maple Mono Project
Authors. The package is free and must not be represented as an official upstream release.

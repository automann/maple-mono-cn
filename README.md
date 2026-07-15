# @automann/maple-mono-cn

Unofficial, reproducible webfont packaging of
[Maple Mono CN](https://github.com/subframe7536/maple-font). This package is not affiliated with or
endorsed by the Maple Mono project.

The package tracks Maple Mono 7.9 and contains only Regular 400:

- complete Maple Mono CN character coverage, split into WOFF2 files selected by `unicode-range`;
- one official non-CN `MapleMono-Regular.ttf` for build-time OG image renderers such as Satori;
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

The browser downloads only the WOFF2 ranges needed by the text on the current page. Do not preload
the complete font set.

For an OG image renderer:

```ts
import MapleMono from "@automann/maple-mono-cn/og";
```

The OG export currently contains the official non-CN Regular font. Chinese glyph coverage for OG
images is intentionally out of scope until a separate build-time font strategy is selected.

## Giscus and other iframes

CSS loaded inside a third-party iframe cannot resolve an npm package at runtime. Copy `dist/` to a
public directory during your application build:

```sh
pnpm exec maple-mono-cn-copy public/fonts/maple-mono-cn
```

Then reference `/fonts/maple-mono-cn/regular.css` by URL from the iframe theme. The command copies
only the browser CSS, WOFF2 files, and OFL text; relative font URLs remain self-hosted.

## Rebuild

Requires Node.js 20 or newer, pnpm, and network access for the first build:

```sh
pnpm install
pnpm build
pnpm test
```

The build downloads the two official Maple Mono 7.9 archives, verifies their pinned SHA-256 hashes,
extracts only the required Regular fonts, and regenerates `dist/`. Downloads are cached under
`.cache/upstream/` and are not published.

## License

The fonts and derived webfont files are distributed under the SIL Open Font License 1.1. See
[LICENSE](./LICENSE) and [FONTLOG.md](./FONTLOG.md). Maple Mono is copyright the Maple Mono Project
Authors. The package is free and must not be represented as an official upstream release.

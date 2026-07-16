import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { fontSplit, StaticWasm } from "cn-font-split/dist/wasm/index.mjs";
import extract from "extract-zip";
import * as fontkit from "fontkit";
import { assetUrl, upstreamAssets, UPSTREAM_VERSION } from "./upstream.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cache = join(root, ".cache");
const upstreamCache = join(cache, "upstream", `v${UPSTREAM_VERSION}`);
const buildDir = join(cache, "build");
const distDir = join(root, "dist");
const ogDir = join(distDir, "og");
const packageVersion = "7.9.2";
const splitCoreVersion = "7.6.8";
const splitCore = {
  file: `cn-font-split-${splitCoreVersion}.wasm`,
  sha256: "05a88dcb9a0b0d1e14daf0f429d9af6e2ac8d94d9e574523a76d3e9f440dccc9",
  url: `https://github.com/KonghaYao/cn-font-split/releases/download/${splitCoreVersion}/libffi-wasm32-wasip1.wasm`,
};
// HarfBuzz adds U+FFFF as a subset sentinel; it is not part of the upstream cmap or a renderable character.
const ignoredGeneratedCodepoints = new Set([0xffff]);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function sha256(path) {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

async function download(asset) {
  const archivePath = join(upstreamCache, asset.archive);
  await mkdir(upstreamCache, { recursive: true });

  if (await exists(archivePath)) {
    if ((await sha256(archivePath)) === asset.sha256) return archivePath;
    await rm(archivePath);
  }

  const response = await fetch(assetUrl(asset.archive), { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${asset.archive}: ${response.status} ${response.statusText}`);
  }

  const temporaryPath = `${archivePath}.download`;
  await pipeline(response.body, createWriteStream(temporaryPath));
  const actualHash = await sha256(temporaryPath);
  if (actualHash !== asset.sha256) {
    await rm(temporaryPath, { force: true });
    throw new Error(`${asset.archive} SHA-256 mismatch: expected ${asset.sha256}, got ${actualHash}`);
  }

  await rename(temporaryPath, archivePath);
  return archivePath;
}

async function extractFont(asset, font = asset) {
  const archivePath = await download(asset);
  const extractionDir = join(upstreamCache, asset.archive.replace(/\.zip$/u, ""));
  const fontPath = join(extractionDir, font.font);

  if (!(await exists(fontPath)) || (await sha256(fontPath)) !== font.fontSha256) {
    await rm(extractionDir, { force: true, recursive: true });
    await mkdir(extractionDir, { recursive: true });
    await extract(archivePath, { dir: extractionDir });
  }

  const actualHash = await sha256(fontPath);
  if (actualHash !== font.fontSha256) {
    throw new Error(`${font.font} SHA-256 mismatch: expected ${font.fontSha256}, got ${actualHash}`);
  }

  return fontPath;
}

function codepointDigest(codepoints) {
  const sorted = [...codepoints].sort((a, b) => a - b);
  const bytes = Buffer.allocUnsafe(sorted.length * 4);
  sorted.forEach((codepoint, index) => bytes.writeUInt32BE(codepoint, index * 4));
  return createHash("sha256").update(bytes).digest("hex");
}

function parseUnicodeRanges(value) {
  return value.split(",").map((part) => {
    const match = /^U\+([0-9A-F?]+)(?:-([0-9A-F]+))?$/iu.exec(part.trim());
    if (!match) throw new Error(`Invalid unicode-range token: ${part}`);
    const wildcardStart = match[1].replaceAll("?", "0");
    const wildcardEnd = match[1].replaceAll("?", "F");
    return [Number.parseInt(wildcardStart, 16), Number.parseInt(match[2] ?? wildcardEnd, 16)];
  });
}

function cssRangesByFile(css, weight) {
  const ranges = new Map();
  for (const block of css.match(/@font-face\{[^}]+\}/gu) ?? []) {
    const file = new RegExp(`url\\("\\.\\/fonts\\/${weight}\\/([^"/]+\\.woff2)"\\)`, "u").exec(
      block,
    )?.[1];
    const unicodeRange = /unicode-range:([^;}]+);/u.exec(block)?.[1];
    if (!file || !unicodeRange) throw new Error("Generated @font-face is missing a file or unicode-range");
    ranges.set(file, parseUnicodeRanges(unicodeRange));
  }
  return ranges;
}

function validateCoverage(sourceFont, splitFiles, css, fontDir, weight) {
  const sourceCodepoints = new Set(fontkit.openSync(sourceFont).characterSet);
  const splitCodepoints = new Set();
  const cssRanges = cssRangesByFile(css, weight);
  const allCssRanges = [...cssRanges.values()].flat();

  if (cssRanges.size !== splitFiles.length) {
    throw new Error(`CSS maps ${cssRanges.size} files but ${splitFiles.length} WOFF2 files were generated`);
  }

  for (const file of splitFiles) {
    const ranges = cssRanges.get(file);
    if (!ranges) throw new Error(`CSS does not reference ${file}`);
    const fontCodepoints = fontkit.openSync(join(fontDir, file)).characterSet;
    for (const codepoint of fontCodepoints) {
      if (ignoredGeneratedCodepoints.has(codepoint)) continue;
      const isDeclaredForFile = ranges.some(([start, end]) => codepoint >= start && codepoint <= end);
      const isDeclaredElsewhere = allCssRanges.some(
        ([start, end]) => codepoint >= start && codepoint <= end,
      );
      if (!isDeclaredForFile && !isDeclaredElsewhere) {
        throw new Error(`${file} contains U+${codepoint.toString(16)} outside its CSS unicode-range`);
      }
      splitCodepoints.add(codepoint);
    }
  }

  const missing = [...sourceCodepoints].filter((codepoint) => !splitCodepoints.has(codepoint));
  const extra = [...splitCodepoints].filter((codepoint) => !sourceCodepoints.has(codepoint));
  if (missing.length || extra.length) {
    throw new Error(`Webfont cmap mismatch: ${missing.length} missing and ${extra.length} extra codepoints`);
  }

  return {
    codepointSha256: codepointDigest(sourceCodepoints),
    sourceCodepoints: sourceCodepoints.size,
    splitCodepoints: splitCodepoints.size,
    verified: true,
  };
}

async function ensureSplitCore() {
  const toolDir = join(cache, "tools");
  const corePath = join(toolDir, splitCore.file);
  await mkdir(toolDir, { recursive: true });

  if (await exists(corePath)) {
    if ((await sha256(corePath)) === splitCore.sha256) return corePath;
    await rm(corePath);
  }

  const response = await fetch(splitCore.url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${splitCore.file}: ${response.status} ${response.statusText}`);
  }

  const temporaryPath = `${corePath}.download`;
  await pipeline(response.body, createWriteStream(temporaryPath));
  const actualHash = await sha256(temporaryPath);
  if (actualHash !== splitCore.sha256) {
    await rm(temporaryPath, { force: true });
    throw new Error(`${splitCore.file} SHA-256 mismatch: expected ${splitCore.sha256}, got ${actualHash}`);
  }
  await rename(temporaryPath, corePath);
  return corePath;
}

async function buildWebfont(sourceFont, font) {
  const splitDir = join(buildDir, `split-${font.weight}`);
  await rm(splitDir, { force: true, recursive: true });
  await mkdir(splitDir, { recursive: true });
  const corePath = await ensureSplitCore();
  const wasm = new StaticWasm(await readFile(corePath));
  const output = await fontSplit(
    {
      input: await readFile(sourceFont),
      outDir: "/out",
      css: {
        commentBase: false,
        commentNameTable: false,
        commentUnicodes: false,
        fileName: "webfont.css",
        fontDisplay: "swap",
        fontFamily: "Maple Mono CN",
        fontStyle: "normal",
        fontWeight: String(font.weight),
      },
      reporter: false,
      silent: true,
      testHtml: false,
    },
    wasm.WasiHandle,
    { logger() {} },
  );

  for (const artifact of output) {
    if (!artifact) continue;
    if (artifact.name.includes("/") || artifact.name.includes("\\")) {
      throw new Error(`Unsafe generated artifact path: ${artifact.name}`);
    }
    await writeFile(join(splitDir, artifact.name), artifact.data);
  }

  return splitDir;
}

async function collectWebfont(cnSource, font, splitDir) {
  const fontDir = join(distDir, "fonts", String(font.weight));
  await mkdir(fontDir, { recursive: true });

  const splitFiles = (await readdir(splitDir)).filter((file) => file.endsWith(".woff2")).sort();
  if (splitFiles.length === 0) throw new Error("cn-font-split produced no WOFF2 files");

  for (const file of splitFiles) await copyFile(join(splitDir, file), join(fontDir, file));

  const generatedCss = await readFile(join(splitDir, "webfont.css"), "utf8");
  const cssWithoutGeneratedHeader = generatedCss.replace(/^\/\*[\s\S]*?\*\/\s*/u, "");
  const css = [
    `/* Maple Mono CN 7.9 ${font.name} — unofficial OFL-1.1 webfont packaging. */`,
    cssWithoutGeneratedHeader
      .replaceAll('src:local("Maple Mono CN"),url(', "src:url(")
      .replaceAll('url("./', `url("./fonts/${font.weight}/`),
  ].join("\n");
  const cssPath = join(distDir, `${font.slug}.css`);
  await writeFile(cssPath, css);
  const coverage = validateCoverage(cnSource, splitFiles, css, fontDir, font.weight);

  const fontFiles = {};
  let fontBytes = 0;
  for (const file of splitFiles) {
    const path = join(fontDir, file);
    const size = (await stat(path)).size;
    fontBytes += size;
    fontFiles[file] = { bytes: size, sha256: await sha256(path) };
  }

  return {
    name: font.name,
    slug: font.slug,
    family: "Maple Mono CN",
    style: "normal",
    weight: font.weight,
    display: "swap",
    css: `${font.slug}.css`,
    cssSha256: await sha256(cssPath),
    sourceSha256: await sha256(cnSource),
    coverage,
    fileCount: splitFiles.length,
    totalBytes: fontBytes,
    files: fontFiles,
  };
}

async function collectArtifacts(cnSources, ogSource) {
  await rm(distDir, { force: true, recursive: true });
  await mkdir(distDir, { recursive: true });
  await mkdir(ogDir, { recursive: true });

  const webfonts = {};
  for (const font of upstreamAssets.cn.fonts) {
    const cnSource = cnSources.get(font.weight);
    const splitDir = await buildWebfont(cnSource, font);
    webfonts[font.weight] = await collectWebfont(cnSource, font, splitDir);
  }

  const ogTarget = join(ogDir, "MapleMono-Regular.ttf");
  await copyFile(ogSource, ogTarget);
  const ogCnSource = cnSources.get(400);
  if (!ogCnSource) throw new Error("Missing Maple Mono CN Regular source for OG rendering");
  const ogCnTarget = join(ogDir, "MapleMono-CN-Regular.ttf");
  await copyFile(ogCnSource, ogCnTarget);
  await writeFile(
    join(distDir, "og-cn.mjs"),
    [
      'import { createRequire } from "node:module";',
      'import { readFile } from "node:fs/promises";',
      "",
      "const require = createRequire(import.meta.url);",
      "let regularFont;",
      "",
      "export function loadMapleMonoCnRegular() {",
      '  regularFont ??= readFile(require.resolve("@automann/maple-mono-cn/og-cn-font"));',
      "  return regularFont;",
      "}",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(distDir, "og-cn.d.ts"),
    'export declare function loadMapleMonoCnRegular(): Promise<Buffer>;\n',
  );
  await copyFile(join(root, "LICENSE"), join(distDir, "OFL.txt"));

  const ogCnCodepoints = new Set(fontkit.openSync(ogCnSource).characterSet);

  const manifest = {
    packageVersion,
    upstream: {
      project: "subframe7536/maple-font",
      version: UPSTREAM_VERSION,
      cnArchive: upstreamAssets.cn,
      ogArchive: upstreamAssets.og,
      ogSourceSha256: await sha256(ogSource),
    },
    build: {
      wrapper: "cn-font-split@7.4.3",
      core: `cn-font-split@${splitCoreVersion}`,
    },
    webfont: webfonts[400],
    webfonts,
    og: {
      family: "Maple Mono",
      file: "og/MapleMono-Regular.ttf",
      bytes: (await stat(ogTarget)).size,
      sha256: await sha256(ogTarget),
      cjkCoverage: false,
    },
    ogCn: {
      family: "Maple Mono CN",
      file: "og/MapleMono-CN-Regular.ttf",
      bytes: (await stat(ogCnTarget)).size,
      sha256: await sha256(ogCnTarget),
      cjkCoverage: true,
      coverage: {
        codepointSha256: codepointDigest(ogCnCodepoints),
        sourceCodepoints: ogCnCodepoints.size,
        verified: true,
      },
    },
  };

  await writeFile(join(distDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

const cnSources = new Map();
for (const font of upstreamAssets.cn.fonts) {
  cnSources.set(font.weight, await extractFont(upstreamAssets.cn, font));
}
const ogSource = await extractFont(upstreamAssets.og);
await collectArtifacts(cnSources, ogSource);

console.log(`Built @automann/maple-mono-cn from Maple Mono ${UPSTREAM_VERSION}.`);

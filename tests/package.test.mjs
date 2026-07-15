import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import * as fontkit from "fontkit";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
const execFileAsync = promisify(execFile);
const ignoredGeneratedCodepoints = new Set([0xffff]);

async function json(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function codepointDigest(codepoints) {
  const sorted = [...codepoints].sort((a, b) => a - b);
  const bytes = Buffer.allocUnsafe(sorted.length * 4);
  sorted.forEach((codepoint, index) => bytes.writeUInt32BE(codepoint, index * 4));
  return createHash("sha256").update(bytes).digest("hex");
}

test("package metadata exposes the browser CSS and OG font", async () => {
  const pkg = await json("package.json");
  assert.equal(pkg.name, "@automann/maple-mono-cn");
  assert.equal(pkg.version, "7.9.0");
  assert.equal(pkg.license, "OFL-1.1");
  assert.equal(pkg.exports["."], "./dist/regular.css");
  assert.equal(pkg.exports["./og"], "./dist/og/MapleMono-Regular.ttf");
  assert.equal(pkg.bin["maple-mono-cn-copy"], "./bin/copy.mjs");
});

test("the generated CSS references every and only generated WOFF2 file", async () => {
  const css = await readFile(new URL("regular.css", dist), "utf8");
  const files = (await readdir(new URL("fonts/", dist))).filter((file) => file.endsWith(".woff2")).sort();
  const references = [...css.matchAll(/url\("\.\/fonts\/([^"/]+\.woff2)"\)/gu)]
    .map((match) => match[1])
    .sort();

  assert.ok(files.length > 100, `expected a complete CJK split, received ${files.length} files`);
  assert.deepEqual(references, files);
  assert.equal((css.match(/@font-face/gu) ?? []).length, files.length);
  assert.match(css, /font-family:"Maple Mono CN"/u);
  assert.match(css, /font-display:swap/u);
  assert.match(css, /font-weight:400/u);
  assert.doesNotMatch(css, /src:local\(/u);
  assert.doesNotMatch(css, /CreateTime/u);
});

test("manifest hashes and byte counts match all published artifacts", async () => {
  const manifest = await json("dist/manifest.json");
  const cssPath = new URL("regular.css", dist);
  assert.equal(manifest.packageVersion, "7.9.0");
  assert.equal(manifest.upstream.version, "7.9");
  assert.equal(manifest.webfont.cssSha256, await sha256(cssPath));

  let totalBytes = 0;
  const splitCodepoints = new Set();
  for (const [file, expected] of Object.entries(manifest.webfont.files)) {
    const path = new URL(`fonts/${file}`, dist);
    totalBytes += (await stat(path)).size;
    assert.equal((await stat(path)).size, expected.bytes);
    assert.equal(await sha256(path), expected.sha256);
    for (const codepoint of fontkit.openSync(fileURLToPath(path)).characterSet) {
      if (ignoredGeneratedCodepoints.has(codepoint)) continue;
      splitCodepoints.add(codepoint);
    }
  }
  assert.equal(Object.keys(manifest.webfont.files).length, manifest.webfont.fileCount);
  assert.equal(totalBytes, manifest.webfont.totalBytes);
  assert.equal(manifest.webfont.coverage.verified, true);
  assert.equal(splitCodepoints.size, manifest.webfont.coverage.sourceCodepoints);
  assert.equal(splitCodepoints.size, manifest.webfont.coverage.splitCodepoints);
  assert.equal(codepointDigest(splitCodepoints), manifest.webfont.coverage.codepointSha256);

  const ogPath = new URL(manifest.og.file, dist);
  assert.equal((await stat(ogPath)).size, manifest.og.bytes);
  assert.equal(await sha256(ogPath), manifest.og.sha256);
  assert.equal(manifest.og.cjkCoverage, false);
});

test("the OFL and upstream copyright accompany the distributed fonts", async () => {
  const rootLicense = await readFile(new URL("LICENSE", root), "utf8");
  const distLicense = await readFile(new URL("OFL.txt", dist), "utf8");
  assert.equal(distLicense, rootLicense);
  assert.match(rootLicense, /Copyright 2022 The Maple Mono Project Authors/u);
  assert.match(rootLicense, /SIL OPEN FONT LICENSE Version 1\.1/u);
});

test("copy helper creates a self-hostable iframe font directory", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "maple-mono-cn-"));
  const target = join(temporary, "public", "fonts", "maple-mono-cn");
  try {
    await execFileAsync(process.execPath, [fileURLToPath(new URL("../bin/copy.mjs", import.meta.url)), target]);
    const sourceFonts = (await readdir(new URL("fonts/", dist))).sort();
    const copiedFonts = (await readdir(join(target, "fonts"))).sort();
    assert.deepEqual(copiedFonts, sourceFonts);
    assert.equal(
      await readFile(join(target, "regular.css"), "utf8"),
      await readFile(new URL("regular.css", dist), "utf8"),
    );
    assert.match(await readFile(join(target, "OFL.txt"), "utf8"), /SIL OPEN FONT LICENSE/u);
  } finally {
    await rm(temporary, { force: true, recursive: true });
  }
});

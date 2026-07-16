#!/usr/bin/env node

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const availableWeights = new Map([
  ["100", "thin"],
  ["thin", "thin"],
  ["200", "extra-light"],
  ["extra-light", "extra-light"],
  ["300", "light"],
  ["light", "light"],
  ["400", "regular"],
  ["regular", "regular"],
  ["500", "medium"],
  ["medium", "medium"],
]);
const weightBySlug = new Map([
  ["thin", "100"],
  ["extra-light", "200"],
  ["light", "300"],
  ["regular", "400"],
  ["medium", "500"],
]);

const args = process.argv.slice(2);
let targetArgument;
let weightsArgument = "400";
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--weights") {
    weightsArgument = args[index + 1];
    index += 1;
  } else if (argument.startsWith("--weights=")) {
    weightsArgument = argument.slice("--weights=".length);
  } else if (!targetArgument && !argument.startsWith("--")) {
    targetArgument = argument;
  } else {
    throw new Error(`Unknown argument: ${argument}`);
  }
}

if (!weightsArgument) throw new Error("--weights requires a comma-separated value");
const slugs = [...new Set(weightsArgument.split(",").map((value) => availableWeights.get(value.trim())))];
if (slugs.includes(undefined)) {
  throw new Error(`Unsupported weight in --weights=${weightsArgument}; choose 100, 200, 300, 400, or 500`);
}

const target = resolve(process.cwd(), targetArgument ?? "public/fonts/maple-mono-cn");

await rm(target, { force: true, recursive: true });
await mkdir(dirname(target), { recursive: true });
await mkdir(target, { recursive: true });
for (const slug of slugs) {
  const weight = weightBySlug.get(slug);
  await cp(resolve(packageRoot, `dist/fonts/${weight}`), resolve(target, `fonts/${weight}`), {
    recursive: true,
  });
  await cp(resolve(packageRoot, `dist/${slug}.css`), resolve(target, `${slug}.css`));
}
await cp(resolve(packageRoot, "dist/OFL.txt"), resolve(target, "OFL.txt"));

console.log(`Copied Maple Mono CN weights ${slugs.map((slug) => weightBySlug.get(slug)).join(", ")} to ${target}`);

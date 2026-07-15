#!/usr/bin/env node

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const target = resolve(process.cwd(), process.argv[2] ?? "public/fonts/maple-mono-cn");

await rm(target, { force: true, recursive: true });
await mkdir(dirname(target), { recursive: true });
await mkdir(target, { recursive: true });
await cp(resolve(packageRoot, "dist/fonts"), resolve(target, "fonts"), { recursive: true });
await cp(resolve(packageRoot, "dist/regular.css"), resolve(target, "regular.css"));
await cp(resolve(packageRoot, "dist/OFL.txt"), resolve(target, "OFL.txt"));

console.log(`Copied Maple Mono CN webfonts to ${target}`);

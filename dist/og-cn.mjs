import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
let regularFont;

export function loadMapleMonoCnRegular() {
  regularFont ??= readFile(require.resolve("@automann/maple-mono-cn/og-cn-font"));
  return regularFont;
}

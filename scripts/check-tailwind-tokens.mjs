#!/usr/bin/env node
/**
 * Catches Tailwind colour classes that silently render nothing.
 *
 * `bg-nav-background` looks correct, passes typecheck, passes lint, and paints
 * no background at all — the palette is nested under `nav`, so the class had to
 * be `bg-nav`. The bottom navigation shipped fully transparent because of it.
 *
 * Rather than re-parsing the config, this compares against the compiled CSS,
 * which is ground truth: Tailwind emits every valid class it finds in source,
 * so a class present in source but absent from the output is not a real class.
 *
 * Run after a build:  npm run build && node scripts/check-tailwind-tokens.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const DIST = "dist/assets";
const ROOT = "src";

/** Utilities that take a colour. */
const COLOUR_UTILITIES = ["bg", "text", "border", "ring", "fill", "stroke", "divide", "outline"];

/** `<utility>-<token>` with an optional `/opacity`. */
const UTILITY_PATTERN = new RegExp(
  `^(?:${COLOUR_UTILITIES.join("|")})-[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\\/\\d+)?$`
);

/** Characters that may follow a class name in a compiled selector. */
const TERMINATORS = new Set([",", "{", ">", "~", "+", ":", " ", "\n", "\t", "[", ")"]);

if (!existsSync(DIST)) {
  console.error("✗ no dist/ — run `npm run build` first");
  process.exit(1);
}

const cssFile = readdirSync(DIST).find((f) => f.endsWith(".css"));
if (!cssFile) {
  console.error("✗ no compiled CSS found in dist/assets");
  process.exit(1);
}
const css = readFileSync(join(DIST, cssFile), "utf8");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if ([".tsx", ".ts"].includes(extname(full))) out.push(full);
  }
  return out;
}

/**
 * Pull class names only from className / cn() / clsx() strings, so prose like
 * "nothing to track" and CSS inside exported HTML are not mistaken for classes.
 */
function classStrings(line) {
  if (!/className|cn\(|clsx\(/.test(line)) return [];
  const out = [];
  for (const lit of line.matchAll(/["'`]([^"'`\n]+)["'`]/g)) out.push(lit[1]);
  return out;
}

/**
 * Tailwind escapes `:` `/` `.` in emitted selectors, and the variant prefix is
 * part of the name: `hover:text-primary/90` is emitted as
 * `.hover\:text-primary\/90:hover`. Plain substring matching avoids having to
 * build a correct regex out of characters that are themselves metacharacters.
 */
function isEmitted(cls) {
  const needle = "." + cls.replace(/[:/.]/g, (ch) => "\\" + ch);
  let from = 0;
  for (;;) {
    const at = css.indexOf(needle, from);
    if (at === -1) return false;
    const next = css[at + needle.length];
    // Guard against `.bg-red` matching inside `.bg-red-500`.
    if (next === undefined || TERMINATORS.has(next)) return true;
    from = at + 1;
  }
}

const problems = new Map();

for (const file of walk(ROOT)) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const str of classStrings(line)) {
        for (const cls of str.split(/\s+/)) {
          // Arbitrary values and data-attribute variants are out of scope.
          if (cls.includes("[") || cls.includes("(")) continue;
          const utility = cls.slice(cls.lastIndexOf(":") + 1);
          if (!UTILITY_PATTERN.test(utility)) continue;
          // ring-offset-N sets a width, not a colour.
          if (utility.startsWith("ring-offset-")) continue;
          if (isEmitted(cls)) continue;
          if (!problems.has(cls)) problems.set(cls, []);
          problems.get(cls).push(`${file}:${i + 1}`);
        }
      }
    });
}

if (problems.size === 0) {
  console.log("✓ every colour class in src/ resolves to a real Tailwind class");
  process.exit(0);
}

console.error(`✗ ${problems.size} colour class(es) render nothing:\n`);
for (const [cls, where] of problems) {
  console.error(`  ${cls}`);
  for (const w of where.slice(0, 4)) console.error(`      ${w}`);
}
console.error("\nNot defined in tailwind.config.ts, so they produce no CSS.");
process.exit(1);

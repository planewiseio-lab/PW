/**
 * One-off script: bake build years into SEED_META for family age stats.
 *
 * Runs the normal live lookup locally (same public sources as the site),
 * extracts yearBuilt per seed registration, and writes it into
 * src/lib/seed.ts as `yearBuilt`. Entries the lookup can't resolve keep
 * no year and are excluded from the average — stats degrade gracefully.
 *
 * Usage: npx tsx scripts/bake-seed-years.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lookupAircraft } from "../src/lib/lookup";
import { SEED_META } from "../src/lib/seed";

const CONCURRENCY = 4;
const TIMEOUT_MS = 45_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function yearFor(reg: string): Promise<number | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await withTimeout(lookupAircraft(reg), TIMEOUT_MS);
    if (result?.status === "ok" && result.aircraft.yearBuilt) {
      return result.aircraft.yearBuilt;
    }
    if (result?.status === "ok") return null; // resolved, no year — don't retry
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

async function main() {
  const years = new Map<string, number>();
  const queue = [...SEED_META.map((s) => s.registration)];
  let done = 0;

  async function worker() {
    while (queue.length) {
      const reg = queue.shift()!;
      const year = await yearFor(reg);
      if (year) years.set(reg, year);
      done++;
      if (done % 10 === 0 || done === SEED_META.length) {
        console.log(`  ${done}/${SEED_META.length} — ${years.size} years found`);
      }
      await new Promise((r) => setTimeout(r, 400)); // be gentle with sources
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, () => worker()),
  );

  const seedPath = join(__dirname, "..", "src", "lib", "seed.ts");
  let text = readFileSync(seedPath, "utf8");
  let updated = 0;
  const missing: string[] = [];

  for (const meta of SEED_META) {
    const year = years.get(meta.registration);
    const pattern = new RegExp(
      `\\{ registration: "${meta.registration}", family: "[^"]+", operator: "[^"]*"(, yearBuilt: \\d+)? \\}`,
    );
    if (year) {
      const replacement =
        `{ registration: "${meta.registration}", family: "${meta.family}", ` +
        `operator: "${meta.operator}", yearBuilt: ${year} }`;
      if (pattern.test(text)) {
        text = text.replace(pattern, replacement);
        updated++;
      }
    } else {
      missing.push(meta.registration);
    }
  }

  writeFileSync(seedPath, text);
  console.log(`\nUpdated ${updated} entries in seed.ts.`);
  if (missing.length) {
    console.log(`No year found for ${missing.length}: ${missing.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

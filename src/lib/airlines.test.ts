import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AIRLINES,
  airlineByName,
  airlineBySlug,
  slugifyAirlineName,
} from "./airlines";

describe("slugifyAirlineName", () => {
  it("lowercases and hyphenates", () => {
    assert.equal(slugifyAirlineName("Air France"), "air-france");
    assert.equal(
      slugifyAirlineName("KLM Royal Dutch Airlines"),
      "klm-royal-dutch-airlines",
    );
  });

  it("strips accents", () => {
    assert.equal(slugifyAirlineName("Aeroméxico"), "aeromexico");
  });

  it("handles EL AL", () => {
    assert.equal(slugifyAirlineName("EL AL"), "el-al");
  });
});

describe("AIRLINES table", () => {
  it("slugs are unique and match the slugified name", () => {
    const slugs = new Set<string>();
    for (const airline of AIRLINES) {
      assert.equal(
        airline.slug,
        slugifyAirlineName(airline.name),
        `slug mismatch for ${airline.name}`,
      );
      assert.ok(!slugs.has(airline.slug), `duplicate slug ${airline.slug}`);
      slugs.add(airline.slug);
    }
  });

  it("lookups round-trip", () => {
    for (const airline of AIRLINES) {
      assert.equal(airlineBySlug(airline.slug)?.name, airline.name);
      assert.equal(airlineByName(airline.name)?.slug, airline.slug);
    }
  });

  it("unknown names and slugs return undefined", () => {
    assert.equal(airlineByName("No Such Airline"), undefined);
    assert.equal(airlineBySlug("no-such-airline"), undefined);
  });

  it("every non-empty seed operator has an airline page", async () => {
    const { SEED_META } = await import("./seed");
    const operators = new Set(
      SEED_META.map((m) => m.operator).filter((o) => o.length > 0),
    );
    assert.ok(operators.size > 0, "expected some operators in seed");
    for (const operator of operators) {
      assert.ok(
        airlineByName(operator),
        `missing airline page for operator "${operator}"`,
      );
    }
    assert.equal(operators.size, AIRLINES.length);
  });
});

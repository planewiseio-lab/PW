import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeRegistration, registrationVariants } from "./normalize";
import { recordsCompatible } from "./compat";
import {
  ageFromYear,
  formatEngineLine,
  formatType,
  parseYearPrefix,
  translateStatus,
} from "./pretty";
import { formatAgeLabel } from "./i18n";
import { iataCodeFor } from "./iata";
import { parseAirportProfileHtml } from "./sources/airportDataParse";

describe("normalizeRegistration", () => {
  it("uppercases, trims, and hyphenates known prefixes", () => {
    assert.equal(normalizeRegistration("  f-htya "), "F-HTYA");
    assert.equal(normalizeRegistration("fhtya"), "F-HTYA");
    assert.equal(normalizeRegistration("a6eua"), "A6-EUA");
    assert.equal(normalizeRegistration("ph-bha"), "PH-BHA");
    assert.equal(normalizeRegistration("G ZBKA"), "G-ZBKA");
  });

  it("keeps US N-numbers without a hyphen", () => {
    assert.equal(normalizeRegistration("n628aa"), "N628AA");
  });

  it("preserves a typed hyphen instead of inventing a prefix", () => {
    assert.equal(normalizeRegistration("ZZ-ZZZZ"), "ZZ-ZZZZ");
  });

  it("rejects empty or implausible input", () => {
    assert.equal(normalizeRegistration(""), null);
    assert.equal(normalizeRegistration("x"), null);
    assert.equal(normalizeRegistration("THISISWAYTOOLONG"), null);
  });

  it("returns hyphen and compact variants", () => {
    assert.deepEqual(registrationVariants("F-HTYA"), ["F-HTYA", "FHTYA"]);
    assert.deepEqual(registrationVariants("N628AA"), ["N628AA"]);
  });
});

describe("pretty helpers", () => {
  it("parses a year-prefixed airport-data model", () => {
    assert.deepEqual(parseYearPrefix("2019 Airbus A350-941"), {
      year: 2019,
      rest: "Airbus A350-941",
    });
  });

  it("formats hexdb type codes", () => {
    assert.equal(formatType("A350 941"), "A350-941");
    assert.equal(formatType("2016 Airbus A350-941"), "Airbus A350-941");
  });

  it("translates known statuses and computes age", () => {
    assert.equal(translateStatus("Registered", "fr"), "Actif");
    assert.equal(translateStatus("Registered", "en"), "Active");
    assert.equal(ageFromYear(2019, new Date("2026-08-28T00:00:00Z")), 7);
    assert.equal(formatAgeLabel(7, "fr"), "7 ans");
    assert.equal(formatAgeLabel(7, "en"), "7 years");
    assert.equal(formatEngineLine("2", "Rolls-Royce Trent XWB-84"), "2 × Rolls-Royce Trent XWB-84");
  });

  it("maps common ICAO types to IATA codes", () => {
    assert.equal(iataCodeFor("A359"), "359");
    assert.equal(iataCodeFor("A388"), "380");
    assert.equal(iataCodeFor("B789"), "789");
    assert.equal(iataCodeFor("ZZZZ"), undefined);
  });
});

describe("airframe compatibility", () => {
  it("accepts the same family and rejects a recycled tail", () => {
    assert.equal(
      recordsCompatible("Airbus A350 941 A359", "2019 Airbus A350-941"),
      true,
    );
    assert.equal(
      recordsCompatible("Piper PA-46-600TP M600", "1990 Boeing 757-223"),
      false,
    );
  });
});

describe("airport-data HTML parser", () => {
  it("reads a profile table and ignores add-aircraft pages", () => {
    const html = `
      <div>Airframe Info</div>
      <table>
        <tr><td>Manufacturer</td><td>Airbus</td></tr>
        <tr><td>Model</td><td>A350-941</td></tr>
        <tr><td>Year built</td><td>2019</td></tr>
        <tr><td>Construction Number (C/N)</td><td>331</td></tr>
        <tr><td>Registration Number</td><td>F-HTYA</td></tr>
        <tr><td>Number of Engines</td><td>2</td></tr>
        <tr><td>Engine Manufacturer and Model</td><td>Rolls-Royce Trent XWB-84</td></tr>
        <tr><td>Current Status</td><td>Registered</td></tr>
        <tr><td>Delivery Date</td><td>2019-09-00</td></tr>
        <tr><td>Owner</td><td>Air France</td></tr>
        <tr><td>Also Registered As</td><td><a href="https://airport-data.com/aircraft/F-WZFN">F-WZFN</a></td></tr>
      </table>
    `;
    const parsed = parseAirportProfileHtml(html, "F-HTYA");
    assert.ok(parsed);
    assert.equal(parsed?.manufacturer, "Airbus");
    assert.equal(parsed?.type, "A350-941");
    assert.equal(parsed?.yearBuilt, 2019);
    assert.equal(parsed?.serial, "331");
    assert.equal(parsed?.status, "Registered");
    assert.equal(parsed?.engines, "2 × Rolls-Royce Trent XWB-84");
    assert.equal(parsed?.deliveryDate, "2019-09");
    assert.deepEqual(parsed?.previousRegistrations, ["F-WZFN"]);
  });

  it("returns null on an add-aircraft stub", () => {
    const html = `<title>Add aircraft ZZ-ZZZZ</title><p>Create a new aircraft</p>`;
    assert.equal(parseAirportProfileHtml(html, "ZZ-ZZZZ"), null);
  });
});

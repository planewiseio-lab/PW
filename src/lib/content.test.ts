import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ADSENSE_CLIENT } from "./adsense";
import { getImmatriculationPage } from "./immatriculation";
import { getLegalPage } from "./legal";

function flattenLegal(lang: "fr" | "en"): string {
  const page = getLegalPage(lang);
  const parts = [page.title, page.updated, page.intro];
  for (const section of page.sections) {
    parts.push(section.title);
    for (const block of section.blocks) {
      if (block.type === "ul") parts.push(...block.items);
      else parts.push(block.text);
    }
  }
  return parts.join("\n");
}

function flattenImmat(lang: "fr" | "en"): string {
  const page = getImmatriculationPage(lang);
  const parts = [page.title, page.description, page.intro, page.faqTitle];
  for (const section of page.sections) {
    parts.push(section.title, section.nav);
    for (const block of section.blocks) {
      if (block.type === "ul") parts.push(...block.items);
      else parts.push(block.text);
    }
  }
  for (const faq of page.faqs) parts.push(faq.q, faq.a);
  return parts.join("\n");
}

describe("legal copy", () => {
  for (const lang of ["fr", "en"] as const) {
    it(`omits publisher ID and Quebec/Canada transfer sentence (${lang})`, () => {
      const text = flattenLegal(lang);
      assert.equal(text.includes(ADSENSE_CLIENT), false);
      assert.doesNotMatch(text, /ca-pub-/);
      assert.doesNotMatch(text, /hors du Québec et du Canada/);
      assert.doesNotMatch(text, /outside Quebec and Canada/);
      assert.match(text, /AdSense/);
      assert.match(text, /\/contact/);
      assert.match(text, /info@planewise\.io/);
      assert.match(text, lang === "fr" ? /2 septembre 2026/ : /2 September 2026/);
    });
  }
});

describe("immatriculation copy", () => {
  for (const lang of ["fr", "en"] as const) {
    it(`has real bilingual paragraphs and a short FAQ (${lang})`, () => {
      const page = getImmatriculationPage(lang);
      const text = flattenImmat(lang);
      assert.ok(text.length > 2500, `expected substantial copy, got ${text.length}`);
      assert.match(text, /C-/);
      assert.match(text, /N875BD/);
      assert.match(text, /F-HTYA/);
      assert.match(text, /tail number/i);
      assert.match(text, /info@planewise\.io/);
      assert.ok(page.faqs.length >= 5);
      assert.notEqual(page.title, getLegalPage(lang).title);
    });
  }
});

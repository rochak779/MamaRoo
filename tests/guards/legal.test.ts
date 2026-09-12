import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateCopy } from "@/lib/domain/copy";

const files = [
  "content/legal/privacy.en.md",
  "content/legal/privacy.hi.md",
  "content/legal/terms.en.md",
  "content/legal/terms.hi.md",
];

describe("legal documents", () => {
  for (const file of files) {
    const text = readFileSync(file, "utf8");

    it(`${file} is marked as an unreviewed draft`, () => {
      expect(text).toContain("DRAFT, NOT LEGALLY REVIEWED");
    });

    it(`${file} has no placeholder left in it`, () => {
      expect(text).not.toMatch(/\b(TBD|TODO|XXX|Lorem ipsum)\b/i);
    });

    it(`${file} passes the voice rules`, () => {
      const body = text.split("\n").filter((l) => !l.startsWith(">")).join("\n");
      expect(validateCopy(body)).toEqual([]);
    });
  }

  it("the privacy policy states the three commitments the architecture actually makes", () => {
    const text = readFileSync("content/legal/privacy.en.md", "utf8");
    expect(text).toMatch(/audio/i);
    expect(text).toMatch(/Mumbai|India/i);
    expect(text).toMatch(/analytics/i);
  });

  it("makes the AI-provider claim at best-effort strength, not absolute", () => {
    const text = readFileSync("content/legal/privacy.en.md", "utf8");
    expect(text).not.toMatch(/no personal (data|information) is (ever )?sent/i);
    expect(text).toMatch(/question/i);
  });

  it("names the residual categories redaction cannot catch", () => {
    const text = readFileSync("content/legal/privacy.en.md", "utf8").toLowerCase();
    for (const category of ["address", "medicine", "identifier"]) {
      expect(text).toContain(category);
    }
  });
});

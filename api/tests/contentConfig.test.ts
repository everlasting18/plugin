import {
  isLongFormLength,
  normalizeAudience,
  normalizeLanguage,
} from "../src/agents/contentConfig.ts";

Deno.test("isLongFormLength matches medium and above", () => {
  if (isLongFormLength("short")) {
    throw new Error("Expected short to be non-long-form");
  }

  for (const value of ["medium", "long", "extra_long"]) {
    if (!isLongFormLength(value)) {
      throw new Error(`Expected ${value} to be long-form`);
    }
  }
});

Deno.test("normalizeAudience maps business to professional", () => {
  if (normalizeAudience("business") !== "professional") {
    throw new Error("Expected business to map to professional");
  }

  if (normalizeAudience("BEGINNER") !== "beginner") {
    throw new Error("Expected BEGINNER to map to beginner");
  }

  if (normalizeAudience("unknown") !== "general") {
    throw new Error("Expected unknown audience to map to general");
  }
});

Deno.test("normalizeLanguage supports english and vietnamese aliases", () => {
  if (normalizeLanguage("english") !== "en") {
    throw new Error("Expected english to map to en");
  }

  if (normalizeLanguage("vietnamese") !== "vi") {
    throw new Error("Expected vietnamese to map to vi");
  }

  if (normalizeLanguage("EN") !== "en") {
    throw new Error("Expected EN to map to en");
  }

  if (normalizeLanguage("unknown") !== "vi") {
    throw new Error("Expected unknown language to fall back to vi");
  }
});

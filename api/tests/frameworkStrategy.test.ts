import { resolveFrameworkPlan } from "../src/agents/frameworkStrategy.ts";

Deno.test("resolveFrameworkPlan keeps explicit compatible framework mapping", () => {
  const plan = resolveFrameworkPlan({
    keyword: "pricing dịch vụ SEO tổng thể",
    requestedFramework: "app_pas",
    audience: "professional",
    length: "medium",
  });

  if (plan.framework !== "pas") {
    throw new Error(`Expected framework pas, got ${plan.framework}`);
  }

  if (plan.source !== "user") {
    throw new Error(`Expected source user, got ${plan.source}`);
  }

  if (plan.mode !== "conversion") {
    throw new Error(`Expected mode conversion, got ${plan.mode}`);
  }
});

Deno.test("resolveFrameworkPlan auto-detects how-to intent and tutorial mode", () => {
  const plan = resolveFrameworkPlan({
    keyword: "cách viết bài chuẩn SEO từng bước",
    requestedFramework: "auto",
    audience: "beginner",
    length: "medium",
  });

  if (plan.framework !== "howto") {
    throw new Error(`Expected framework howto, got ${plan.framework}`);
  }

  if (plan.intent !== "how_to") {
    throw new Error(`Expected intent how_to, got ${plan.intent}`);
  }

  if (plan.mode !== "tutorial") {
    throw new Error(`Expected mode tutorial, got ${plan.mode}`);
  }

  if (plan.source !== "auto") {
    throw new Error(`Expected source auto, got ${plan.source}`);
  }

  if (!plan.strategyHint.includes("Khung viết: HOW-TO")) {
    throw new Error("Expected HOW-TO hint in strategyHint");
  }
});

Deno.test("resolveFrameworkPlan chooses eeat_skyscraper for comparison content", () => {
  const plan = resolveFrameworkPlan({
    keyword: "so sánh HubSpot vs Salesforce cho doanh nghiệp B2B",
    audience: "professional",
    length: "long",
  });

  if (plan.framework !== "eeat_skyscraper") {
    throw new Error(`Expected framework eeat_skyscraper, got ${plan.framework}`);
  }

  if (plan.intent !== "comparison") {
    throw new Error(`Expected intent comparison, got ${plan.intent}`);
  }

  if (plan.mode !== "decision") {
    throw new Error(`Expected mode decision, got ${plan.mode}`);
  }

  if (!plan.reason.includes("intent=comparison")) {
    throw new Error(`Expected comparison reason, got ${plan.reason}`);
  }
});

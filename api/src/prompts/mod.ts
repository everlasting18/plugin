// Legacy exports (old single-prompt approach)
export { generatePrompt, generateMaxTokens } from "./generate.ts";
export { rewritePrompt } from "./rewrite.ts";
export { metaPrompt } from "./meta.ts";

// New agentic prompt exports
export { researchPrompt } from "./research.ts";
export { writerPrompt, writerMaxTokens } from "./writer.ts";
export { editorPrompt, type EditorOutput } from "./editor.ts";

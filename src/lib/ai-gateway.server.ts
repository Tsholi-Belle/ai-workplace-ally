import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export interface ResolvedAiProvider {
  provider: ReturnType<typeof createOpenAICompatible>;
  modelName: string;
  isConfigured: boolean;
  providerName: "github" | "gemini" | "openai" | "custom" | "fallback";
}

/**
 * Resolves an AI provider prioritizing GitHub Models, Google Gemini, and OpenAI.
 * No proprietary vendor API keys required.
 */
export function getResilientAiProvider(): ResolvedAiProvider {
  const githubToken =
    process.env.GITHUB_TOKEN || process.env.GITHUB_AI_TOKEN || process.env.GH_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const customBaseUrl = process.env.AI_BASE_URL;
  const customApiKey = process.env.AI_API_KEY;

  // 1. GitHub Models (Azure AI / GitHub marketplace endpoint)
  if (githubToken) {
    return {
      provider: createOpenAICompatible({
        name: "github-models",
        baseURL: "https://models.inference.ai.azure.com",
        headers: { Authorization: `Bearer ${githubToken}` },
      }),
      modelName: process.env.GITHUB_AI_MODEL || "gpt-4o-mini",
      isConfigured: true,
      providerName: "github",
    };
  }

  // 2. Google Gemini API
  if (geminiKey) {
    return {
      provider: createOpenAICompatible({
        name: "google-gemini",
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        headers: { Authorization: `Bearer ${geminiKey}` },
      }),
      modelName: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      isConfigured: true,
      providerName: "gemini",
    };
  }

  // 3. OpenAI API
  if (openAiKey) {
    return {
      provider: createOpenAICompatible({
        name: "openai",
        baseURL: "https://api.openai.com/v1",
        headers: { Authorization: `Bearer ${openAiKey}` },
      }),
      modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
      isConfigured: true,
      providerName: "openai",
    };
  }

  // 4. Custom OpenAI-compatible endpoint (e.g. Ollama, vLLM, LocalAI)
  if (customBaseUrl && customApiKey) {
    return {
      provider: createOpenAICompatible({
        name: "custom-ai",
        baseURL: customBaseUrl,
        headers: { Authorization: `Bearer ${customApiKey}` },
      }),
      modelName: process.env.AI_MODEL || "default",
      isConfigured: true,
      providerName: "custom",
    };
  }

  // 5. Safe local fallback
  return {
    provider: createOpenAICompatible({
      name: "local-fallback",
      baseURL: "https://models.inference.ai.azure.com",
      headers: { Authorization: "Bearer unconfigured" },
    }),
    modelName: "gpt-4o-mini",
    isConfigured: false,
    providerName: "fallback",
  };
}

export function createStandardAiProvider(baseUrl: string, apiKey: string, name = "standard-ai") {
  return createOpenAICompatible({
    name,
    baseURL: baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

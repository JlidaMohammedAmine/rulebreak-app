import { AIProvider } from "./provider";
import { MockProvider } from "./mock";
import { NVIDIAProvider } from "./nvidia";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";

export function getAIProvider(): AIProvider {
  const providerType = process.env.AI_PROVIDER || "mock";
  const demoMode = process.env.DEMO_MODE === "true";

  if (demoMode || providerType === "mock") {
    return new MockProvider();
  }

  if (providerType === "nvidia") {
    return new NVIDIAProvider();
  }

  if (providerType === "openai") {
    return new OpenAIProvider();
  }

  if (providerType === "gemini") {
    return new GeminiProvider();
  }

  // Fallback to mock
  return new MockProvider();
}

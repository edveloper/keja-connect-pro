export interface FinancialNarrativeInput {
  monthLabel: string;
  totalCollected: number;
  totalExpenses: number;
  netIncome: number;
  collectionRate: number;
  billedAmount: number;
  expectedRent: number;
  topExpenseCategories: Array<{ name: string; amount: number }>;
}

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || "gemma3:1b";
const AI_REQUEST_TIMEOUT_MS = 90_000;
const AI_HEALTH_TIMEOUT_MS = 3_500;
const AI_MAX_RETRIES = 1;
const AI_BACKOFF_BASE_MS = 700;

function buildPrompt(input: FinancialNarrativeInput): string {
  const categoryLines = input.topExpenseCategories.length
    ? input.topExpenseCategories
        .map((c, i) => `${i + 1}. ${c.name}: KES ${Math.round(c.amount).toLocaleString()}`)
        .join("\n")
    : "No expense categories recorded.";

  return [
    "You are a financial operations assistant for landlords.",
    "Write a concise monthly summary in plain English.",
    "Keep it practical and action-oriented. No markdown headings or bullet symbols.",
    "",
    `Period: ${input.monthLabel}`,
    `Collections: KES ${Math.round(input.totalCollected).toLocaleString()}`,
    `Expenses: KES ${Math.round(input.totalExpenses).toLocaleString()}`,
    `Net Income: KES ${Math.round(input.netIncome).toLocaleString()}`,
    `Collection Rate: ${input.collectionRate.toFixed(1)}%`,
    `Billed Amount: KES ${Math.round(input.billedAmount).toLocaleString()}`,
    `Expected Rent (period basis): KES ${Math.round(input.expectedRent).toLocaleString()}`,
    "Top expense categories:",
    categoryLines,
    "",
    "Output exactly 3 short paragraphs:",
    "Paragraph 1: performance summary.",
    "Paragraph 2: risks/observations.",
    "Paragraph 3: recommended next actions for the landlord.",
  ].join("\n");
}

function getOfflineMessage(): string {
  return `AI service is offline. Start Ollama and ensure ${OLLAMA_BASE_URL} is reachable.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeoutController(timeoutMs: number): {
  controller: AbortController;
  clear: () => void;
} {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    controller,
    clear: () => clearTimeout(timeout),
  };
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(getOfflineMessage());
}

export interface AiServiceHealth {
  ok: boolean;
  baseUrl: string;
  model: string;
  error?: string;
}

export async function checkAiServiceHealth(): Promise<AiServiceHealth> {
  const { controller, clear } = withTimeoutController(AI_HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        ok: false,
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
        error: `AI service check failed (${res.status}).`,
      };
    }
    return { ok: true, baseUrl: OLLAMA_BASE_URL, model: OLLAMA_MODEL };
  } catch (error) {
    const normalized = normalizeError(error);
    if (normalized.name === "AbortError") {
      return {
        ok: false,
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
        error: `AI service check timed out (${AI_HEALTH_TIMEOUT_MS}ms).`,
      };
    }
    return {
      ok: false,
      baseUrl: OLLAMA_BASE_URL,
      model: OLLAMA_MODEL,
      error: getOfflineMessage(),
    };
  } finally {
    clear();
  }
}

export async function generateFinancialNarrative(
  input: FinancialNarrativeInput
): Promise<{ text: string; model: string; provider: string }> {
  const health = await checkAiServiceHealth();
  if (!health.ok) {
    throw new Error(health.error ?? getOfflineMessage());
  }

  const prompt = buildPrompt(input);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt += 1) {
    const { controller, clear } = withTimeoutController(AI_REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
        }),
      });

      if (!res.ok) {
        const retriable = isRetriableStatus(res.status);
        const err = new Error(`AI request failed (${res.status})`);
        if (retriable && attempt < AI_MAX_RETRIES) {
          await sleep(AI_BACKOFF_BASE_MS * Math.pow(2, attempt));
          continue;
        }
        throw err;
      }

      const data = (await res.json()) as { response?: string; model?: string };
      const text = (data.response ?? "").trim();
      if (!text) throw new Error("No response from model");

      return {
        text,
        model: data.model ?? OLLAMA_MODEL,
        provider: "ollama",
      };
    } catch (error) {
      const normalized = normalizeError(error);
      lastError = normalized;

      if (normalized.name === "AbortError" && attempt < AI_MAX_RETRIES) {
        await sleep(AI_BACKOFF_BASE_MS * Math.pow(2, attempt));
        continue;
      }

      if (normalized.message.includes("fetch") && attempt < AI_MAX_RETRIES) {
        await sleep(AI_BACKOFF_BASE_MS * Math.pow(2, attempt));
        continue;
      }
    } finally {
      clear();
    }
  }

  if (lastError?.name === "AbortError") {
    throw new Error("AI generation timed out after retries. Try again or use a smaller model.");
  }
  if (lastError?.message.includes("fetch")) {
    throw new Error(getOfflineMessage());
  }
  if (lastError) throw lastError;
  throw new Error(getOfflineMessage());
}

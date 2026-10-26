import OpenAI from "openai";

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env or .env.local and restart the development server.",
    );
  }
  return new OpenAI({ apiKey });
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

/** Turns an OpenAI SDK error into a short message and HTTP status for the client. */
export function describeOpenAIError(error: unknown): { message: string; status: number } {
  const status = (error as { status?: number } | null)?.status;
  const raw = error instanceof Error ? error.message : "Unexpected server error.";
  if (raw.includes("OPENAI_API_KEY")) return { message: raw, status: 500 };
  if (status === 401) {
    return { message: "OpenAI rejected the API key. Check OPENAI_API_KEY in .env and restart the server.", status: 502 };
  }
  if (status === 429 && /credit|quota|billing/i.test(raw)) {
    return {
      message: "Your OpenAI account has no credits left. Add billing at platform.openai.com/settings/organization/billing, then try again.",
      status: 402,
    };
  }
  if (status === 429) {
    return { message: "OpenAI is rate limiting requests. Wait a moment and try again.", status: 429 };
  }
  return { message: raw, status: 502 };
}

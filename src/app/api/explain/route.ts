import { generateDeterministicExplanation } from "@/lib/deterministic-explanation";
import type {
  ExplanationContext,
  ExplanationResult,
  ExplanationResponse,
} from "@/lib/explanation-types";

// ============================================================================
// Qwen Explanation API Route
// Server-side only — the DASHSCOPE_API_KEY is never exposed to the client.
//
// Flow:
// 1. Receive sanitized ExplanationContext from client
// 2. If no API key → return deterministic explanation
// 3. If API key → call Qwen with strict system prompt
//    - On success → validate response → return with source "qwen"
//    - On failure → fall back to deterministic
// 4. Timeout: 10 seconds, max 1 retry
// ============================================================================

const QWEN_API_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const QWEN_MODEL = "qwen-plus";
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

// ── System prompt — strict safety rules ──

function buildSystemPrompt(locale: "en" | "vi"): string {
  const localeInstruction =
    locale === "vi"
      ? 'Write entirely in Vietnamese. No English prose except approved brand names (AfterMath, Alibaba Cloud, Qwen). Use Vietnamese decimal separators (comma).'
      : 'Write entirely in English. No Vietnamese prose.';

  return `You are AfterMath's explanation assistant. Your role is to convert verified structured financial results into clear, concise natural-language explanations.

STRICT RULES:
1. Explain ONLY the supplied calculations. Do NOT invent, modify, or add any financial values.
2. Do NOT change the risk score, critical month, or any calculated figure.
3. Do NOT provide investment advice, lending approval, or legal advice.
4. Do NOT claim certainty. Use appropriate hedging language.
5. Do NOT expose your chain-of-thought or reasoning process.
6. ${localeInstruction}
7. Keep the response concise and focused.
8. Clearly distinguish assumptions from calculations.

OUTPUT FORMAT:
Return a JSON object with exactly these fields:
{
  "headline": "A concise headline (max 80 characters)",
  "summary": "A 2-3 sentence summary of the overall financial situation",
  "criticalTurningPointExplanation": "Explanation of the critical turning point, or why there is none",
  "topInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "recommendedActions": ["Action 1", "Action 2", "Action 3"],
  "disclaimer": "A brief disclaimer"
}

Return ONLY the JSON object. No markdown, no code blocks, no additional text.`;
}

// ── Response validation (manual schema validation, no Zod dependency) ──

function validateExplanation(data: unknown): data is ExplanationResult {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;

  // Required string fields
  const stringFields = [
    "headline",
    "summary",
    "criticalTurningPointExplanation",
    "disclaimer",
  ];
  for (const field of stringFields) {
    if (typeof obj[field] !== "string" || (obj[field] as string).length === 0) {
      return false;
    }
  }

  // Required array fields
  const arrayFields = ["topInsights", "recommendedActions"];
  for (const field of arrayFields) {
    if (!Array.isArray(obj[field])) return false;
    if (obj[field].length === 0) return false;
    if (!obj[field].every((item) => typeof item === "string")) return false;
  }

  return true;
}

// ── Qwen API call with timeout ──

async function callQwen(
  context: ExplanationContext,
): Promise<ExplanationResult> {
  const systemPrompt = buildSystemPrompt(context.locale);
  const userMessage = JSON.stringify(context, null, 2);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(QWEN_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Qwen API returned ${response.status}`);
    }

    const data = await response.json();

    // Extract content from OpenAI-compatible response
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Qwen API returned no content");
    }

    // Parse JSON from content
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Qwen API returned invalid JSON");
      }
    }

    if (!validateExplanation(parsed)) {
      throw new Error("Qwen API returned invalid explanation schema");
    }

    return parsed;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Route handler ──

export async function POST(request: Request): Promise<Response> {
  let context: ExplanationContext;

  try {
    const body = await request.json();
    context = body as ExplanationContext;
  } catch {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Basic context validation
  if (!context?.scenario || !context?.metrics || !context?.locale) {
    return Response.json(
      { error: "Invalid explanation context" },
      { status: 400 },
    );
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;

  // No API key → deterministic fallback
  if (!apiKey) {
    const result = generateDeterministicExplanation(context);
    return Response.json(result);
  }

  // Try Qwen, fall back to deterministic on any failure
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const explanation = await callQwen(context);
      return Response.json({
        explanation,
        source: "qwen" as const,
      } satisfies ExplanationResponse);
    } catch {
      // Last attempt failed → use deterministic fallback
      if (attempt === MAX_RETRIES) {
        const result = generateDeterministicExplanation(context);
        return Response.json(result);
      }
      // Otherwise retry
    }
  }

  // Should never reach here, but just in case
  const result = generateDeterministicExplanation(context);
  return Response.json(result);
}

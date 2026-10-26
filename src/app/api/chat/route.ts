import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";
import { chatRequestSchema, chatResponseSchema } from "@/lib/schemas";
import { describeOpenAIError, getOpenAIClient, getOpenAIModel } from "@/lib/openai-server";
import { buildChatContext, buildChatSystemPrompt } from "@/lib/prompts";

const HISTORY_LIMIT = 24;

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = chatRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "The chat request was malformed.",
          details: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const client = getOpenAIClient();
    const response = await client.responses.parse({
      model: getOpenAIModel(),
      input: [
        { role: "system", content: buildChatSystemPrompt() },
        { role: "system", content: buildChatContext(parsed.data) },
        ...parsed.data.messages.slice(-HISTORY_LIMIT),
      ],
      text: {
        format: zodTextFormat(chatResponseSchema, "assistant_turn"),
      },
    });

    if (!response.output_parsed) {
      return NextResponse.json(
        { error: "The assistant did not return a valid reply. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ turn: response.output_parsed });
  } catch (error) {
    const { message, status } = describeOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

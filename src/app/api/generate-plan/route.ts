import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";
import { aiPlanSchema, generatePlanRequestSchema } from "@/lib/schemas";
import { describeOpenAIError, getOpenAIClient, getOpenAIModel } from "@/lib/openai-server";
import { buildPlanSystemPrompt, buildPlanUserPrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = generatePlanRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "The project or team information is incomplete.",
          details: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const client = getOpenAIClient();
    const response = await client.responses.parse({
      model: getOpenAIModel(),
      input: [
        { role: "system", content: buildPlanSystemPrompt() },
        { role: "user", content: buildPlanUserPrompt(parsed.data) },
      ],
      text: {
        format: zodTextFormat(aiPlanSchema, "team_plan"),
      },
    });

    if (!response.output_parsed) {
      return NextResponse.json(
        { error: "The model did not return a valid team plan. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ plan: response.output_parsed });
  } catch (error) {
    const { message, status } = describeOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

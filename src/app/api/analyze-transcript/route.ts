import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";
import { meetingAnalysisRequestSchema, meetingAnalysisSchema } from "@/lib/schemas";
import { describeOpenAIError, getOpenAIClient, getOpenAIModel } from "@/lib/openai-server";
import { buildMeetingSystemPrompt, buildMeetingUserPrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = meetingAnalysisRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "A meeting transcript is required.",
          details: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const client = getOpenAIClient();
    const response = await client.responses.parse({
      model: getOpenAIModel(),
      input: [
        { role: "system", content: buildMeetingSystemPrompt() },
        { role: "user", content: buildMeetingUserPrompt(parsed.data) },
      ],
      text: {
        format: zodTextFormat(meetingAnalysisSchema, "meeting_analysis"),
      },
    });

    if (!response.output_parsed) {
      return NextResponse.json(
        { error: "The model did not return a valid meeting analysis. Try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ analysis: response.output_parsed });
  } catch (error) {
    const { message, status } = describeOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

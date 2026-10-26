import { NextResponse } from "next/server";
import { zodTextFormat } from "openai/helpers/zod";
import { intakeRequestSchema, intakeResponseSchema } from "@/lib/schemas";
import { describeOpenAIError, getOpenAIClient, getOpenAIModel } from "@/lib/openai-server";
import { buildIntakeSystemPrompt } from "@/lib/prompts";

export async function POST(request: Request) {
  try {
    const parsed = intakeRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "The pasted text was empty or too long." },
        { status: 400 },
      );
    }

    const client = getOpenAIClient();
    const response = await client.responses.parse({
      model: getOpenAIModel(),
      input: [
        { role: "system", content: buildIntakeSystemPrompt() },
        {
          role: "user",
          content: `Today's date: ${parsed.data.today}\n\nPasted text:\n${parsed.data.text}`,
        },
      ],
      text: { format: zodTextFormat(intakeResponseSchema, "project_intake") },
    });

    if (!response.output_parsed) {
      return NextResponse.json(
        { error: "Could not read the pasted text. Try again." },
        { status: 502 },
      );
    }
    return NextResponse.json({ intake: response.output_parsed });
  } catch (error) {
    const { message, status } = describeOpenAIError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

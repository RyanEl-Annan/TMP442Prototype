import { mapAiPlan } from "@/lib/map-plan";
import type { AIPlanPayload } from "@/lib/schemas";
import type { AIPlan, ProjectDraft, TeamMember } from "@/lib/types";

export async function requestPlan(project: ProjectDraft, members: TeamMember[]): Promise<AIPlan> {
  const payload = {
    today: new Date().toISOString().slice(0, 10),
    project: {
      name: project.name,
      description: project.description,
      deadline: project.deadline,
      instructions: project.instructions,
      teamCharter: project.teamCharter,
      uploadedFiles: project.uploadedFiles,
    },
    members,
  };
  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as { plan?: AIPlanPayload; error?: string };
  if (!response.ok || !data.plan) {
    throw new Error(data.error || "Plan generation failed.");
  }
  return mapAiPlan(data.plan, members);
}

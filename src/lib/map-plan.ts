import type { AIPlanPayload } from "@/lib/schemas";
import type { AIPlan, TeamMember } from "@/lib/types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function mapAiPlan(payload: AIPlanPayload, members: TeamMember[]): AIPlan {
  return {
    projectSummary: payload.projectSummary,
    deliverables: payload.deliverables,
    recommendations: payload.recommendations.slice(0, 5),
    uncertainties: payload.uncertainties,
    generatedAt: new Date().toISOString(),
    tasks: payload.tasks.map((task) => {
      const match = members.find(
        (member) => normalize(member.name) === normalize(task.assignedMemberName),
      );
      return {
        id: crypto.randomUUID(),
        title: task.title,
        description: task.description,
        assignedMemberId: match?.id ?? null,
        assignedMemberName: match?.name ?? (task.assignedMemberName || "Unassigned"),
        priority: task.priority,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        status: "todo" as const,
        reasoning: task.reasoning,
        dependencies: task.dependencies,
      };
    }),
  };
}

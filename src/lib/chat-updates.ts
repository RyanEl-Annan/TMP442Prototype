import type { ChatResponsePayload } from "@/lib/schemas";
import type { AppState, PlanTask, TeamMember } from "@/lib/types";

type MemberUpdate = ChatResponsePayload["memberUpdates"][number];
type TaskUpdate = ChatResponsePayload["taskUpdates"][number];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function upsertMembers(members: TeamMember[], updates: MemberUpdate[]): TeamMember[] {
  // Drop the blank placeholder row once real teammates arrive.
  let next = updates.length ? members.filter((member) => member.name.trim()) : members;

  for (const update of updates) {
    const name = update.name.trim();
    if (!name) continue;
    const existing = next.find((member) => normalize(member.name) === normalize(name));

    if (update.remove) {
      next = next.filter((member) => member !== existing);
      continue;
    }

    if (existing) {
      next = next.map((member) =>
        member === existing
          ? {
              ...member,
              skills: update.skills ?? member.skills,
              interests: update.interests ?? member.interests,
              weeklyHours: update.weeklyHours ?? member.weeklyHours,
              notes: update.notes ?? member.notes,
            }
          : member,
      );
    } else {
      next = [
        ...next,
        {
          id: crypto.randomUUID(),
          name,
          skills: update.skills ?? "",
          interests: update.interests ?? "",
          weeklyHours: update.weeklyHours ?? 8,
          notes: update.notes ?? "",
        },
      ];
    }
  }

  return next;
}

function applyTaskUpdates(
  tasks: PlanTask[],
  updates: TaskUpdate[],
  members: TeamMember[],
): PlanTask[] {
  return tasks.map((task) => {
    const update = updates.find((item) => normalize(item.taskTitle) === normalize(task.title));
    if (!update) return task;

    let owner = {};
    if (update.assignedMemberName !== null) {
      const match = members.find(
        (member) => normalize(member.name) === normalize(update.assignedMemberName ?? ""),
      );
      owner = {
        assignedMemberId: match?.id ?? null,
        assignedMemberName: match?.name ?? (update.assignedMemberName || "Unassigned"),
      };
    }

    return {
      ...task,
      ...owner,
      status: update.status ?? task.status,
      priority: update.priority ?? task.priority,
      dueDate: update.dueDate ?? task.dueDate,
      estimatedHours: update.estimatedHours ?? task.estimatedHours,
    };
  });
}

export function applyAssistantTurn(
  state: AppState,
  turn: ChatResponsePayload,
  lastUserMessage: string,
): AppState {
  const { projectUpdates } = turn;
  const project = { ...state.project };

  if (projectUpdates.name) project.name = projectUpdates.name;
  if (projectUpdates.description) project.description = projectUpdates.description;
  if (projectUpdates.deadline) project.deadline = projectUpdates.deadline;
  if (projectUpdates.teamCharter) project.teamCharter = projectUpdates.teamCharter;
  if (projectUpdates.useLastMessageAsInstructions && lastUserMessage.trim()) {
    project.instructions = [project.instructions, lastUserMessage.trim()]
      .filter(Boolean)
      .join("\n\n");
  }
  project.members = upsertMembers(project.members, turn.memberUpdates);

  let pendingPlan = state.pendingPlan;
  const workingPlan = state.pendingPlan ?? state.plan;
  if (turn.taskUpdates.length && workingPlan) {
    pendingPlan = {
      ...workingPlan,
      tasks: applyTaskUpdates(workingPlan.tasks, turn.taskUpdates, project.members),
    };
  }

  return { ...state, project, pendingPlan };
}

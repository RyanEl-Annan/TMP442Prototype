import type { AIPlan, PlanTask, ProjectDraft, TaskPriority } from "@/lib/types";

export type WorkloadRow = {
  memberId: string;
  name: string;
  taskCount: number;
  estimatedHours: number;
  availableHours: number;
  utilization: number;
  imbalance: "under" | "balanced" | "over";
};

export function getAssignedTaskCount(plan: AIPlan | null) {
  if (!plan) return 0;
  return plan.tasks.filter((task) => task.assignedMemberId).length;
}

export function getCompletionPercent(plan: AIPlan | null) {
  if (!plan || plan.tasks.length === 0) return 0;
  const done = plan.tasks.filter((task) => task.status === "done").length;
  return Math.round((done / plan.tasks.length) * 100);
}

export function getUpcomingTasks(plan: AIPlan | null, limit = 5): PlanTask[] {
  if (!plan) return [];
  return [...plan.tasks]
    .filter((task) => task.status !== "done" && task.dueDate)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, limit);
}

export function getPriorityCounts(plan: AIPlan | null) {
  const counts: Record<TaskPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  if (!plan) return counts;
  for (const task of plan.tasks) {
    counts[task.priority] += 1;
  }
  return counts;
}

/** Weeks from when the plan was made until the deadline (at least 1). Uses the plan's own timestamp so it is stable across renders. */
export function getPlanWeeks(project: ProjectDraft, plan: AIPlan | null): number {
  if (!plan || !project.deadline) return 1;
  const start = Date.parse(plan.generatedAt);
  const end = Date.parse(project.deadline);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000)));
}

export function getWorkload(project: ProjectDraft, plan: AIPlan | null): WorkloadRow[] {
  const weeks = getPlanWeeks(project, plan);
  return project.members
    .filter((member) => member.name.trim())
    .map((member) => {
      const tasks = plan?.tasks.filter((task) => task.assignedMemberId === member.id) ?? [];
      const estimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
      const availableHours = (member.weeklyHours || 0) * weeks;
      const utilization = availableHours > 0 ? estimatedHours / availableHours : 0;
      let imbalance: WorkloadRow["imbalance"] = "balanced";
      if (availableHours > 0 && utilization > 1.15) imbalance = "over";
      if (availableHours > 0 && utilization < 0.5 && tasks.length > 0) imbalance = "under";
      if (tasks.length === 0) imbalance = "under";
      return {
        memberId: member.id,
        name: member.name,
        taskCount: tasks.length,
        estimatedHours,
        availableHours,
        utilization,
        imbalance,
      };
    });
}

export function getStatusCounts(plan: AIPlan | null) {
  const counts = { todo: 0, in_progress: 0, blocked: 0, done: 0 };
  if (!plan) return counts;
  for (const task of plan.tasks) {
    counts[task.status] += 1;
  }
  return counts;
}

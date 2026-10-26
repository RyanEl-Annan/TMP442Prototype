"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  MessageSquare,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { WorkloadCharts } from "@/components/dashboard/workload-charts";
import { Reveal, ProgressRing } from "@/components/motion/primitives";
import { PriorityBadge, StatusBadge } from "@/components/priority-badge";
import { useAppState } from "@/context/app-state";
import { ChartTooltip, chartColors } from "@/lib/charts";
import {
  getAssignedTaskCount,
  getCompletionPercent,
  getPriorityCounts,
  getUpcomingTasks,
} from "@/lib/stats";
import { cn } from "@/lib/utils";

export function DashboardView() {
  const router = useRouter();
  const { ready, state, setTaskStatus, projects, activeProjectId, switchProject, createProject } =
    useAppState();
  if (!ready) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  const { project, plan } = state;
  const namedMembers = project.members.filter((member) => member.name.trim());
  const totalTasks = plan?.tasks.length ?? 0;
  const assigned = getAssignedTaskCount(plan);
  const completion = getCompletionPercent(plan);
  const upcoming = getUpcomingTasks(plan);
  const priorities = getPriorityCounts(plan);
  const distribution = Object.entries(priorities)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
  const doneCount = plan?.tasks.filter((task) => task.status === "done").length ?? 0;

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ProgressRing percent={completion} />
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Current project
              </p>
              <h2 className="truncate text-2xl font-semibold tracking-tight">
                {project.name.trim() || "No project yet"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {project.deadline ? `Due ${project.deadline}` : "No deadline set"}
                {plan ? ` · ${doneCount} of ${totalTasks} tasks done` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild className="flex-1 sm:flex-none">
              <Link href="/assistant">
                <MessageSquare className="size-4" />
                Open assistant
              </Link>
            </Button>
          </div>
        </div>
      </Reveal>

      {projects.length > 1 ? (
        <Reveal delay={0.04}>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {projects.map((item) => {
              const percent = item.taskCount ? Math.round((item.doneCount / item.taskCount) * 100) : 0;
              const active = item.id === activeProjectId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchProject(item.id)}
                  className={cn(
                    "w-48 shrink-0 rounded-xl border p-3 text-left transition-colors",
                    active ? "border-primary bg-primary/5" : "bg-card hover:border-foreground/30",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <FolderKanban className={cn("size-4", active && "text-primary")} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.span
                      className="block h-full rounded-full bg-primary"
                      initial={false}
                      animate={{ width: `${percent}%` }}
                    />
                  </span>
                  <span className="mt-1.5 block text-xs text-muted-foreground">
                    {item.taskCount ? `${item.doneCount}/${item.taskCount} done` : "No plan yet"}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                createProject();
                router.push("/assistant");
              }}
              className="flex w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="size-4" />
              New project
            </button>
          </div>
        </Reveal>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total tasks",
            value: totalTasks,
            hint: plan ? "In the shared plan" : "Share a plan to fill this in",
            icon: <ClipboardList className="size-4" />,
          },
          {
            label: "Assigned",
            value: assigned,
            hint: totalTasks ? `${assigned} of ${totalTasks} have an owner` : "No assignments yet",
            icon: <CheckCircle2 className="size-4" />,
          },
          {
            label: "Team members",
            value: namedMembers.length,
            hint: namedMembers.length ? "On the roster" : "Add teammates in the assistant",
            icon: <Users className="size-4" />,
          },
          {
            label: "Completion",
            value: completion,
            suffix: "%",
            hint: plan ? "Based on tasks marked done" : "Appears once you have tasks",
            icon: <Sparkles className="size-4" />,
          },
        ].map((card, index) => (
          <Reveal key={card.label} delay={0.06 + index * 0.05}>
            <StatCard {...card} />
          </Reveal>
        ))}
      </div>

      {plan ? (
        <>
          <Reveal>
            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Team workload
            </h3>
          </Reveal>
          <WorkloadCharts project={project} plan={plan} />

          <Reveal>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Task checklist</CardTitle>
                  <CardDescription>Tick tasks off as your team finishes them.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/assistant">
                    <MessageSquare className="size-4" />
                    Edit in chat
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {plan.tasks.map((task, index) => (
                      <motion.li
                        key={task.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.4) }}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <Checkbox
                          checked={task.status === "done"}
                          onCheckedChange={(checked) =>
                            setTaskStatus(task.id, checked ? "done" : "todo")
                          }
                          aria-label={`Mark ${task.title} done`}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "font-medium",
                              task.status === "done" && "text-muted-foreground line-through",
                            )}
                          >
                            {task.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {task.assignedMemberName}
                            {task.dueDate ? ` · due ${task.dueDate}` : ""} · {task.estimatedHours}h
                          </p>
                        </div>
                        <PriorityBadge priority={task.priority} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </CardContent>
            </Card>
          </Reveal>

          <div className="grid gap-4 lg:grid-cols-2">
            <Reveal>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Priority mix</CardTitle>
                  <CardDescription>How urgent the work is.</CardDescription>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="var(--card)"
                        strokeWidth={2}
                      >
                        {distribution.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={0.06}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Upcoming deadlines</CardTitle>
                  <CardDescription>Open tasks, soonest first.</CardDescription>
                </CardHeader>
                <CardContent>
                  {upcoming.length ? (
                    <ul className="space-y-3">
                      {upcoming.map((task) => (
                        <li
                          key={task.id}
                          className="flex items-start justify-between gap-3 rounded-lg border p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {task.assignedMemberName} · {task.dueDate}
                            </p>
                          </div>
                          <StatusBadge status={task.status} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      className="border-0 bg-transparent py-8"
                      icon={<CalendarClock className="size-4" />}
                      title="No upcoming dates"
                      description="Tasks with due dates show up here."
                    />
                  )}
                </CardContent>
              </Card>
            </Reveal>
          </div>

          {plan.recommendations.length ? (
            <Reveal>
              <Card>
                <CardHeader>
                  <CardTitle>AI recommendations</CardTitle>
                  <CardDescription>Suggestions from the latest plan.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {plan.recommendations.slice(0, 4).map((item) => (
                      <li
                        key={item}
                        className="rounded-lg border-l-2 border-primary bg-muted/40 p-3 text-sm leading-6"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Reveal>
          ) : null}
        </>
      ) : (
        <Reveal delay={0.2}>
          <EmptyState
            icon={<MessageSquare className="size-4" />}
            title="No plan yet"
            description="Chat with the assistant to set up this project. Share the plan and it shows up here with charts for every teammate."
            action={
              <Button asChild>
                <Link href="/assistant">Start chatting</Link>
              </Button>
            }
          />
        </Reveal>
      )}
    </div>
  );
}

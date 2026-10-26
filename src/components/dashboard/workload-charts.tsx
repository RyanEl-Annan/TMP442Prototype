"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "motion/react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/motion/primitives";
import { ChartTooltip, chartAxisTick, chartColors, chartGridStroke } from "@/lib/charts";
import { getWorkload } from "@/lib/stats";
import type { AIPlan, ProjectDraft } from "@/lib/types";
import { cn } from "@/lib/utils";

const imbalanceLabel = {
  over: "Overloaded",
  balanced: "Balanced",
  under: "Has capacity",
} as const;

export function WorkloadCharts({ project, plan }: { project: ProjectDraft; plan: AIPlan | null }) {
  const rows = getWorkload(project, plan);
  const colorOf = (index: number) => chartColors[index % chartColors.length];

  if (!plan || !rows.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team workload</CardTitle>
          <CardDescription>Who is doing what, and whether it is fair.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            className="border-0 bg-transparent py-8"
            icon={<Users className="size-4" />}
            title="Workload appears with a plan"
            description="Add teammates and share a plan to see each person's share of the work."
          />
        </CardContent>
      </Card>
    );
  }

  const totalHours = rows.reduce((sum, row) => sum + row.estimatedHours, 0);
  const shareData = rows
    .map((row, index) => ({ name: row.name, value: row.estimatedHours, fill: colorOf(index) }))
    .filter((row) => row.value > 0);
  const capacityData = rows.map((row, index) => ({
    name: row.name,
    value: Math.min(Math.round(row.utilization * 100), 150),
    fill: colorOf(index),
  }));
  const statusData = rows.map((row) => {
    const tasks = plan.tasks.filter((task) => task.assignedMemberId === row.memberId);
    const count = (status: string) => tasks.filter((task) => task.status === status).length;
    return {
      name: row.name,
      "To do": count("todo"),
      "In progress": count("in_progress"),
      Blocked: count("blocked"),
      Done: count("done"),
    };
  });
  const unassigned = plan.tasks.filter((task) => !task.assignedMemberId).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Share of the work</CardTitle>
              <CardDescription>Estimated hours by teammate.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {shareData.length ? (
                <div className="relative h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={shareData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="58%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="var(--card)"
                        strokeWidth={2}
                        animationDuration={900}
                      >
                        {shareData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend verticalAlign="bottom" height={28} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
                    <p className="text-2xl font-semibold tracking-tight">{totalHours}h</p>
                    <p className="text-xs text-muted-foreground">total</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hours estimated yet.</p>
              )}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Capacity used</CardTitle>
              <CardDescription>Assigned hours against each person&apos;s total hours until the deadline. A full ring is 100%.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={capacityData}
                  innerRadius="22%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  barSize={12}
                >
                  <PolarAngleAxis type="number" domain={[0, 150]} tick={false} />
                  <RadialBar
                    dataKey="value"
                    name="Capacity %"
                    background={{ fill: "var(--muted)" }}
                    cornerRadius={8}
                    animationDuration={900}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" />
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={0.12}>
        <Card>
          <CardHeader>
            <CardTitle>Task status by teammate</CardTitle>
            <CardDescription>
              {unassigned
                ? `${unassigned} task${unassigned === 1 ? " has" : "s have"} no owner yet.`
                : "Every task has an owner."}
            </CardDescription>
          </CardHeader>
          <CardContent style={{ height: Math.max(180, rows.length * 56 + 70) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ left: 0, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGridStroke} />
                <XAxis type="number" allowDecimals={false} tick={chartAxisTick} />
                <YAxis type="category" dataKey="name" width={72} tick={chartAxisTick} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
                <Legend iconType="circle" />
                <Bar dataKey="Done" stackId="s" fill="var(--chart-2)" animationDuration={800} />
                <Bar dataKey="In progress" stackId="s" fill="var(--chart-4)" animationDuration={800} />
                <Bar dataKey="Blocked" stackId="s" fill="var(--chart-1)" animationDuration={800} />
                <Bar
                  dataKey="To do"
                  stackId="s"
                  fill="var(--chart-5)"
                  radius={[0, 6, 6, 0]}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Reveal>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row, index) => (
          <Reveal key={row.memberId} delay={0.15 + index * 0.05}>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-background"
                    style={{ background: colorOf(index) }}
                  >
                    {row.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.taskCount} task{row.taskCount === 1 ? "" : "s"} · {row.estimatedHours}h of{" "}
                      {row.availableHours}h available
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    row.imbalance === "over" && "border-primary bg-primary/10 text-primary",
                  )}
                >
                  {imbalanceLabel[row.imbalance]}
                </Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={cn("h-full rounded-full", row.imbalance === "over" ? "bg-primary" : "bg-foreground")}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(row.utilization, 1) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs text-muted-foreground">
                {Math.round(row.utilization * 100)}% of available hours
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

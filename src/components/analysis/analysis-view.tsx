"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { PriorityBadge } from "@/components/priority-badge";
import { useAppState } from "@/context/app-state";
import type { MeetingAnalysisPayload } from "@/lib/schemas";
import {
  availableHoursFill,
  ChartTooltip,
  chartAxisTick,
  chartGridStroke,
  estimatedHoursFill,
} from "@/lib/charts";
import { getWorkload } from "@/lib/stats";
import type { TaskPriority, TaskStatus } from "@/lib/types";

const priorities: TaskPriority[] = ["low", "medium", "high", "critical"];
const statuses: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

export function AnalysisView() {
  const {
    ready,
    state,
    updateTask,
    addTask,
    removeTask,
    setMeetingAnalysis,
  } = useAppState();
  const [transcript, setTranscript] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  }

  const { project, plan, meetingAnalysis } = state;
  const members = project.members.filter((member) => member.name.trim());
  const workload = getWorkload(project, plan);

  async function analyzeTranscript() {
    if (analyzing) return;
    if (transcript.trim().length < 40) {
      toast.error("Paste a longer transcript before analyzing.");
      return;
    }
    setAnalyzing(true);
    try {
      const response = await fetch("/api/analyze-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          projectName: project.name,
          memberNames: members.map((member) => member.name),
        }),
      });
      const data = (await response.json()) as {
        analysis?: MeetingAnalysisPayload;
        error?: string;
      };
      if (!response.ok || !data.analysis) {
        throw new Error(data.error || "Transcript analysis failed.");
      }
      setMeetingAnalysis({ ...data.analysis, analyzedAt: new Date().toISOString() });
      toast.success("Meeting analysis ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not analyze the transcript.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleTranscriptFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
      toast.error("Upload a TXT transcript.");
      return;
    }
    const text = await file.text();
    setTranscript(text);
    toast.success(`Loaded ${file.name}`);
  }

  if (!plan) {
    return (
      <EmptyState
        icon={<Printer className="size-4" />}
        title="No AI plan yet"
        description="Generate a team plan from the New Project workflow. Results will appear here and persist in this browser."
        action={
          <Button asChild>
            <Link href="/new-project">Go to New Project</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between no-print">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{project.name || "Team plan"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated {new Date(plan.generatedAt).toLocaleString()}. Review assignments before sharing.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" />
          Export report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project overview</CardTitle>
          <CardDescription>AI summary of the assignment as provided.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6">{plan.projectSummary}</p>
          {plan.deliverables.length ? (
            <div>
              <p className="text-sm font-medium">Major deliverables</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {plan.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {plan.uncertainties.length ? (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
              <p className="font-medium">Uncertainties</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {plan.uncertainties.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="print-wide">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Task assignment</CardTitle>
            <CardDescription>Edit owners, status, and hours. Changes save automatically.</CardDescription>
          </div>
          <Button className="no-print" variant="outline" onClick={() => addTask()}>
            <Plus className="size-4" />
            Add task
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Assigned member</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="no-print" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="min-w-48 align-top">
                    <Input
                      value={task.title}
                      onChange={(event) => updateTask(task.id, { title: event.target.value })}
                      aria-label={`Task title ${task.title}`}
                    />
                    <p className="mt-2 max-w-xs text-xs text-muted-foreground">{task.description}</p>
                    {task.reasoning ? (
                      <p className="mt-2 max-w-xs text-xs text-muted-foreground">
                        Why: {task.reasoning}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    <Select
                      value={task.assignedMemberId ?? "unassigned"}
                      onValueChange={(value) => {
                        if (value === "unassigned") {
                          updateTask(task.id, {
                            assignedMemberId: null,
                            assignedMemberName: "Unassigned",
                          });
                          return;
                        }
                        const member = members.find((item) => item.id === value);
                        updateTask(task.id, {
                          assignedMemberId: value,
                          assignedMemberName: member?.name ?? "Unassigned",
                        });
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="align-top">
                    <Select
                      value={task.priority}
                      onValueChange={(value) =>
                        updateTask(task.id, { priority: value as TaskPriority })
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-2">
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      type="date"
                      value={task.dueDate ?? ""}
                      onChange={(event) =>
                        updateTask(task.id, { dueDate: event.target.value || null })
                      }
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      type="number"
                      min={0}
                      className="w-20"
                      value={task.estimatedHours}
                      onChange={(event) =>
                        updateTask(task.id, { estimatedHours: Number(event.target.value) })
                      }
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Select
                      value={task.status}
                      onValueChange={(value) =>
                        updateTask(task.id, { status: value as TaskStatus })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {task.status !== "done" ? (
                      <Button
                        className="mt-2 no-print"
                        size="sm"
                        variant="outline"
                        onClick={() => updateTask(task.id, { status: "done" })}
                      >
                        Mark complete
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top no-print">
                    <Button variant="ghost" size="icon-sm" onClick={() => removeTask(task.id)}>
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remove task</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team workload</CardTitle>
          <CardDescription>
            Compare estimated hours with each person&apos;s available hours until the deadline (weekly hours x weeks).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridStroke} />
                <XAxis dataKey="name" tick={chartAxisTick} />
                <YAxis tick={chartAxisTick} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="estimatedHours" name="Estimated hours" fill={estimatedHoursFill} radius={[6, 6, 0, 0]} />
                <Bar dataKey="availableHours" name="Available hours" fill={availableHoursFill} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workload.map((row) => (
              <div key={row.memberId} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{row.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {row.taskCount} tasks · {row.estimatedHours} estimated hrs · {row.availableHours} available
                </p>
                <p className="mt-1">
                  {row.imbalance === "over"
                    ? "Potential overload relative to available hours."
                    : row.imbalance === "under"
                      ? "Capacity remaining or few assignments."
                      : "Workload looks reasonably balanced."}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI recommendations</CardTitle>
          <CardDescription>Coordination guidance based on this project and roster.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {plan.recommendations.map((item, index) => (
              <li key={item} className="rounded-lg border p-3 text-sm leading-6">
                <span className="mr-2 font-medium text-primary">{index + 1}.</span>
                {item}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardHeader>
          <CardTitle>Meeting transcript analysis</CardTitle>
          <CardDescription>
            Optional. Paste a transcript or upload a TXT file. Observations stay tied to the text you provide.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transcript">Transcript</Label>
            <Textarea
              id="transcript"
              rows={8}
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Paste the meeting transcript here."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              Upload TXT
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(event) => handleTranscriptFile(event.target.files)}
            />
            <Button onClick={analyzeTranscript} disabled={analyzing}>
              {analyzing ? <Loader2 className="size-4 animate-spin" /> : null}
              Analyze Team Dynamics
            </Button>
          </div>
          {meetingAnalysis ? (
            <div className="space-y-4 rounded-xl border p-4">
              <p className="text-sm leading-6">{meetingAnalysis.summary}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Insight title="Participation" body={meetingAnalysis.participation} />
                <Insight title="Role clarity" body={meetingAnalysis.roleClarity} />
                <Insight title="Accountability" body={meetingAnalysis.accountability} />
              </div>
              <ListBlock title="Observations" items={meetingAnalysis.observations} />
              <ListBlock title="Interpretations" items={meetingAnalysis.interpretations} />
              <ListBlock title="Communication issues" items={meetingAnalysis.communicationIssues} />
              <ListBlock title="Unresolved decisions" items={meetingAnalysis.unresolvedDecisions} />
              <ListBlock title="Recommendations" items={meetingAnalysis.recommendations} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Insight({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

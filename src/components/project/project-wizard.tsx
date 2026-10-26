"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FileText, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/context/app-state";
import { extractDocumentText } from "@/lib/extract-text";
import { mapAiPlan } from "@/lib/map-plan";
import { projectStepSchema, teamStepSchema } from "@/lib/schemas";
import type { AIPlanPayload } from "@/lib/schemas";
import { zodResolver } from "@/lib/zod-resolver";

const steps = ["Project information", "Team information", "Generate AI plan"];

export function ProjectWizard() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { state, updateProject, addMember, updateMember, removeMember, setPlan } = useAppState();
  const { project } = state;

  const projectForm = useForm({
    resolver: zodResolver(projectStepSchema),
    values: {
      name: project.name,
      description: project.description,
      deadline: project.deadline,
      instructions: project.instructions,
    },
  });

  const teamForm = useForm({
    resolver: zodResolver(teamStepSchema),
    values: {
      teamCharter: project.teamCharter,
      members: project.members,
    },
  });

  const namedMembers = useMemo(
    () => project.members.filter((member) => member.name.trim()),
    [project.members],
  );

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setExtracting(true);
    try {
      const extracted: string[] = [];
      const metas = [...project.uploadedFiles];
      for (const file of Array.from(files)) {
        const text = await extractDocumentText(file);
        extracted.push(`--- ${file.name} ---\n${text}`);
        metas.push({ name: file.name, type: file.type || file.name.split(".").pop() || "", size: file.size });
      }
      const nextInstructions = [project.instructions, ...extracted].filter(Boolean).join("\n\n");
      updateProject({ instructions: nextInstructions, uploadedFiles: metas });
      projectForm.setValue("instructions", nextInstructions);
      toast.success("Document text extracted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the file.");
    } finally {
      setExtracting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function goNext() {
    if (step === 0) {
      const valid = await projectForm.trigger();
      if (!valid) return;
      updateProject(projectForm.getValues());
      setStep(1);
      return;
    }
    if (step === 1) {
      teamForm.setValue("members", project.members);
      teamForm.setValue("teamCharter", project.teamCharter);
      const valid = await teamForm.trigger();
      if (!valid) {
        toast.error("Add at least one complete team member.");
        return;
      }
      updateProject({ teamCharter: teamForm.getValues().teamCharter });
      setStep(2);
    }
  }

  async function generatePlan() {
    if (generating) return;
    const projectValid = await projectForm.trigger();
    teamForm.setValue("members", project.members);
    const teamValid = await teamForm.trigger();
    if (!projectValid || !teamValid) {
      toast.error("Finish the project and team steps before generating a plan.");
      setStep(projectValid ? 1 : 0);
      return;
    }
    setGenerating(true);
    try {
      const payload = {
        project: {
          name: project.name,
          description: project.description,
          deadline: project.deadline,
          instructions: project.instructions,
          teamCharter: project.teamCharter,
          uploadedFiles: project.uploadedFiles,
        },
        members: namedMembers,
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
      setPlan(mapAiPlan(data.plan, namedMembers));
      toast.success("Team plan generated.");
      router.push("/analysis");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate a plan.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map((label, index) => (
          <li
            key={label}
            className={`rounded-lg border px-3 py-2 text-sm ${
              index === step
                ? "border-primary/40 bg-primary/10 text-foreground"
                : index < step
                  ? "bg-background text-foreground"
                  : "bg-muted/40 text-muted-foreground"
            }`}
          >
            <span className="text-xs font-medium">Step {index + 1}</span>
            <p className="font-medium">{label}</p>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Project information</CardTitle>
            <CardDescription>
              Capture the assignment so the model can identify deliverables instead of guessing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                value={project.name}
                onChange={(event) => {
                  updateProject({ name: event.target.value });
                  projectForm.setValue("name", event.target.value, { shouldValidate: true });
                }}
              />
              {projectForm.formState.errors.name ? (
                <p className="text-sm text-destructive">{projectForm.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Project description</Label>
              <Textarea
                id="description"
                rows={4}
                value={project.description}
                onChange={(event) => {
                  updateProject({ description: event.target.value });
                  projectForm.setValue("description", event.target.value, { shouldValidate: true });
                }}
              />
              {projectForm.formState.errors.description ? (
                <p className="text-sm text-destructive">
                  {projectForm.formState.errors.description.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Project deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={project.deadline}
                onChange={(event) => {
                  updateProject({ deadline: event.target.value });
                  projectForm.setValue("deadline", event.target.value, { shouldValidate: true });
                }}
              />
              {projectForm.formState.errors.deadline ? (
                <p className="text-sm text-destructive">{projectForm.formState.errors.deadline.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">Assignment instructions</Label>
              <Textarea
                id="instructions"
                rows={10}
                placeholder="Paste the assignment brief here, or upload a document."
                value={project.instructions}
                onChange={(event) => {
                  updateProject({ instructions: event.target.value });
                  projectForm.setValue("instructions", event.target.value, { shouldValidate: true });
                }}
              />
              {projectForm.formState.errors.instructions ? (
                <p className="text-sm text-destructive">
                  {projectForm.formState.errors.instructions.message}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-dashed p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Upload PDF, DOCX, or TXT</p>
                  <p className="text-sm text-muted-foreground">
                    Extracted text is appended to the instructions field.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInput.current?.click()}
                  disabled={extracting}
                >
                  {extracting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Upload file
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  multiple
                  onChange={(event) => handleFiles(event.target.files)}
                />
              </div>
              {project.uploadedFiles.length ? (
                <ul className="mt-3 space-y-2">
                  {project.uploadedFiles.map((file) => (
                    <li key={`${file.name}-${file.size}`} className="flex items-center gap-2 text-sm">
                      <FileText className="size-4 text-muted-foreground" />
                      <span>{file.name}</span>
                      <span className="text-muted-foreground">
                        ({Math.max(1, Math.round(file.size / 1024))} KB)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Team information</CardTitle>
            <CardDescription>
              The model uses this roster to recommend owners. Incomplete profiles reduce assignment quality.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="charter">Team charter</Label>
              <Textarea
                id="charter"
                rows={4}
                placeholder="Working agreements, communication norms, or constraints."
                value={project.teamCharter}
                onChange={(event) => updateProject({ teamCharter: event.target.value })}
              />
            </div>
            {project.members.map((member, index) => (
              <div key={member.id} className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Member {index + 1}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember(member.id)}
                    disabled={project.members.length === 1}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${member.id}`}>Name</Label>
                    <Input
                      id={`name-${member.id}`}
                      value={member.name}
                      onChange={(event) => updateMember(member.id, { name: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`hours-${member.id}`}>Weekly availability (hours)</Label>
                    <Input
                      id={`hours-${member.id}`}
                      type="number"
                      min={1}
                      max={80}
                      value={member.weeklyHours}
                      onChange={(event) =>
                        updateMember(member.id, { weeklyHours: Number(event.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`skills-${member.id}`}>Strengths and skills</Label>
                    <Textarea
                      id={`skills-${member.id}`}
                      rows={2}
                      value={member.skills}
                      onChange={(event) => updateMember(member.id, { skills: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`interests-${member.id}`}>Preferred tasks or interests</Label>
                    <Textarea
                      id={`interests-${member.id}`}
                      rows={2}
                      value={member.interests}
                      onChange={(event) => updateMember(member.id, { interests: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`notes-${member.id}`}>Additional notes (optional)</Label>
                    <Textarea
                      id={`notes-${member.id}`}
                      rows={2}
                      value={member.notes}
                      onChange={(event) => updateMember(member.id, { notes: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
            {teamForm.formState.errors.members ? (
              <p className="text-sm text-destructive">
                {teamForm.formState.errors.members.message as string}
              </p>
            ) : null}
            <Button type="button" variant="outline" onClick={addMember}>
              <Plus className="size-4" />
              Add team member
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Generate AI plan</CardTitle>
            <CardDescription>
              Confirm the summary, then generate structured assignments. Nothing is sent to the
              model until you click the button.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <SummaryItem label="Project" value={project.name || "Untitled"} />
              <SummaryItem label="Deadline" value={project.deadline || "Not set"} />
              <SummaryItem label="Team size" value={String(namedMembers.length)} />
              <SummaryItem
                label="Uploaded files"
                value={
                  project.uploadedFiles.length
                    ? project.uploadedFiles.map((file) => file.name).join(", ")
                    : "None"
                }
              />
            </div>
            <div>
              <p className="text-sm font-medium">Description</p>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                {project.description || "None provided"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Team</p>
              <ul className="mt-2 space-y-2 text-sm">
                {namedMembers.map((member) => (
                  <li key={member.id} className="rounded-lg border p-3">
                    <span className="font-medium">{member.name}</span>
                    <span className="text-muted-foreground"> · {member.weeklyHours} hrs/week</span>
                    <p className="mt-1 text-muted-foreground">{member.skills || "Skills not listed"}</p>
                  </li>
                ))}
              </ul>
            </div>
            <Button size="lg" className="w-full sm:w-auto" onClick={generatePlan} disabled={generating}>
              {generating ? <Loader2 className="size-4 animate-spin" /> : null}
              Generate My Team Plan
            </Button>
            {generating ? (
              <div className="rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm text-foreground">
                Analyzing the assignment, mapping deliverables, and balancing workload. This usually
                takes a few seconds.
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0 || generating}>
          Back
        </Button>
        {step < 2 ? (
          <Button onClick={goNext} disabled={extracting}>
            Continue
          </Button>
        ) : (
          <Button variant="outline" onClick={() => router.push("/analysis")} disabled={generating || !state.plan}>
            View last plan
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

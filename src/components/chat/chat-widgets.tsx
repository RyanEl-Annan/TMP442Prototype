"use client";

import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, FileText, Loader2, Share2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PriorityBadge } from "@/components/priority-badge";
import { useAppState } from "@/context/app-state";
import { extractDocumentText } from "@/lib/extract-text";
import type { ChatWidget } from "@/lib/types";

type WidgetProps = {
  widget: ChatWidget;
  disabled: boolean;
  /** Sends the user's answer back into the conversation. */
  onAnswer: (text: string) => void;
  /** True while a plan is being generated. */
  busy: boolean;
  onGenerate: () => void;
};

export function ChatWidgetView(props: WidgetProps) {
  switch (props.widget.type) {
    case "single_choice":
      return <SingleChoice {...props} />;
    case "multi_choice":
      return <MultiChoice {...props} />;
    case "date":
      return <DateAnswer {...props} />;
    case "number":
      return <NumberAnswer {...props} />;
    case "member_form":
      return <MemberForm {...props} />;
    case "file_upload":
      return <FileUpload {...props} />;
    case "generate_plan":
      return <GeneratePlan {...props} />;
    case "share_plan":
    case "plan_preview":
      return <SharePlan {...props} />;
    default:
      return null;
  }
}

function WidgetFrame({ question, children }: { question: string; children: ReactNode }) {
  return (
    <div className="mt-2 space-y-3 rounded-xl border bg-background/60 p-3">
      {question ? <p className="text-sm font-medium">{question}</p> : null}
      {children}
    </div>
  );
}

function SingleChoice({ widget, disabled, onAnswer }: WidgetProps) {
  const [other, setOther] = useState("");
  return (
    <WidgetFrame question={widget.question}>
      <div className="flex flex-wrap gap-2">
        {widget.options.map((option) => (
          <Button
            key={option}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onAnswer(option)}
          >
            {option}
          </Button>
        ))}
      </div>
      {widget.allowOther && !disabled ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (other.trim()) onAnswer(other.trim());
          }}
        >
          <Input
            value={other}
            onChange={(event) => setOther(event.target.value)}
            placeholder="Something else..."
          />
          <Button type="submit" size="sm" disabled={!other.trim()}>
            Send
          </Button>
        </form>
      ) : null}
    </WidgetFrame>
  );
}

function MultiChoice({ widget, disabled, onAnswer }: WidgetProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const toggle = (option: string) =>
    setPicked((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    );
  const answer = [...picked, ...(other.trim() ? [other.trim()] : [])];
  return (
    <WidgetFrame question={widget.question}>
      <div className="flex flex-wrap gap-2">
        {widget.options.map((option) => {
          const active = picked.includes(option);
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              disabled={disabled}
              aria-pressed={active}
              onClick={() => toggle(option)}
            >
              {active ? <Check className="size-3.5" /> : null}
              {option}
            </Button>
          );
        })}
      </div>
      {widget.allowOther && !disabled ? (
        <Input
          value={other}
          onChange={(event) => setOther(event.target.value)}
          placeholder="Add your own..."
        />
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={disabled || !answer.length}
        onClick={() => onAnswer(answer.join(", "))}
      >
        Confirm
      </Button>
    </WidgetFrame>
  );
}

function DateAnswer({ widget, disabled, onAnswer }: WidgetProps) {
  const [value, setValue] = useState("");
  return (
    <WidgetFrame question={widget.question}>
      <div className="flex gap-2">
        <Input
          type="date"
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="button" size="sm" disabled={disabled || !value} onClick={() => onAnswer(value)}>
          Confirm
        </Button>
      </div>
    </WidgetFrame>
  );
}

function NumberAnswer({ widget, disabled, onAnswer }: WidgetProps) {
  const [value, setValue] = useState("");
  const min = widget.min ?? 0;
  const max = widget.max ?? 1000;
  const valid = value !== "" && Number(value) >= min && Number(value) <= max;
  return (
    <WidgetFrame question={widget.question}>
      <div className="flex gap-2">
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="button" size="sm" disabled={disabled || !valid} onClick={() => onAnswer(value)}>
          Confirm
        </Button>
      </div>
    </WidgetFrame>
  );
}

function MemberForm({ widget, disabled, onAnswer }: WidgetProps) {
  const { updateProject, state } = useAppState();
  const [name, setName] = useState("");
  const [hours, setHours] = useState("8");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const valid = name.trim() && skills.trim() && Number(hours) >= 1 && Number(hours) <= 80;

  function submit() {
    if (!valid) return;
    const member = {
      id: crypto.randomUUID(),
      name: name.trim(),
      skills: skills.trim(),
      interests: interests.trim() || "No stated preference",
      weeklyHours: Number(hours),
      notes: "",
    };
    const existing = state.project.members.filter((item) => item.name.trim());
    updateProject({ members: [...existing, member] });
    onAnswer(`Added ${member.name}: ${member.weeklyHours} hrs/week, skills: ${member.skills}.`);
  }

  return (
    <WidgetFrame question={widget.question || "Add a teammate"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cw-name">Name</Label>
          <Input
            id="cw-name"
            value={name}
            disabled={disabled}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cw-hours">Weekly hours</Label>
          <Input
            id="cw-hours"
            type="number"
            min={1}
            max={80}
            value={hours}
            disabled={disabled}
            onChange={(event) => setHours(event.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cw-skills">Strengths and skills</Label>
          <Textarea
            id="cw-skills"
            rows={2}
            value={skills}
            disabled={disabled}
            onChange={(event) => setSkills(event.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cw-interests">Preferred tasks (optional)</Label>
          <Textarea
            id="cw-interests"
            rows={2}
            value={interests}
            disabled={disabled}
            onChange={(event) => setInterests(event.target.value)}
          />
        </div>
      </div>
      <Button type="button" size="sm" disabled={disabled || !valid} onClick={submit}>
        Add teammate
      </Button>
    </WidgetFrame>
  );
}

function FileUpload({ widget, disabled, onAnswer }: WidgetProps) {
  const { state, updateProject } = useAppState();
  const input = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setExtracting(true);
    try {
      const list = Array.from(files);
      const extracted: string[] = [];
      const metas = [...state.project.uploadedFiles];
      for (const file of list) {
        extracted.push(`--- ${file.name} ---\n${await extractDocumentText(file)}`);
        metas.push({
          name: file.name,
          type: file.type || file.name.split(".").pop() || "",
          size: file.size,
        });
      }
      updateProject({
        instructions: [state.project.instructions, ...extracted].filter(Boolean).join("\n\n"),
        uploadedFiles: metas,
      });
      onAnswer(`Uploaded ${list.map((file) => file.name).join(", ")}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the file.");
    } finally {
      setExtracting(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <WidgetFrame question={widget.question || "Upload the assignment (PDF, DOCX, or TXT)"}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || extracting}
        onClick={() => input.current?.click()}
      >
        {extracting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Choose file
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(event) => handleFiles(event.target.files)}
      />
      {state.project.uploadedFiles.length ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {state.project.uploadedFiles.map((file) => (
            <li key={`${file.name}-${file.size}`} className="flex items-center gap-2">
              <FileText className="size-4" />
              {file.name}
            </li>
          ))}
        </ul>
      ) : null}
    </WidgetFrame>
  );
}

function GeneratePlan({ widget, disabled, busy, onGenerate }: WidgetProps) {
  return (
    <WidgetFrame question={widget.question || "Ready to build the task plan?"}>
      <Button type="button" size="sm" disabled={disabled || busy} onClick={onGenerate}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Generate team plan
      </Button>
    </WidgetFrame>
  );
}

function SharePlan({ widget, disabled, onAnswer }: WidgetProps) {
  const { state, sharePlan } = useAppState();
  const plan = state.pendingPlan ?? state.plan;
  if (!plan) return null;

  return (
    <WidgetFrame question={widget.question}>
      <ul className="max-h-72 space-y-2 overflow-y-auto">
        {plan.tasks.map((task) => (
          <li
            key={task.id}
            className="flex items-start justify-between gap-3 rounded-lg border p-2.5 text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {task.assignedMemberName} · {task.estimatedHours}h
                {task.dueDate ? ` · due ${task.dueDate}` : ""}
              </p>
            </div>
            <PriorityBadge priority={task.priority} />
          </li>
        ))}
      </ul>
      {state.pendingPlan ? (
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => {
            sharePlan();
            onAnswer("Share this plan to the dashboard.");
          }}
        >
          <Share2 className="size-4" />
          Share to dashboard
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">This plan is on the dashboard.</p>
      )}
    </WidgetFrame>
  );
}

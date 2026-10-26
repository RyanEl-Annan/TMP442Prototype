"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { RotateCcw, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatWidgetView } from "@/components/chat/chat-widgets";
import { useAppState } from "@/context/app-state";
import { upsertMembers } from "@/lib/chat-updates";
import { requestPlan } from "@/lib/plan-client";
import type { ChatResponsePayload, IntakeResponse } from "@/lib/schemas";
import {
  createEmptyMember,
  type ChatMessage,
  type ChatStep,
  type ChatWidget,
  type ProjectDraft,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const NO_WIDGET: ChatWidget = {
  type: "none",
  question: "",
  options: [],
  allowOther: false,
  min: null,
  max: null,
};

const START = "Start a new project";
const ADD_ANOTHER = "Add another teammate";
const DONE_ADDING = "That's everyone";

/** Text this long is treated as a pasted brief or roster rather than a one-line answer. */
const BRIEF_MIN_LENGTH = 250;

function emptyProject(): ProjectDraft {
  return {
    name: "",
    description: "",
    deadline: "",
    instructions: "",
    uploadedFiles: [],
    teamCharter: "",
    members: [createEmptyMember()],
  };
}

function isComplete(project: ProjectDraft) {
  return (
    Boolean(project.name.trim()) &&
    Boolean(project.instructions.trim()) &&
    Boolean(project.deadline) &&
    project.members.some((member) => member.name.trim())
  );
}

const planQuestions = [
  "Who has the most work?",
  "What's due soon?",
  "Is anyone overloaded?",
  "What are the risks?",
];

function widgetOf(type: ChatWidget["type"], question = "", options: string[] = []): ChatWidget {
  return { ...NO_WIDGET, type, question, options };
}

function makeMessage(
  role: ChatMessage["role"],
  content: string,
  widget: ChatWidget | null = null,
  expects?: ChatStep,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    widget: widget && widget.type !== "none" ? widget : null,
    widgetAnswered: false,
    expects,
    createdAt: new Date().toISOString(),
  };
}

function makeGreeting() {
  return makeMessage(
    "assistant",
    "Hi, I'm TeamPilot. I can set up a project in a minute, build the task plan, and answer questions about your team. Where do you want to start?",
    widgetOf("single_choice", "", [START, "Ask about my current project"]),
  );
}

/** The setup question to ask for a given step. */
function promptFor(step: ChatStep): ChatMessage {
  switch (step) {
    case "name":
      return makeMessage("assistant", "What's the project called?", null, "name");
    case "instructions":
      return makeMessage(
        "assistant",
        "Now the assignment. Upload the brief, or just paste the instructions here.",
        widgetOf("file_upload", "Upload a PDF, DOCX, or TXT"),
        "instructions",
      );
    case "deadline":
      return makeMessage(
        "assistant",
        "When is it due?",
        widgetOf("date", "Pick the deadline"),
        "deadline",
      );
    case "member":
      return makeMessage(
        "assistant",
        "Tell me about a teammate. Fill this in, or just describe them in chat (e.g. \"Sam, 6 hrs a week, good at design\").",
        widgetOf("member_form", "Add a teammate"),
        "member",
      );
    case "more_members":
      return makeMessage(
        "assistant",
        "Anyone else on the team?",
        widgetOf("single_choice", "", [ADD_ANOTHER, DONE_ADDING]),
        "more_members",
      );
    case "generate":
      return makeMessage(
        "assistant",
        "That's everything I need. Ready for me to build the plan?",
        widgetOf("generate_plan", "Build the task plan"),
        "generate",
      );
  }
}

/** The first setup step that still has missing information. */
function nextStep(project: ProjectDraft): ChatStep {
  if (!project.name.trim()) return "name";
  if (!project.instructions.trim()) return "instructions";
  if (!project.deadline) return "deadline";
  if (!project.members.some((member) => member.name.trim())) return "member";
  return "more_members";
}

export function ChatView() {
  const {
    ready,
    state,
    addChatMessage,
    answerWidget,
    applyTurn,
    setPendingPlan,
    clearChat,
    updateProject,
    createProject,
  } = useAppState();
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  // Widgets update project state and then send a message; read the latest state when sending.
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!ready) return;
    if (state.chat.length > 0) {
      seeded.current = false;
    } else if (!seeded.current) {
      // Guard against React strict mode running this effect twice before state updates.
      seeded.current = true;
      addChatMessage(makeGreeting());
    }
  }, [ready, state.chat.length, addChatMessage]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.chat.length, thinking]);

  function say(content: string, widget: ChatWidget | null = null) {
    addChatMessage(makeMessage("assistant", content, widget));
  }

  /** Handles the answer to a setup question. Returns true when no model call is needed. */
  function handleSetup(content: string, expects: ChatStep | undefined): boolean {
    const project = stateRef.current.project;
    const isQuestion = content.trim().endsWith("?");

    if (content === START) {
      // Keep an existing project intact: start the next one in its own workspace.
      if (project.name.trim() || project.instructions.trim() || stateRef.current.plan) {
        createProject();
      }
      updateProject({
        name: "",
        description: "",
        deadline: "",
        instructions: "",
        uploadedFiles: [],
        teamCharter: "",
        members: [createEmptyMember()],
      });
      addChatMessage(promptFor("name"));
      return true;
    }

    switch (expects) {
      case "name":
        if (isQuestion) return false;
        updateProject({ name: content });
        say(`Great, "${content}" it is.`);
        addChatMessage(promptFor("instructions"));
        return true;
      case "instructions": {
        if (/^Uploaded /.test(content)) {
          say("Got the document.");
          addChatMessage(promptFor("deadline"));
          return true;
        }
        if (isQuestion || content.length < 20) return false;
        updateProject({
          instructions: content,
          description: content.replace(/\s+/g, " ").slice(0, 200),
        });
        say("Got the instructions.");
        addChatMessage(promptFor("deadline"));
        return true;
      }
      case "deadline":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(content)) return false;
        updateProject({ deadline: content });
        addChatMessage(promptFor(nextStep({ ...project, deadline: content })));
        return true;
      case "member":
        if (!/^Added /.test(content)) return false;
        addChatMessage(promptFor("more_members"));
        return true;
      case "more_members":
        if (content === ADD_ANOTHER) {
          addChatMessage(promptFor("member"));
          return true;
        }
        if (content === DONE_ADDING) {
          addChatMessage(promptFor("generate"));
          return true;
        }
        return false;
      default:
        return false;
    }
  }

  /** Reads a pasted brief and/or roster, fills in everything it finds, and skips answered steps. */
  async function runIntake(content: string, startFresh: boolean) {
    setThinking(true);
    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, today: new Date().toISOString().slice(0, 10) }),
      });
      const data = (await response.json()) as { intake?: IntakeResponse; error?: string };
      if (!response.ok || !data.intake) throw new Error(data.error || "Could not read that text.");
      const found = data.intake;

      if (startFresh) createProject();
      const base = startFresh ? emptyProject() : stateRef.current.project;
      const foundMembers = found.members.filter((member) => member.name.trim());
      const instructions = found.instructions?.trim() || "";
      const merged: ProjectDraft = {
        ...base,
        name: found.projectName?.trim() || base.name,
        description: found.description?.trim() || base.description,
        deadline: /^\d{4}-\d{2}-\d{2}$/.test(found.deadline ?? "") ? (found.deadline as string) : base.deadline,
        instructions: instructions || base.instructions,
        teamCharter: found.teamCharter?.trim() || base.teamCharter,
        members: upsertMembers(
          base.members,
          foundMembers.map((member) => ({ ...member, remove: false })),
        ),
      };
      updateProject(merged);

      const nothingUseful = !found.projectName && !instructions && !foundMembers.length && !found.deadline;
      if (nothingUseful) {
        say("I couldn't find project details in that. Tell me the project name to get started.");
        addChatMessage(promptFor(nextStep(merged)));
        return;
      }

      const got = [
        merged.name.trim() && `project "${merged.name.trim()}"`,
        instructions && "the assignment",
        found.deadline && `a ${merged.deadline} deadline`,
        foundMembers.length &&
          `${foundMembers.length} teammate${foundMembers.length === 1 ? "" : "s"} (${foundMembers.map((member) => member.name).join(", ")})`,
      ].filter(Boolean);
      say(`Got it. I picked up ${got.join(", ")}.`);

      if (isComplete(merged) && instructions) {
        say("That's everything I need, so I'm building the plan now.");
        await generate(undefined, merged);
      } else if (isComplete(merged)) {
        addChatMessage(promptFor("more_members"));
      } else {
        const next = nextStep(merged);
        const missing = {
          name: "the project name",
          instructions: "the assignment details",
          deadline: "a deadline",
          member: "your teammates",
        } as Partial<Record<ChatStep, string>>;
        say(`I still need ${missing[next] ?? "a bit more"}.`);
        addChatMessage(promptFor(next));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message);
      say(`Sorry, I hit a problem reading that: ${message}`);
    } finally {
      setThinking(false);
    }
  }

  async function send(text: string, answeredId?: string) {
    const content = text.trim();
    if (!content || thinking) return;

    const chat = stateRef.current.chat;
    const lastMessage = chat[chat.length - 1];
    const expects = lastMessage?.role === "assistant" ? lastMessage.expects : undefined;

    if (answeredId) answerWidget(answeredId);
    const userMessage = makeMessage("user", content);
    addChatMessage(userMessage);
    setInput("");

    // A long paste at any point in setup (or before a plan exists) is a brief or roster: read it all at once.
    const hasPlanNow = Boolean(stateRef.current.plan ?? stateRef.current.pendingPlan);
    const looksLikeBrief =
      content.length >= BRIEF_MIN_LENGTH &&
      expects !== "generate" &&
      (expects !== undefined || !hasPlanNow);
    if (looksLikeBrief) {
      const existing = stateRef.current.project;
      const startFresh =
        expects === undefined && Boolean(existing.name.trim() || existing.instructions.trim());
      await runIntake(content, startFresh);
      return;
    }

    if (handleSetup(content, expects)) return;

    setThinking(true);
    // Let widget-driven state updates flush before reading the state for the request.
    await new Promise((resolve) => setTimeout(resolve, 30));
    const current = stateRef.current;
    const plan = current.pendingPlan ?? current.plan;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...current.chat, userMessage].map((message) => ({
            role: message.role,
            content: message.content,
          })),
          project: {
            name: current.project.name,
            description: current.project.description,
            deadline: current.project.deadline,
            instructions: current.project.instructions,
            teamCharter: current.project.teamCharter,
            uploadedFiles: current.project.uploadedFiles.map((file) => file.name),
          },
          members: current.project.members
            .filter((member) => member.name.trim())
            .map(({ name, skills, interests, weeklyHours, notes }) => ({
              name,
              skills,
              interests,
              weeklyHours,
              notes,
            })),
          plan: plan && {
            projectSummary: plan.projectSummary,
            tasks: plan.tasks.map((task) => ({
              title: task.title,
              assignedMemberName: task.assignedMemberName,
              priority: task.priority,
              status: task.status,
              dueDate: task.dueDate,
              estimatedHours: task.estimatedHours,
              dependencies: task.dependencies,
            })),
            recommendations: plan.recommendations,
            uncertainties: plan.uncertainties,
          },
          planIsShared: Boolean(current.plan) && !current.pendingPlan,
          today: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = (await response.json()) as { turn?: ChatResponsePayload; error?: string };
      if (!response.ok || !data.turn) throw new Error(data.error || "The assistant is unavailable.");

      applyTurn(data.turn, content);
      addChatMessage(makeMessage("assistant", data.turn.reply, data.turn.widget));

      // Keep the guided setup moving after a side question or a typed teammate description.
      if (expects === "member" && data.turn.memberUpdates.length) {
        addChatMessage(promptFor("more_members"));
      } else if (expects) {
        addChatMessage(promptFor(expects));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message);
      say(`Sorry, I hit a problem: ${message}`);
    } finally {
      setThinking(false);
    }
  }

  async function generate(messageId?: string, override?: ProjectDraft) {
    if (generating) return;
    const project = override ?? stateRef.current.project;
    const members = project.members.filter((member) => member.name.trim());
    if (!project.name.trim() || !project.instructions.trim() || !members.length) {
      toast.error("Add a project name, assignment instructions, and a teammate first.");
      return;
    }
    setGenerating(true);
    try {
      const plan = await requestPlan(project, members);
      setPendingPlan(plan);
      if (messageId) answerWidget(messageId);
      say(
        `Your plan is ready: ${plan.tasks.length} tasks across ${members.length} ${members.length === 1 ? "person" : "people"}. Tell me what to change, or share it when it looks right.`,
        widgetOf("share_plan", "Draft plan"),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate a plan.");
    } finally {
      setGenerating(false);
    }
  }

  if (!ready) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;

  const hasPlan = Boolean(state.pendingPlan ?? state.plan);

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem)] max-w-3xl flex-col sm:h-[calc(100dvh-8.5rem)]">
      <div className="flex items-center justify-between pb-3">
        <p className="text-sm text-muted-foreground">
          {state.pendingPlan
            ? "You have a draft plan that isn't on the dashboard yet."
            : "Chat to set up and manage your project."}
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={thinking || generating}
          onClick={() => {
            if (window.confirm("Clear this conversation? Your project and dashboard stay as they are.")) {
              clearChat();
            }
          }}
        >
          <RotateCcw className="size-3.5" />
          New chat
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border bg-muted/20 p-4" aria-live="polite">
        {state.chat.map((message, index) => {
          const isLast = index === state.chat.length - 1;
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-6",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card",
                )}
              >
                {message.role === "assistant" ? (
                  <Sparkles className="mb-1 size-3.5 text-primary" />
                ) : null}
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.widget ? (
                  <ChatWidgetView
                    widget={message.widget}
                    // Only the newest widget is live, except share_plan which tracks the draft itself.
                    disabled={
                      message.widgetAnswered ||
                      thinking ||
                      (!isLast && message.widget.type !== "share_plan")
                    }
                    busy={generating}
                    onAnswer={(text) => send(text, message.id)}
                    onGenerate={() => generate(message.id)}
                  />
                ) : null}
              </div>
            </motion.div>
          );
        })}
        <AnimatePresence>
          {thinking ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 pl-1"
              aria-label="Assistant is thinking"
            >
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="size-2 rounded-full bg-primary"
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15 }}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div ref={bottom} />
      </div>

      {hasPlan ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {planQuestions.map((question) => (
            <Button
              key={question}
              type="button"
              variant="outline"
              size="sm"
              disabled={thinking}
              onClick={() => void send(question)}
            >
              {question}
            </Button>
          ))}
        </div>
      ) : null}

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <Textarea
          rows={2}
          value={input}
          placeholder="Type a message, paste assignment text, or ask a question..."
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
        />
        <Button type="submit" size="icon-lg" disabled={thinking || !input.trim()}>
          <SendHorizontal className="size-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}

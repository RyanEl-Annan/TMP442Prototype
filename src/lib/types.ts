export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export type UploadedFileMeta = {
  name: string;
  type: string;
  size: number;
};

export type TeamMember = {
  id: string;
  name: string;
  skills: string;
  interests: string;
  weeklyHours: number;
  notes: string;
};

export type ProjectDraft = {
  name: string;
  description: string;
  deadline: string;
  instructions: string;
  uploadedFiles: UploadedFileMeta[];
  teamCharter: string;
  members: TeamMember[];
};

export type PlanTask = {
  id: string;
  title: string;
  description: string;
  assignedMemberId: string | null;
  assignedMemberName: string;
  priority: TaskPriority;
  dueDate: string | null;
  estimatedHours: number;
  status: TaskStatus;
  reasoning: string;
  dependencies: string[];
};

export type AIPlan = {
  projectSummary: string;
  deliverables: string[];
  tasks: PlanTask[];
  recommendations: string[];
  uncertainties: string[];
  generatedAt: string;
};

export type MeetingAnalysis = {
  summary: string;
  participation: string;
  roleClarity: string;
  accountability: string;
  communicationIssues: string[];
  unresolvedDecisions: string[];
  observations: string[];
  interpretations: string[];
  recommendations: string[];
  analyzedAt: string;
};

export type ChatWidgetType =
  | "none"
  | "single_choice"
  | "multi_choice"
  | "date"
  | "number"
  | "member_form"
  | "file_upload"
  | "generate_plan"
  | "share_plan"
  | "plan_preview";

export type ChatWidget = {
  type: ChatWidgetType;
  question: string;
  options: string[];
  allowOther: boolean;
  min: number | null;
  max: number | null;
};

/** Which setup question the assistant is waiting on, so typed replies can be routed without the model. */
export type ChatStep = "name" | "instructions" | "deadline" | "member" | "more_members" | "generate";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  widget: ChatWidget | null;
  widgetAnswered: boolean;
  expects?: ChatStep;
  createdAt: string;
};

export type AppState = {
  project: ProjectDraft;
  /** The plan shown on the dashboard. */
  plan: AIPlan | null;
  /** A plan generated or edited in the assistant that has not been shared yet. */
  pendingPlan: AIPlan | null;
  meetingAnalysis: MeetingAnalysis | null;
  chat: ChatMessage[];
};

export type Workspace = AppState & { id: string; createdAt: string };

export type Store = {
  workspaces: Workspace[];
  activeId: string;
};

export function createWorkspace(): Workspace {
  return {
    ...createInitialState(),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

/** Deterministic store for the first render; randomness is not allowed while a page renders. */
export function createPlaceholderStore(): Store {
  const workspace: Workspace = { ...createInitialState(), id: "initial", createdAt: "" };
  return { workspaces: [workspace], activeId: workspace.id };
}

export function createInitialStore(): Store {
  const first = createWorkspace();
  return { workspaces: [first], activeId: first.id };
}

export function createEmptyMember(id = "member-draft"): TeamMember {
  return {
    id,
    name: "",
    skills: "",
    interests: "",
    weeklyHours: 8,
    notes: "",
  };
}

export function createEmptyProject(): ProjectDraft {
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

export function createInitialState(): AppState {
  return {
    project: createEmptyProject(),
    plan: null,
    pendingPlan: null,
    meetingAnalysis: null,
    chat: [],
  };
}

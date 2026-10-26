import { z } from "zod";

export const teamMemberFormSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  skills: z.string().min(1, "Add at least one strength or skill"),
  interests: z.string().min(1, "Add preferred tasks or interests"),
  weeklyHours: z.coerce
    .number()
    .min(1, "Availability must be at least 1 hour")
    .max(80, "Availability cannot exceed 80 hours"),
  notes: z.string().optional().default(""),
});

export const projectStepSchema = z.object({
  name: z.string().min(2, "Enter a project name"),
  description: z.string().min(10, "Describe the project in a few sentences"),
  deadline: z.string().min(1, "Choose a project deadline"),
  instructions: z
    .string()
    .min(20, "Paste assignment instructions or upload a document"),
});

export const teamStepSchema = z.object({
  teamCharter: z.string().optional().default(""),
  members: z
    .array(teamMemberFormSchema)
    .min(1, "Add at least one team member"),
});

export const generatePlanRequestSchema = z.object({
  today: z.string().optional(),
  project: z.object({
    name: z.string().min(1),
    description: z.string(),
    deadline: z.string(),
    instructions: z.string().min(1),
    teamCharter: z.string(),
    uploadedFiles: z.array(
      z.object({
        name: z.string(),
        type: z.string(),
        size: z.number(),
      }),
    ),
  }),
  members: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        skills: z.string(),
        interests: z.string(),
        weeklyHours: z.number(),
        notes: z.string(),
      }),
    )
    .min(1),
});

export const aiTaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  assignedMemberName: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueDate: z.string().nullable(),
  estimatedHours: z.number(),
  reasoning: z.string(),
  dependencies: z.array(z.string()),
});

export const aiPlanSchema = z.object({
  projectSummary: z.string(),
  deliverables: z.array(z.string()),
  tasks: z.array(aiTaskSchema),
  recommendations: z.array(z.string()),
  uncertainties: z.array(z.string()),
});

export const meetingAnalysisRequestSchema = z.object({
  transcript: z.string().min(40, "Paste a longer meeting transcript"),
  projectName: z.string().optional().default(""),
  memberNames: z.array(z.string()),
});

export const meetingAnalysisSchema = z.object({
  summary: z.string(),
  participation: z.string(),
  roleClarity: z.string(),
  accountability: z.string(),
  communicationIssues: z.array(z.string()),
  unresolvedDecisions: z.array(z.string()),
  observations: z.array(z.string()),
  interpretations: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const priorityEnum = z.enum(["low", "medium", "high", "critical"]);
const statusEnum = z.enum(["todo", "in_progress", "blocked", "done"]);

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  project: z.object({
    name: z.string(),
    description: z.string(),
    deadline: z.string(),
    instructions: z.string(),
    teamCharter: z.string(),
    uploadedFiles: z.array(z.string()),
  }),
  members: z.array(
    z.object({
      name: z.string(),
      skills: z.string(),
      interests: z.string(),
      weeklyHours: z.number(),
      notes: z.string(),
    }),
  ),
  plan: z
    .object({
      projectSummary: z.string(),
      tasks: z.array(
        z.object({
          title: z.string(),
          assignedMemberName: z.string(),
          priority: priorityEnum,
          status: statusEnum,
          dueDate: z.string().nullable(),
          estimatedHours: z.number(),
          dependencies: z.array(z.string()),
        }),
      ),
      recommendations: z.array(z.string()),
      uncertainties: z.array(z.string()),
    })
    .nullable(),
  planIsShared: z.boolean(),
  today: z.string(),
});

// Every field is required (nullable where optional) so it works with OpenAI strict structured output.
export const chatResponseSchema = z.object({
  reply: z.string(),
  widget: z.object({
    type: z.enum([
      "none",
      "single_choice",
      "multi_choice",
      "date",
      "number",
      "member_form",
      "file_upload",
      "generate_plan",
      "share_plan",
    ]),
    question: z.string(),
    options: z.array(z.string()),
    allowOther: z.boolean(),
    min: z.number().nullable(),
    max: z.number().nullable(),
  }),
  projectUpdates: z.object({
    name: z.string().nullable(),
    description: z.string().nullable(),
    deadline: z.string().nullable(),
    teamCharter: z.string().nullable(),
    useLastMessageAsInstructions: z.boolean(),
  }),
  memberUpdates: z.array(
    z.object({
      name: z.string(),
      skills: z.string().nullable(),
      interests: z.string().nullable(),
      weeklyHours: z.number().nullable(),
      notes: z.string().nullable(),
      remove: z.boolean(),
    }),
  ),
  taskUpdates: z.array(
    z.object({
      taskTitle: z.string(),
      assignedMemberName: z.string().nullable(),
      status: statusEnum.nullable(),
      priority: priorityEnum.nullable(),
      dueDate: z.string().nullable(),
      estimatedHours: z.number().nullable(),
    }),
  ),
});

export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponsePayload = z.infer<typeof chatResponseSchema>;
export type AIPlanPayload = z.infer<typeof aiPlanSchema>;
export type MeetingAnalysisPayload = z.infer<typeof meetingAnalysisSchema>;

export const intakeRequestSchema = z.object({
  text: z.string().min(1).max(60_000),
  today: z.string(),
});

// All fields are required (nullable where optional) for OpenAI strict structured output.
export const intakeResponseSchema = z.object({
  projectName: z.string().nullable(),
  description: z.string().nullable(),
  deadline: z.string().nullable(),
  instructions: z.string().nullable(),
  teamCharter: z.string().nullable(),
  members: z.array(
    z.object({
      name: z.string(),
      skills: z.string().nullable(),
      interests: z.string().nullable(),
      weeklyHours: z.number().nullable(),
      notes: z.string().nullable(),
    }),
  ),
});

export type IntakeResponse = z.infer<typeof intakeResponseSchema>;

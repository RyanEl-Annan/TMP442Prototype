import {
  AlertTriangle,
  ClipboardCheck,
  FileUp,
  Printer,
  Sparkles,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const steps = [
  {
    icon: FileUp,
    title: "Enter project information",
    body: "Add a name, description, deadline, and assignment instructions. You can paste the brief or upload a PDF, DOCX, or TXT file.",
  },
  {
    icon: Users,
    title: "Add team members",
    body: "Record each person’s skills, preferred work, weekly availability, and optional notes. Include a team charter if you have one.",
  },
  {
    icon: Sparkles,
    title: "Generate an AI task plan",
    body: "Review the summary, then choose Generate My Team Plan. TeamPilot sends the data to a server-side OpenAI route and returns structured assignments.",
  },
  {
    icon: ClipboardCheck,
    title: "Review and adjust",
    body: "Edit owners, change status, mark tasks complete, and add or remove work so the plan matches your team’s judgment.",
  },
  {
    icon: Users,
    title: "Optionally analyze a meeting",
    body: "Paste a transcript on the AI Analysis page to review participation, accountability, and unresolved decisions.",
  },
  {
    icon: Printer,
    title: "Export the action plan",
    body: "Use Export report to open a printable view and save it as a PDF from your browser.",
  },
];

export function HowToUse() {
  return (
    <div className="space-y-6">
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-xs font-medium text-primary">
              {index + 1}
            </div>
            <div>
              <div className="flex items-center gap-2 font-medium">
                <step.icon className="size-4 text-primary" />
                {step.title}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Alert>
        <AlertTriangle />
        <AlertTitle>AI recommendations are suggestions</AlertTitle>
        <AlertDescription>
          TeamPilot AI can miss context, over-weight incomplete inputs, or propose uneven
          assignments. The team leader should review every recommendation before sharing it
          with the group.
        </AlertDescription>
      </Alert>
    </div>
  );
}

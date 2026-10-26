import { Badge } from "@/components/ui/badge";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const priorityClass: Record<TaskPriority, string> = {
  low: "border-border bg-muted text-muted-foreground",
  medium: "border-foreground/20 bg-secondary text-foreground",
  high: "border-primary/40 bg-primary/10 text-primary",
  critical: "border-primary bg-primary text-primary-foreground",
};

const statusClass: Record<TaskStatus, string> = {
  todo: "border-border bg-background text-muted-foreground",
  in_progress: "border-foreground/30 bg-secondary text-foreground",
  blocked: "border-primary/50 bg-primary/10 text-primary",
  done: "border-foreground bg-foreground text-background",
};

const statusLabel: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={cn("capitalize", priorityClass[priority])}>
      {priority}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn(statusClass[status])}>
      {statusLabel[status]}
    </Badge>
  );
}

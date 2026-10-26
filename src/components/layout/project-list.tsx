"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import { useAppState } from "@/context/app-state";
import { cn } from "@/lib/utils";

export function ProjectList({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { projects, activeProjectId, switchProject, createProject, deleteProject } = useAppState();

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-sidebar-border">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <p className="text-xs font-medium tracking-wide text-sidebar-foreground/60 uppercase">
          Projects
        </p>
        <button
          type="button"
          onClick={() => {
            createProject();
            router.push("/assistant");
            onNavigate();
          }}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Plus className="size-3.5" />
          New
        </button>
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        <AnimatePresence initial={false}>
          {projects.map((project) => {
            const active = project.id === activeProjectId;
            const percent = project.taskCount
              ? Math.round((project.doneCount / project.taskCount) * 100)
              : 0;
            return (
              <motion.li
                key={project.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded-lg transition-colors",
                    active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      switchProject(project.id);
                      onNavigate();
                    }}
                    className="min-w-0 flex-1 px-3 py-2 text-left"
                    aria-current={active ? "true" : undefined}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-sidebar-foreground">
                      <FolderKanban
                        className={cn("size-3.5 shrink-0", active ? "text-primary" : "opacity-60")}
                      />
                      <span className="truncate">{project.name}</span>
                      {project.hasDraft ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" title="Unshared draft" />
                      ) : null}
                    </span>
                    {project.taskCount ? (
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-sidebar-foreground/15">
                        <motion.span
                          className="block h-full rounded-full bg-primary"
                          initial={false}
                          animate={{ width: `${percent}%` }}
                        />
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${project.name}`}
                    onClick={() => {
                      if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                        deleteProject(project.id);
                      }
                    }}
                    className="mr-1 rounded-md p-1.5 text-sidebar-foreground/50 opacity-100 transition hover:bg-sidebar-border hover:text-primary lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}

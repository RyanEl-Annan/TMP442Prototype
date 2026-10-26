"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyAssistantTurn } from "@/lib/chat-updates";
import type { ChatResponsePayload } from "@/lib/schemas";
import { loadStore, saveStore, clearStore } from "@/lib/storage";
import {
  createEmptyMember,
  createInitialStore,
  createPlaceholderStore,
  createWorkspace,
  type AIPlan,
  type AppState,
  type ChatMessage,
  type MeetingAnalysis,
  type PlanTask,
  type Store,
  type ProjectDraft,
  type TaskStatus,
} from "@/lib/types";

export type ProjectSummary = {
  id: string;
  name: string;
  taskCount: number;
  doneCount: number;
  hasDraft: boolean;
};

type AppStateContextValue = {
  ready: boolean;
  projects: ProjectSummary[];
  activeProjectId: string;
  createProject: () => void;
  switchProject: (id: string) => void;
  deleteProject: (id: string) => void;
  state: AppState;
  updateProject: (patch: Partial<ProjectDraft>) => void;
  setProject: (project: ProjectDraft) => void;
  addMember: () => void;
  updateMember: (id: string, patch: Partial<ProjectDraft["members"][number]>) => void;
  removeMember: (id: string) => void;
  setPlan: (plan: AIPlan | null) => void;
  updateTask: (id: string, patch: Partial<PlanTask>) => void;
  addTask: (task?: Partial<PlanTask>) => void;
  removeTask: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  setMeetingAnalysis: (analysis: MeetingAnalysis | null) => void;
  resetAll: () => void;
  addChatMessage: (message: ChatMessage) => void;
  answerWidget: (messageId: string) => void;
  applyTurn: (turn: ChatResponsePayload, lastUserMessage: string) => void;
  setPendingPlan: (plan: AIPlan | null) => void;
  sharePlan: () => void;
  clearChat: () => void;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(createPlaceholderStore);
  const [ready, setReady] = useState(false);

  // Everything below edits the active project; the store holds all of them.
  const state = useMemo(
    () => store.workspaces.find((item) => item.id === store.activeId) ?? store.workspaces[0],
    [store],
  );

  const setState = useCallback((updater: (current: AppState) => AppState) => {
    setStore((current) => ({
      ...current,
      workspaces: current.workspaces.map((item) =>
        item.id === current.activeId ? { ...item, ...updater(item) } : item,
      ),
    }));
  }, []);

  useEffect(() => {
    const stored = loadStore();
    const frame = window.requestAnimationFrame(() => {
      setStore(stored);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveStore(store);
  }, [ready, store]);

  const projects = useMemo<ProjectSummary[]>(
    () =>
      store.workspaces.map((item) => {
        const tasks = (item.pendingPlan ?? item.plan)?.tasks ?? [];
        return {
          id: item.id,
          name: item.project.name.trim() || "Untitled project",
          taskCount: tasks.length,
          doneCount: tasks.filter((task) => task.status === "done").length,
          hasDraft: Boolean(item.pendingPlan),
        };
      }),
    [store.workspaces],
  );

  const createProject = useCallback(() => {
    setStore((current) => {
      const next = createWorkspace();
      return { workspaces: [...current.workspaces, next], activeId: next.id };
    });
  }, []);

  const switchProject = useCallback((id: string) => {
    setStore((current) =>
      current.workspaces.some((item) => item.id === id) ? { ...current, activeId: id } : current,
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    setStore((current) => {
      const remaining = current.workspaces.filter((item) => item.id !== id);
      if (!remaining.length) return createInitialStore();
      return {
        workspaces: remaining,
        activeId: current.activeId === id ? remaining[0].id : current.activeId,
      };
    });
  }, []);

  const updateProject = useCallback((patch: Partial<ProjectDraft>) => {
    setState((current) => ({
      ...current,
      project: { ...current.project, ...patch },
    }));
  }, [setState]);

  const setProject = useCallback((project: ProjectDraft) => {
    setState((current) => ({ ...current, project }));
  }, [setState]);

  const addMember = useCallback(() => {
    setState((current) => ({
      ...current,
      project: {
        ...current.project,
        members: [...current.project.members, createEmptyMember(crypto.randomUUID())],
      },
    }));
  }, [setState]);

  const updateMember = useCallback(
    (id: string, patch: Partial<ProjectDraft["members"][number]>) => {
      setState((current) => ({
        ...current,
        project: {
          ...current.project,
          members: current.project.members.map((member) =>
            member.id === id ? { ...member, ...patch } : member,
          ),
        },
      }));
    },
    [setState],
  );

  const removeMember = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      project: {
        ...current.project,
        members:
          current.project.members.length <= 1
            ? current.project.members
            : current.project.members.filter((member) => member.id !== id),
      },
    }));
  }, [setState]);

  const setPlan = useCallback((plan: AIPlan | null) => {
    setState((current) => ({ ...current, plan }));
  }, [setState]);

  const updateTask = useCallback((id: string, patch: Partial<PlanTask>) => {
    setState((current) => {
      if (!current.plan) return current;
      return {
        ...current,
        plan: {
          ...current.plan,
          tasks: current.plan.tasks.map((task) =>
            task.id === id ? { ...task, ...patch } : task,
          ),
        },
      };
    });
  }, [setState]);

  const addTask = useCallback((task?: Partial<PlanTask>) => {
    setState((current) => {
      if (!current.plan) return current;
      const next: PlanTask = {
        id: crypto.randomUUID(),
        title: task?.title ?? "New task",
        description: task?.description ?? "",
        assignedMemberId: task?.assignedMemberId ?? null,
        assignedMemberName: task?.assignedMemberName ?? "Unassigned",
        priority: task?.priority ?? "medium",
        dueDate: task?.dueDate ?? (current.project.deadline || null),
        estimatedHours: task?.estimatedHours ?? 2,
        status: task?.status ?? "todo",
        reasoning: task?.reasoning ?? "Added by the team leader.",
        dependencies: task?.dependencies ?? [],
      };
      return {
        ...current,
        plan: { ...current.plan, tasks: [...current.plan.tasks, next] },
      };
    });
  }, [setState]);

  const removeTask = useCallback((id: string) => {
    setState((current) => {
      if (!current.plan) return current;
      return {
        ...current,
        plan: {
          ...current.plan,
          tasks: current.plan.tasks.filter((task) => task.id !== id),
        },
      };
    });
  }, [setState]);

  const setTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setState((current) => {
      if (!current.plan) return current;
      return {
        ...current,
        plan: {
          ...current.plan,
          tasks: current.plan.tasks.map((task) =>
            task.id === id ? { ...task, status } : task,
          ),
        },
      };
    });
  }, [setState]);

  const setMeetingAnalysis = useCallback((analysis: MeetingAnalysis | null) => {
    setState((current) => ({ ...current, meetingAnalysis: analysis }));
  }, [setState]);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setState((current) => ({ ...current, chat: [...current.chat, message] }));
  }, [setState]);

  const answerWidget = useCallback((messageId: string) => {
    setState((current) => ({
      ...current,
      chat: current.chat.map((message) =>
        message.id === messageId ? { ...message, widgetAnswered: true } : message,
      ),
    }));
  }, [setState]);

  const applyTurn = useCallback((turn: ChatResponsePayload, lastUserMessage: string) => {
    setState((current) => applyAssistantTurn(current, turn, lastUserMessage));
  }, [setState]);

  const setPendingPlan = useCallback((plan: AIPlan | null) => {
    setState((current) => ({ ...current, pendingPlan: plan }));
  }, [setState]);

  const sharePlan = useCallback(() => {
    setState((current) =>
      current.pendingPlan
        ? { ...current, plan: current.pendingPlan, pendingPlan: null }
        : current,
    );
  }, [setState]);

  const clearChat = useCallback(() => {
    setState((current) => ({ ...current, chat: [], pendingPlan: null }));
  }, [setState]);

  const resetAll = useCallback(() => {
    clearStore();
    setStore(createInitialStore());
  }, []);

  const value = useMemo(
    () => ({
      ready,
      projects,
      activeProjectId: store.activeId,
      createProject,
      switchProject,
      deleteProject,
      state,
      updateProject,
      setProject,
      addMember,
      updateMember,
      removeMember,
      setPlan,
      updateTask,
      addTask,
      removeTask,
      setTaskStatus,
      setMeetingAnalysis,
      resetAll,
      addChatMessage,
      answerWidget,
      applyTurn,
      setPendingPlan,
      sharePlan,
      clearChat,
    }),
    [
      ready,
      projects,
      store.activeId,
      createProject,
      switchProject,
      deleteProject,
      state,
      updateProject,
      setProject,
      addMember,
      updateMember,
      removeMember,
      setPlan,
      updateTask,
      addTask,
      removeTask,
      setTaskStatus,
      setMeetingAnalysis,
      resetAll,
      addChatMessage,
      answerWidget,
      applyTurn,
      setPendingPlan,
      sharePlan,
      clearChat,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}

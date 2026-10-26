import {
  createInitialState,
  createInitialStore,
  type AppState,
  type Store,
  type Workspace,
} from "@/lib/types";

export const STORAGE_KEY = "teampilot-ai-v2";
const LEGACY_KEY = "teampilot-ai-v1";

function normalizeState(parsed: Partial<AppState> | null | undefined): AppState | null {
  if (!parsed?.project) return null;
  const empty = createInitialState();
  return {
    project: {
      ...empty.project,
      ...parsed.project,
      members: parsed.project.members?.length ? parsed.project.members : empty.project.members,
      uploadedFiles: parsed.project.uploadedFiles ?? [],
    },
    plan: parsed.plan ?? null,
    pendingPlan: parsed.pendingPlan ?? null,
    meetingAnalysis: parsed.meetingAnalysis ?? null,
    chat: Array.isArray(parsed.chat)
      ? parsed.chat.filter(
          (message, index, all) => all.findIndex((item) => item.id === message.id) === index,
        )
      : [],
  };
}

export function loadStore(): Store {
  if (typeof window === "undefined") {
    return createInitialStore();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Store>;
      const workspaces = (parsed.workspaces ?? []).flatMap((item): Workspace[] => {
        const state = normalizeState(item);
        if (!state) return [];
        return [
          {
            ...state,
            id: item.id || crypto.randomUUID(),
            createdAt: item.createdAt || new Date().toISOString(),
          },
        ];
      });
      if (workspaces.length) {
        const activeId = workspaces.some((item) => item.id === parsed.activeId)
          ? (parsed.activeId as string)
          : workspaces[0].id;
        return { workspaces, activeId };
      }
    }

    // Carry over the single project saved by the first version of the app.
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const state = normalizeState(JSON.parse(legacy) as Partial<AppState>);
      if (state) {
        const id = crypto.randomUUID();
        return {
          workspaces: [{ ...state, id, createdAt: new Date().toISOString() }],
          activeId: id,
        };
      }
    }
  } catch {
    // fall through to a fresh store
  }
  return createInitialStore();
}

export function saveStore(store: Store) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function clearStore() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_KEY);
}

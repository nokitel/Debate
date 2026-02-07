import { create } from "zustand";
import { persist } from "zustand/middleware";

type ViewMode = "cards" | "tree";

interface UIState {
  /** Whether the login modal is open. */
  isLoginModalOpen: boolean;
  /** Whether the pipeline progress panel is visible. */
  isPipelineVisible: boolean;
  /** Currently selected argument ID (for highlighting). */
  selectedArgumentId: string | null;
  /** Current debate view mode (card list or tree graph). */
  viewMode: ViewMode;

  // Actions
  openLoginModal: () => void;
  closeLoginModal: () => void;
  showPipeline: () => void;
  hidePipeline: () => void;
  selectArgument: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isLoginModalOpen: false,
      isPipelineVisible: false,
      selectedArgumentId: null,
      viewMode: "cards",

      openLoginModal: () => set({ isLoginModalOpen: true }),
      closeLoginModal: () => set({ isLoginModalOpen: false }),
      showPipeline: () => set({ isPipelineVisible: true }),
      hidePipeline: () => set({ isPipelineVisible: false }),
      selectArgument: (id) => set({ selectedArgumentId: id }),
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: "dialectical-ui",
      partialize: (state) => ({ viewMode: state.viewMode }),
    },
  ),
);

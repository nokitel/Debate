import { create } from "zustand";

interface UIState {
  /** Whether the login modal is open. */
  isLoginModalOpen: boolean;
  /** Whether the pipeline progress panel is visible. */
  isPipelineVisible: boolean;
  /** Currently selected argument ID (for highlighting). */
  selectedArgumentId: string | null;

  // Actions
  openLoginModal: () => void;
  closeLoginModal: () => void;
  showPipeline: () => void;
  hidePipeline: () => void;
  selectArgument: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isLoginModalOpen: false,
  isPipelineVisible: false,
  selectedArgumentId: null,

  openLoginModal: () => set({ isLoginModalOpen: true }),
  closeLoginModal: () => set({ isLoginModalOpen: false }),
  showPipeline: () => set({ isPipelineVisible: true }),
  hidePipeline: () => set({ isPipelineVisible: false }),
  selectArgument: (id) => set({ selectedArgumentId: id }),
}));

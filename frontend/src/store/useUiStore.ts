import { create } from "zustand";

type UiState = {
  search: string;
  searchOpen: boolean;
  sidebarCollapsed: boolean;
  setSearch: (search: string) => void;
  setSearchOpen: (searchOpen: boolean) => void;
  setSidebarCollapsed: (sidebarCollapsed: boolean) => void;
  toggleSidebar: () => void;
};

const SIDEBAR_KEY = "bloxdeck.preferences.sidebarCollapsed";
const initialSidebarCollapsed = localStorage.getItem(SIDEBAR_KEY) === "true";

export const useUiStore = create<UiState>((set) => ({
  search: "",
  searchOpen: false,
  sidebarCollapsed: initialSidebarCollapsed,
  setSearch: (search) => set({ search }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSidebarCollapsed: (sidebarCollapsed) => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed));
    set({ sidebarCollapsed });
  },
  toggleSidebar: () =>
    set((state) => {
      const sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed));
      return { sidebarCollapsed };
    }),
}));

import { create } from "zustand";

type UiState = {
  search: string;
  setSearch: (search: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  search: "",
  setSearch: (search) => set({ search }),
}));


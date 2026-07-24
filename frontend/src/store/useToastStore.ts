import { create } from "zustand";

type ToastTone = "default" | "success" | "danger";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastState = {
  items: ToastItem[];
  add: (item: Omit<ToastItem, "id">) => number;
  remove: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  add: (item) => {
    const id = nextId++;
    set((state) => ({ items: [...state.items, { ...item, id }].slice(-4) }));
    return id;
  },
  remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));

export function showToast(
  title: string,
  options: { description?: string; tone?: ToastTone } = {},
) {
  const id = useToastStore.getState().add({
    title,
    description: options.description,
    tone: options.tone ?? "default",
  });
  window.setTimeout(() => useToastStore.getState().remove(id), 3400);
}

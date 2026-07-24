import { Loader2, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { collectionTypes, useCreateCollection } from "@/hooks/api-hooks";
import type { CollectionType } from "@/types";

type CollectionFormProps = {
  onCreated?: () => void;
};

const initialState = {
  name: "",
  type: "PLAY_LATER" as CollectionType,
  description: "",
  color: "#3979e6",
};

export function CollectionForm({ onCreated }: CollectionFormProps) {
  const [form, setForm] = useState(initialState);
  const createCollection = useCreateCollection();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await createCollection.mutateAsync({
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || null,
      color: form.color,
    });

    setForm(initialState);
    onCreated?.();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-xs font-medium text-slate-400">Nome</span>
        <Input
          placeholder="Jogar depois"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          required
        />
      </label>

      <div className="grid grid-cols-[1fr_96px] gap-3">
        <label className="block space-y-2">
          <span className="text-xs font-medium text-slate-400">Tipo</span>
          <select
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({ ...current, type: event.target.value as CollectionType }))
            }
            className="h-10 w-full rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
          >
            {collectionTypes.map((type) => (
              <option key={type.value} value={type.value} className="bg-slate-950">
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-medium text-slate-400">Cor</span>
          <Input
            type="color"
            value={form.color}
            onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
            className="p-1"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-medium text-slate-400">Descrição</span>
        <Textarea
          placeholder="Notas da coleção"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
        />
      </label>

      {createCollection.error ? (
        <div className="rounded-lg border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
          {createCollection.error.message}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={createCollection.isPending}>
        {createCollection.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Criar coleção
      </Button>
    </form>
  );
}

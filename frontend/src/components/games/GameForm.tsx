import { Loader2, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateGame } from "@/hooks/api-hooks";

type GameFormProps = {
  onCreated?: () => void;
};

const initialState = {
  placeId: "",
};

export function GameForm({ onCreated }: GameFormProps) {
  const [form, setForm] = useState(initialState);
  const createGame = useCreateGame();

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await createGame.mutateAsync({
      placeId: form.placeId.trim(),
    });

    setForm(initialState);
    onCreated?.();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-xs font-medium text-slate-400">Place ID</span>
        <Input
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="4924922222"
          value={form.placeId}
          onChange={(event) => updateField("placeId", event.target.value)}
          required
        />
      </label>

      {createGame.error ? (
        <div className="rounded-lg border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
          {createGame.error.message}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={createGame.isPending}>
        {createGame.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Buscar e salvar
      </Button>
    </form>
  );
}

import { Loader2, Play } from "lucide-react";
import { useState } from "react";

import { LaunchConfirmDialog } from "@/components/games/LaunchConfirmDialog";
import { Button } from "@/components/ui/button";
import { useRecordLaunch } from "@/hooks/api-hooks";
import { openRobloxGame } from "@/lib/openRoblox";
import { isLaunchConfirmationEnabled } from "@/lib/preferences";
import type { Game } from "@/types";

type LaunchButtonProps = {
  game: Game;
  size?: "default" | "sm" | "lg";
  className?: string;
};

export function LaunchButton({ game, size = "default", className }: LaunchButtonProps) {
  const recordLaunch = useRecordLaunch();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleLaunch = async () => {
    try {
      await recordLaunch.mutateAsync(game.id);
    } catch (error) {
      console.warn("Launch history was not recorded", error);
    }

    setConfirmOpen(false);
    await openRobloxGame(game.placeId);
  };

  const requestLaunch = () => {
    if (isLaunchConfirmationEnabled()) {
      setConfirmOpen(true);
      return;
    }

    void handleLaunch();
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        className={className}
        onClick={requestLaunch}
        disabled={recordLaunch.isPending}
        title="Smart Launch"
      >
        {recordLaunch.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        Jogar
      </Button>
      <LaunchConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        game={game}
        isLaunching={recordLaunch.isPending}
        onConfirm={handleLaunch}
      />
    </>
  );
}

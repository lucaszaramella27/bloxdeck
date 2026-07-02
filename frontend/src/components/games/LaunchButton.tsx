import { ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRecordLaunch } from "@/hooks/api-hooks";
import { openRobloxGame } from "@/lib/openRoblox";

type LaunchButtonProps = {
  gameId: string;
  placeId: string;
  size?: "default" | "sm" | "lg";
  className?: string;
};

export function LaunchButton({ gameId, placeId, size = "default", className }: LaunchButtonProps) {
  const recordLaunch = useRecordLaunch();

  const handleLaunch = async () => {
    try {
      await recordLaunch.mutateAsync(gameId);
    } catch (error) {
      console.warn("Launch history was not recorded", error);
    }

    await openRobloxGame(placeId);
  };

  return (
    <Button
      type="button"
      size={size}
      className={className}
      onClick={handleLaunch}
      disabled={recordLaunch.isPending}
      title="Abrir no Roblox"
    >
      {recordLaunch.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ExternalLink className="h-4 w-4" />
      )}
      Abrir no Roblox
    </Button>
  );
}


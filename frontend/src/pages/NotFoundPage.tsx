import { Compass } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Rota nao encontrada"
      action={
        <Button asChild>
          <Link to="/">Dashboard</Link>
        </Button>
      }
    />
  );
}


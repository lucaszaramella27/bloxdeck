import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.07]", className)} />;
}

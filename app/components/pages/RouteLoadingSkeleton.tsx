import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/lib/utils";

type RouteLoadingSkeletonProps = {
  fullScreen?: boolean;
  className?: string;
};

const cardKeys = ["one", "two", "three"];

export default function RouteLoadingSkeleton({
  fullScreen = false,
  className,
}: RouteLoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "space-y-6 p-4 lg:p-8",
        fullScreen && "min-h-screen bg-background",
        className,
      )}
    >
      <div className="space-y-3">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cardKeys.map((cardKey) => (
          <div key={cardKey} className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-xl border p-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[95%]" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  );
}

"use client";

import { Skeleton } from "@/app/components/ui/skeleton";

export default function SapfPageLoading() {
  return (
    <div className="space-y-8 p-4 lg:p-8">
      <div className="space-y-3">
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-4 w-104 max-w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-xl border p-5">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-xl border p-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

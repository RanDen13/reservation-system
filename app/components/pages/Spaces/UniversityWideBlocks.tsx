"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  formatSapfDateTime,
  formatSapfTime,
} from "@/app/components/pages/SAPF/sapfSchedule";
import { CalendarX, Clock } from "lucide-react";

export default function UniversityWideBlocks({ blocks }: { blocks: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarX className="h-5 w-5 text-violet-700" />
          University-Wide Blocks
        </CardTitle>
        <CardDescription>
          These blocked dates apply to every venue in the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {blocks.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-5 text-sm text-muted-foreground">
            No university-wide blocks scheduled.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {blocks.map((block) => {
              const schedules = Array.isArray(block.schedules)
                ? block.schedules
                : [];

              return (
                <div
                  key={block.id}
                  className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4"
                >
                  <p className="font-semibold text-violet-950 dark:text-violet-100">
                    {block.title}
                  </p>
                  {block.reason && (
                    <p className="mt-1 text-sm text-violet-800 dark:text-violet-200">
                      {block.reason}
                    </p>
                  )}
                  <div className="mt-3 space-y-1">
                    {schedules.map((schedule: any, index: number) => (
                      <p
                        key={schedule.id || `${schedule.startAt}-${index}`}
                        className="flex items-center gap-2 text-sm text-violet-900 dark:text-violet-100"
                      >
                        <Clock className="h-4 w-4" />
                        {formatSapfDateTime(schedule.startAt)} to{" "}
                        {formatSapfTime(schedule.endAt)}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { format } from "date-fns";
import { CalendarX, Clock } from "lucide-react";

export default function UniversityWideBlocks({
  blocks,
}: {
  blocks: any[];
}) {
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
          <div className="rounded-lg border border-dashed p-5 text-sm text-gray-500">
            No university-wide blocks scheduled.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="rounded-lg border border-violet-200 bg-violet-50 p-4"
              >
                <p className="font-semibold text-violet-950">{block.title}</p>
                {block.reason && (
                  <p className="mt-1 text-sm text-violet-800">
                    {block.reason}
                  </p>
                )}
                <p className="mt-3 flex items-center gap-2 text-sm text-violet-900">
                  <Clock className="h-4 w-4" />
                  {format(new Date(block.startAt), "MMM d, yyyy h:mm a")} to{" "}
                  {format(new Date(block.endAt), "h:mm a")}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

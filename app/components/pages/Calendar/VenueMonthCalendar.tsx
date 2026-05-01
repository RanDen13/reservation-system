"use client";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

export type VenueCalendarItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  startAt: Date | string;
  endAt: Date | string;
  status: "PENDING" | "BOOKED" | "APPROVED" | "BLOCKED";
  scope?: "VENUE" | "UNIVERSITY";
};

function statusClass(item: VenueCalendarItem) {
  if (item.scope === "UNIVERSITY") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (item.status === "APPROVED" || item.status === "BOOKED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (item.status === "BLOCKED") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function itemTouchesDay(item: VenueCalendarItem, day: Date) {
  const startAt = asDate(item.startAt);
  const endAt = asDate(item.endAt);
  return startAt <= endOfDay(day) && endAt >= startOfDay(day);
}

export default function VenueMonthCalendar({
  items,
  title = "Venue Calendar",
  description = "Month view of pending, booked, and blocked dates.",
  compact = false,
}: {
  items: VenueCalendarItem[];
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth));
    const end = endOfWeek(endOfMonth(visibleMonth));
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  const monthItems = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          startAt: asDate(item.startAt),
          endAt: asDate(item.endAt),
        }))
        .sort(
          (a, b) =>
            asDate(a.startAt).getTime() - asDate(b.startAt).getTime(),
        ),
    [items],
  );

  const visibleMonthItems = monthItems.filter(
    (item) =>
      asDate(item.startAt) <= endOfMonth(visibleMonth) &&
      asDate(item.endAt) >= startOfMonth(visibleMonth),
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border bg-white shadow-xs">
            <span className="text-[11px] font-bold uppercase text-gray-500">
              {format(visibleMonth, "MMM")}
            </span>
            <span className="text-xl font-bold text-violet-700">
              {format(new Date(), "d")}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              {title}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-gray-950">
                {format(visibleMonth, "MMMM yyyy")}
              </h3>
              <Badge variant="outline">Month</Badge>
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVisibleMonth(startOfMonth(new Date()))}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm">
            <CalendarDays className="mr-2 h-4 w-4" />
            Month view
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-gray-50 text-center text-xs font-semibold text-gray-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="border-r py-2 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dayItems = monthItems.filter((item) => itemTouchesDay(item, day));
          const visibleItems = dayItems.slice(0, compact ? 2 : 3);
          const hiddenCount = dayItems.length - visibleItems.length;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-28 border-r border-b bg-white p-2 last:border-r-0",
                compact ? "min-h-24" : "lg:min-h-36",
                !isSameMonth(day, visibleMonth) && "bg-gray-50 text-gray-400",
                isToday(day) && "bg-blue-50/50",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold",
                    isToday(day) && "bg-violet-600 text-white",
                  )}
                >
                  {format(day, "d")}
                </span>
                {isToday(day) && (
                  <span className="text-[10px] font-semibold uppercase text-violet-700">
                    Today
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <div
                    key={`${item.id}-${day.toISOString()}`}
                    className={cn(
                      "truncate rounded-md border px-2 py-1 text-[11px] font-semibold leading-4",
                      statusClass(item),
                    )}
                    title={`${item.title} - ${format(asDate(item.startAt), "h:mm a")} to ${format(asDate(item.endAt), "h:mm a")}`}
                  >
                    <span className="truncate">{item.title}</span>
                    {isSameDay(asDate(item.startAt), day) && (
                      <span className="ml-1 font-medium">
                        {format(asDate(item.startAt), "h:mm a")}
                      </span>
                    )}
                  </div>
                ))}
                {hiddenCount > 0 && (
                  <p className="px-1 text-[11px] font-semibold text-gray-500">
                    {hiddenCount} more...
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 border-t bg-gray-50 p-3">
        {[
          { label: "Pending", className: "bg-amber-500" },
          { label: "Booked", className: "bg-emerald-500" },
          { label: "Blocked", className: "bg-red-500" },
          { label: "University-wide", className: "bg-violet-500" },
        ].map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-600"
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", item.className)} />
            {item.label}
          </span>
        ))}
        <span className="ml-auto text-xs text-gray-500">
          {visibleMonthItems.length} item
          {visibleMonthItems.length === 1 ? "" : "s"} this month
        </span>
      </div>
    </div>
  );
}

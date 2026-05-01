import VenueCalendarView from "@/app/components/pages/Calendar/VenueCalendarView";
import { auth } from "@/lib/auth";
import { getVenueCalendarData } from "@/lib/venue-calendar-data";
import { headers } from "next/headers";

const page = async () => {
  const [session, calendarData] = await Promise.all([
    auth.api.getSession({
      headers: await headers(),
    }),
    getVenueCalendarData(),
  ]);

  return (
    <main className="min-h-screen bg-background p-4 lg:p-8">
      <VenueCalendarView
        venues={calendarData.venues}
        globalBlocks={calendarData.globalBlocks}
        actionHref={session?.user ? "/user/dashboard" : "/login"}
        actionLabel={session?.user ? "Go to dashboard" : "Login"}
      />
    </main>
  );
};

export default page;
